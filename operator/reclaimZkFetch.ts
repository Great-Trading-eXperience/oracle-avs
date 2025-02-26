import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import { transformForOnchain, verifyProof } from "@reclaimprotocol/js-sdk";
import * as dotenv from "dotenv";
dotenv.config();

const reclaimClient = new ReclaimClient(
	process.env.APP_ID!,
	process.env.APP_SECRET!
);

const sourceMappings = {
	coingecko: {
		url: (token: string) =>
			`https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`,
		responseMatches: (token: string) => [
			{
				type: "regex",
				value: `${token}":{"usd":(?<price>.*?)}}`,
			},
		],
	},
	binance: {
		url: (symbol: string) =>
			`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
		responseMatches: (symbol: string) => [
			{
				type: "regex",
				value: `"symbol":"${symbol}","price":"(?<price>.*?)"`,
			},
		],
	},
	okx: {
		url: (instId: string) =>
			`https://www.okx.com/api/v5/market/ticker?instId=${instId}`,
		responseMatches: (instId: string) => [
			{
				type: "regex",
				value: `"instId":"${instId}","last":"(?<price>.*?)",`,
			},
		],
	},
};

export async function generateProof(
	source: "coingecko" | "binance" | "okx",
	input: string
): Promise<any> {
	try {
		const sourceConfig = sourceMappings[source];
		if (!sourceConfig) {
			throw new Error("Unsupported source");
		}

		const url = sourceConfig.url(input);
		const responseMatches: any[] = sourceConfig.responseMatches(input);

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
