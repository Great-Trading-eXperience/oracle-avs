import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { calculateAvgPrice } from "./calculateAvgPrice";
import { generateProof } from "./reclaimZkFetch";
const fs = require("fs");
const path = require("path");
dotenv.config();

// Check if the process.env object is empty
if (!Object.keys(process.env).length) {
	throw new Error("process.env object is empty");
}

// Setup env variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
// const provider = new ethers.WebSocketProvider(process.env.WS_RPC_URL!);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
/// TODO: Hack
let chainId = process.env.CHAIN_ID!;
// let chainId = 421614;

const avsDeploymentData = JSON.parse(
	fs.readFileSync(
		path.resolve(
			__dirname,
			`../contracts/deployments/gtxOracle/${chainId}.json`
		),
		"utf8"
	)
);
// Load core deployment data
const coreDeploymentData = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, `../contracts/deployments/core/${chainId}.json`),
		"utf8"
	)
);

const delegationManagerAddress = coreDeploymentData.addresses.delegation;
const avsDirectoryAddress = coreDeploymentData.addresses.avsDirectory;
const gtxOracleServiceManagerAddress =
	avsDeploymentData.addresses.gtxOracleServiceManager;
const ecdsaStakeRegistryAddress = avsDeploymentData.addresses.stakeRegistry;

// Load ABIs
const delegationManagerABI = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "../abis/IDelegationManager.json"),
		"utf8"
	)
);
const ecdsaRegistryABI = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "../abis/ECDSAStakeRegistry.json"),
		"utf8"
	)
);
const gtxOracleServiceManagerABI = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "../abis/GTXOracleServiceManager.json"),
		"utf8"
	)
);
const avsDirectoryABI = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, "../abis/IAVSDirectory.json"), "utf8")
);

// Initialize contract objects from ABIs
const delegationManager = new ethers.Contract(
	delegationManagerAddress,
	delegationManagerABI,
	wallet
);
const gtxOracleServiceManager = new ethers.Contract(
	gtxOracleServiceManagerAddress,
	gtxOracleServiceManagerABI,
	wallet
);
const ecdsaRegistryContract = new ethers.Contract(
	ecdsaStakeRegistryAddress,
	ecdsaRegistryABI,
	wallet
);
const avsDirectory = new ethers.Contract(
	avsDirectoryAddress,
	avsDirectoryABI,
	wallet
);

const signAndRespondToTask = async (
	taskIndex: number,
	task: [string, string, number, boolean, string, [string, string, string][]]
) => {
	const [
		tokenAddress,
		tokenAddress2,
		taskCreatedBlock,
		isNewData,
		tokenPair,
		sources,
	] = task;
	const sourcesArray: { name: string; identifier: string; network: string }[] =
		new Array(sources.length);

	console.log(`Processing Task #${taskIndex}...`);
	const validProofs: any[] = [];
	for (let index = 0; index < sources.length; index++) {
		const [name, identifier, network] = sources[index];
		const proof = await generateProof(
			tokenPair,
			name as any,
			identifier,
			network
		);
		sourcesArray[index] = { name, identifier, network };

		if (proof) {
			validProofs.push(proof);
		}
	}

	if (!validProofs.length) {
		console.log("Failed to generate proofs for one or more sources.");
		return;
	}

	// validProofs.map((el) =>
	// 	console.log(JSON.stringify(el.proof.extractedParameterValues, null, 2))
	// );
	// return;

	const avgPrice = calculateAvgPrice(validProofs);

	console.log(`Average price for #${task[0]}:`, avgPrice.toString());

	const message = "GTX Oracle Service Manager.";
	const messageHash = ethers.solidityPackedKeccak256(["string"], [message]);
	const messageBytes = ethers.getBytes(messageHash);
	const signature = await wallet.signMessage(messageBytes);

	console.log(`Signing and responding to task ${taskIndex}`);

	const operators = [await wallet.getAddress()];
	const signatures = [signature];
	const signedTask = ethers.AbiCoder.defaultAbiCoder().encode(
		["address[]", "bytes[]", "uint32"],
		[
			operators,
			signatures,
			ethers.toBigInt((await provider.getBlockNumber()) - 1),
		]
	);
	const proof = validProofs[0].transformedProof;
	const params = {
		tokenAddress,
		tokenAddress2,
		tokenPair,
		taskCreatedBlock,
		sources: sourcesArray,
		isNewData,
	};

	console.log("params\n", params);

	const tx = await gtxOracleServiceManager.respondToOracleTask(
		params,
		avgPrice,
		taskIndex,
		signedTask,
		proof
	);
	await tx.wait();
	console.log(`Responded to task...`);
};

