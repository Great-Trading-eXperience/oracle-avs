interface Proof {
	proof: {
		extractedParameterValues: {
			price: string;
		};
	};
}

export function calculateAvgPrice(proofs: Proof[]): bigint {
	if (proofs.length === 0) {
		console.error("No proofs provided.");
		return BigInt(0);
	}

	const prices = proofs.map(({ proof }) =>
		parseFloat(proof.extractedParameterValues.price)
	);
	const total = prices.reduce((acc, price) => acc + price, 0);
	const avgPrice = total / prices.length;

	// Convert the average price to a bigint with 8 decimal places
	const avgPriceBigInt = BigInt(Math.round(avgPrice * 10 ** 18));

	console.log("avgPriceBigInt", avgPriceBigInt);

	return avgPriceBigInt;
}
