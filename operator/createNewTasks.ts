import { ethers } from "ethers";
import * as dotenv from "dotenv";
const fs = require("fs");
const path = require("path");
dotenv.config();

// Setup env variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
/// TODO: Hack
let chainId = process.env.CHAIN_ID;

const avsDeploymentData = JSON.parse(
	fs.readFileSync(
		path.resolve(
			__dirname,
			`../contracts/deployments/gtxOracle/${chainId}.json`
		),
		"utf8"
	)
);
const gtxOracleServiceManagerAddress =
	avsDeploymentData.addresses.gtxOracleServiceManager;
const gtxOracleServiceManagerABI = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "../abis/GTXOracleServiceManager.json"),
		"utf8"
	)
);
// Initialize contract objects from ABIs
const gtxOracleServiceManager = new ethers.Contract(
	gtxOracleServiceManagerAddress,
	gtxOracleServiceManagerABI,
	wallet
);

// // Function to generate random names
function generateRandomData(): any {
	const oracleSources = [
		{
			tokenPair: "ETHUSDT",
			coingeckoSymbol: "ethereum",
			binanceSymbol: "ETHUSDT",
			okxSymbol: "ETH-USDT",
		},
		{
			tokenPair: "TRUMPUSDT",
			coingeckoSymbol: "official-trump",
			binanceSymbol: "TRUMPUSDT",
			okxSymbol: "TRUMP-USDT",
		},
		{
			tokenPair: "PNUTUSDT",
			coingeckoSymbol: "peanut-the-squirrel",
			binanceSymbol: "PNUTUSDT",
			okxSymbol: "PNUT-USDT",
		},
		{
			tokenPair: "FLOKIUSDT",
			coingeckoSymbol: "floki",
			binanceSymbol: "FLOKIUSDT",
			okxSymbol: "FLOKI-USDT",
		},
	];
	const randomOracleSource =
		oracleSources[Math.floor(Math.random() * oracleSources.length)];
	return randomOracleSource;
}

async function createNewTask(tokenPair: string) {
	try {
		const tx = await gtxOracleServiceManager.requestOracleTask(tokenPair);
		const receipt = await tx.wait();

		console.log(`Transaction successful with hash: ${receipt.hash}`);
	} catch (error) {
		console.error("Error sending transaction:", error);
	}
}

async function registerOracleTask(
	tokenPair: string,
	coingeckoSymbol: string,
	binanceSymbol: string,
	okxSymbol: string
) {
	try {
		const tx = await gtxOracleServiceManager.registerOracleSource(
			tokenPair,
			coingeckoSymbol,
			binanceSymbol,
			okxSymbol
		);

		// Wait for the transaction to be mined
		const receipt = await tx.wait();

		console.log(`Transaction successful with hash: ${receipt.hash}`);
	} catch (error) {
		console.error("Error sending transaction:", error);
	}
}

// Function to create a new task with a random name every 15 seconds
async function startCreatingTasks() {
	const randomData = generateRandomData();
	console.log(`Creating new task for request oracle price`);
	console.log(JSON.stringify(randomData, null, 2));

	const { tokenPair, coingeckoSymbol, binanceSymbol, okxSymbol } = randomData;

	await registerOracleTask(
		tokenPair,
		coingeckoSymbol,
		binanceSymbol,
		okxSymbol
	);

	await createNewTask(tokenPair);

	// await checkPrice(tokenPair);

	// Uncomment this to create tasks every 30 seconds
	// setInterval(() => {
	// 	const randomData = generateRandomData();
	// 	console.log(
	// 		`Creating new task to calculte CScore for address: ${randomData}`
	// 	);

	// 	const { tokenPair, coingeckoSymbol, binanceSymbol, okxSymbol } = randomData;

	// 	registerOracleTask(tokenPair, coingeckoSymbol, binanceSymbol, okxSymbol);
	// 	createNewTask(tokenPair);
	// 	checkPrice(tokenPair);
	// }, 30000);
}

async function checkPrice(tokenPair: string) {
	try {
		const result = await gtxOracleServiceManager.getOraclePriceData(tokenPair);
		console.log("Price :", tokenPair, "is", result);
	} catch (error) {
		console.error("Error fetching Price :", tokenPair, error);
	}
}

startCreatingTasks().catch((error) => {
	console.error("Error in startCreatingTasks:", error);
});

// checkPrice("ETHUSDT");
