const ethers = require("ethers");

const errors = [
	"InvalidPrice()",
	"StalePrice()",
	"InvalidSignature()",
	"InvalidClaimOwner()",
	"InvalidToken()",
	"SourcesAlreadyExist(string)",
	"SourcesEmpty(string)",
	"PriceDeviationTooLarge()",
	"SuppliedTaskMismatch()",
	"OperatorAlreadyResponded(uint256,address)",
	"BlockIntervalInvalid(uint256,uint256,uint256)",
];

errors.forEach((error) => {
	console.log(`${error}: ${ethers.id(error).slice(0, 10)}`);
});
