import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import { transformForOnchain, verifyProof } from "@reclaimprotocol/js-sdk";
import * as dotenv from "dotenv";
dotenv.config();

const reclaimClient = new ReclaimClient(
	process.env.APP_ID!,
	process.env.APP_SECRET!
);

const sourceMappings = {
	geckoterminal: {
		url: (tokenAddress: string, network: string) =>
			`https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${tokenAddress}`,
		responseMatches: (basePattern: string) => [
			createGeckoTerminalRegex(basePattern),
		],
	},
	dexscreener: {
		url: (tokenAddress: string, chainId: string) =>
			`https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`,
		responseMatches: (basePattern: string) => [
			createDexscreenerRegex(basePattern),
		],
	},
	binance: {
		url: (symbol: string) =>
			`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
		responseMatches: (basePattern: string, quotePattern: string) => [
			createBinanceRegex(basePattern, quotePattern),
		],
	},
	okx: {
		url: (instId: string) =>
			`https://www.okx.com/api/v5/market/ticker?instId=${instId}`,
		responseMatches: (basePattern: string, quotePattern: string) => [
			createOkxRegex(basePattern, quotePattern),
		],
	},
};
// jupiter: {
// 	url: (id: string) => `https://api.jup.ag/price/v2?ids=${id}`,
// 	responseMatches: (id: string) => [
// 		{
// 			type: "regex",
// 			value: `"${id}":\\{"id":"${id}","type":"derivedPrice","price":"(?<price>.*?)"`,
// 		},
// 	],
// },
// coingecko: {
// 	url: (token: string) =>
// 		`https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`,
// 	responseMatches: (token: string) => [
// 		{
// 			type: "regex",
// 			value: `${token}":{"usd":(?<price>.*?)}}`,
// 		},
// 	],
// },

export async function generateProof(
	tokenPair: string,
	source: "binance" | "okx" | "geckoterminal" | "dexscreener",
	identifier: string,
	network: string
): Promise<any> {
	try {
		const { basePattern, quotePattern } = tokenPairPattern(tokenPair);
		const sourceConfig = sourceMappings[source];
		if (!sourceConfig) {
			throw new Error("Unsupported source");
		}

		const url = sourceConfig.url(identifier, network);
		const responseMatches: any[] = sourceConfig.responseMatches(
			basePattern,
			quotePattern
		);

		const proof = await reclaimClient.zkFetch(
			url,
			{ method: "GET" },
			{
				responseMatches: responseMatches,
			}
		);

		if (!proof) {
			console.error(`Failed to generate proof from ${source}`);
			return null;
		}

		const isValid = await verifyProof(proof);
		if (!isValid) {
			console.error(`Proof from ${source} is invalid`);
			return null;
		}

		const proofData = await transformForOnchain(proof);
		return { source, transformedProof: proofData, proof };
	} catch (e) {
		console.error(e);
		return null;
	}
}

function tokenPairPattern(tokenPair: string) {
	const [baseToken, quoteToken] = tokenPair.split("/");
	if (!["USDT", "USDC"].includes(quoteToken)) {
		throw new Error("Unsupported quote token");
	}

	let baseTokens = [baseToken];
	if (baseToken.startsWith("W")) {
		const unwrappedToken = baseToken.slice(1);
		baseTokens.push(unwrappedToken);
	} else {
		baseTokens.push(`W${baseToken}`);
	}
	const basePattern = baseTokens.join("|");
	const quotePattern = ["USDT", "USDC"].join("|");

	return { basePattern, quotePattern };
}

function createDexscreenerRegex(basePattern: string) {
	return {
		type: "regex",
		value: `"baseToken":\\s*\\{[^}]*"symbol":"(?<symbol>(${basePattern}))".*?"priceUsd":"(?<price>[^"]+)"`,
	};
}

function createGeckoTerminalRegex(basePattern: string) {
	return {
		type: "regex",
		value: `"symbol":"(?<symbol>(${basePattern}))".*?"price_usd":"(?<price>[^"]+)"`,
	};
}

function createBinanceRegex(basePattern: string, quotePattern: string) {
	return {
		type: "regex",
		value: `"symbol":"(?<symbol>(${basePattern})(${quotePattern}))","price":"(?<price>[^"]+)"`,
	};
}

function createOkxRegex(basePattern: string, quotePattern: string) {
	return {
		type: "regex",
		value: `"instId":"(?<instId>(${basePattern})-(${quotePattern}))","last":"(?<price>[^"]+)"`,
	};
}
