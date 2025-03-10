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
			//Solana
			tokenPair: "SOL/USDT",
			sources: [
				{
					name: "geckoterminal",
					identifier: "solSo11111111111111111111111111111111111111112",
					network: "solana",
				},
				{
					name: "dexscreener",
					identifier: "So11111111111111111111111111111111111111112",
					network: "solana",
				},
				{ name: "binance", identifier: "SOLUSDT", network: "" },
				{ name: "okx", identifier: "SOL-USDT", network: "" },
			],
			isNewData: true,
		},
		{
			//PWEASE
			tokenPair: "pwease/USDT",
			sources: [
				{
					name: "geckoterminal",
					identifier: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
					network: "solana",
				},
				{
					name: "dexscreener",
					identifier: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
					network: "solana",
				},
			],
			isNewData: true,
		},
		{
			// TRUMP
			tokenPair: "TRUMP/USDT",
			sources: [
				{
					name: "geckoterminal",
					identifier: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
					network: "solana",
				},
				{
					name: "dexscreener",
					identifier: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
					network: "solana",
				},
				{ name: "binance", identifier: "TRUMPUSDT", network: "" },
				{ name: "okx", identifier: "TRUMP-USDT", network: "" },
			],
			isNewData: true,
		},
		{
			// ETH
			tokenPair: "ETH/USDT",
			sources: [
				{
					name: "dexscreener",
					identifier: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
					network: "ethereum",
				},
				{
					name: "geckoterminal",
					identifier: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
					network: "eth",
				},
				{ name: "binance", identifier: "ETHUSDT", network: "" },
				{ name: "okx", identifier: "ETH-USDT", network: "" },
			],
			isNewData: true,
		},
		{
			// WBTC
			tokenPair: "BTC/USDT",
			sources: [
				{
					name: "geckoterminal",
					identifier: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
					network: "eth",
				},
				{
					name: "dexscreener",
					identifier: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
					network: "ethereum",
				},
				{ name: "binance", identifier: "WBTCUSDT", network: "" },
				{ name: "okx", identifier: "WBTC-USDT", network: "" },
			],
			isNewData: true,
		},
	];
	const randomOracleSource =
		oracleSources[Math.floor(Math.random() * oracleSources.length)];
	return randomOracleSource;
}

async function createNewTask(tokenPair: string) {
	try {
		const tx = await gtxOracleServiceManager.requestOraclePriceTask(tokenPair);
		const receipt = await tx.wait();

		console.log(`Transaction successful with hash: ${receipt.hash}`);
	} catch (error) {
		console.error("Error sending transaction:", error);
	}
}

async function requestNewOracleTask(tokenPair: string, sources: any[]) {
	try {
		const tx = await gtxOracleServiceManager.requestNewOracleTask(
			tokenPair,
			sources
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

	const { tokenPair, sources } = randomData;

	const existinsSources = await checkSource(tokenPair);

	console.log("source", existinsSources);

	if (!existinsSources) {
		await requestNewOracleTask(tokenPair, sources);
	} else {
		await createNewTask(tokenPair);
	}

	// Uncomment this to create tasks every 30 seconds
	// setInterval(() => {
	// 	const randomData = generateRandomData();
	// 	console.log(
	// 		`Creating new task to calculte CScore for address: ${randomData}`
	// 	);

	// 	const { tokenPair, geckoterminalSymbol, binanceSymbol, okxSymbol } = randomData;

	// 	registerOracleTask(tokenPair, geckoterminalSymbol, binanceSymbol, okxSymbol);
	// 	createNewTask(tokenPair);
	// 	checkSource(tokenPair);
	// }, 30000);
}

async function checkSource(tokenPair: string) {
	try {
		const result = await gtxOracleServiceManager.getSources(tokenPair);
		console.log("Sources of", tokenPair, "is", result);
		return result;
	} catch (error) {
		console.error("Error fetching Price :", tokenPair, error);
	}
}

startCreatingTasks().catch((error) => {
	console.error("Error in startCreatingTasks:", error);
});

// checkSource("ETHUSDT");