const registerOperator = async () => {
	console.log("Registering as an Operator in EigenLayer...");
	try {
		const tx1 = await delegationManager.registerAsOperator(
			{
				__deprecated_earningsReceiver: await wallet.address,
				delegationApprover: "0x0000000000000000000000000000000000000000",
				stakerOptOutWindowBlocks: 0,
			},
			""
		);
		await tx1.wait();
		console.log("Operator registered to Core EigenLayer contracts");
	} catch (error) {
		console.error("Error in registering as operator:", error);
	}

	const salt = ethers.hexlify(ethers.randomBytes(32));
	const expiry = Math.floor(Date.now() / 1000) + 3600;
	let operatorSignatureWithSaltAndExpiry = {
		signature: "",
		salt: salt,
		expiry: expiry,
	};

	const operatorDigestHash =
		await avsDirectory.calculateOperatorAVSRegistrationDigestHash(
			wallet.address,
			await gtxOracleServiceManager.getAddress(),
			salt,
			expiry
		);
	console.log(operatorDigestHash);

	// Sign the digest hash with the operator's private key
	console.log("Signing digest hash with operator's private key");
	const operatorSigningKey = new ethers.SigningKey(process.env.PRIVATE_KEY!);
	const operatorSignedDigestHash = operatorSigningKey.sign(operatorDigestHash);

	// Encode the signature in the required format
	operatorSignatureWithSaltAndExpiry.signature = ethers.Signature.from(
		operatorSignedDigestHash
	).serialized;

	console.log("Registering Operator to AVS Registry contract");
	const tx2 = await ecdsaRegistryContract.registerOperatorWithSignature(
		operatorSignatureWithSaltAndExpiry,
		wallet.address
	);
	await tx2.wait();
	console.log("Operator registered on AVS successfully");
};

// export const monitorNewTasks = async () => {
// 	console.log("Monitoring for new tasks...");

// 	gtxOracleServiceManager.on(
// 		"NewOracleTaskCreated",
// 		async (taskIndex: number, task: any) => {
// 			// console.log(taskIndex, task);
// 			console.log(`New task detected: Task, #${taskIndex}`);
// 			await signAndRespondToTask(taskIndex, task);
// 		}
// 	);
// };

// Use this because method: 'eth_newFilter' not found
export const monitorNewTasks = async () => {
	console.log("Monitoring for new tasks...");

	const eventTopic = ethers.id(
		"NewOracleTaskCreated(uint32,(address,address,uint32,bool,string,(string,string,string)[]))"
	);
	let latestBlock = await provider.getBlockNumber(); // Track last block
	let isFetching = false;
	const taskQueue = new Set();
	const processedTasks = new Set();
	const blockRangeLimit = 100; // Limit the block range to 100

	const fetchEvents = async () => {
		if (isFetching) return;
		isFetching = true;

		try {
			const newBlock = await provider.getBlockNumber();
			if (newBlock <= latestBlock) return;

			let fromBlock = latestBlock + 1;
			while (fromBlock <= newBlock) {
				const toBlock = Math.min(fromBlock + blockRangeLimit - 1, newBlock);

				const logs = await provider.getLogs({
					address: gtxOracleServiceManagerAddress,
					fromBlock: fromBlock,
					toBlock: toBlock,
					topics: [eventTopic],
				});

				for (const log of logs) {
					const parsedLog = gtxOracleServiceManager.interface.parseLog(log);
					if (!parsedLog) continue;

					const taskIndex = parsedLog.args[0];
					const task = parsedLog.args[1];

					if (taskQueue.has(taskIndex) || processedTasks.has(taskIndex))
						continue;

					taskQueue.add(taskIndex);
					console.log(`Processing Task #${taskIndex}...`);

					await signAndRespondToTask(taskIndex, task);
					processedTasks.add(taskIndex);
					taskQueue.delete(taskIndex);
				}

				fromBlock = toBlock + 1;
			}

			latestBlock = newBlock;
		} catch (error) {
			console.error("Error fetching logs:", error);
		} finally {
			isFetching = false;
			processedTasks.clear();
		}
	};

	// Poll every 10 seconds
	setInterval(fetchEvents, 10000);
};

const main = async () => {
	// await registerOperator();
	monitorNewTasks().catch((error) => {
		console.error("Error monitoring tasks:", error);
	});
};

main().catch((error) => {
	console.error("Error in main function:", error);
});
