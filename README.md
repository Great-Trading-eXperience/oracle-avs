# GTX Oracle AVS Contract

## Overview

The GTX Oracle Autonomous Verifiable Service (AVS) contract serves dual purposes as both an AVS and an oracle. It is designed to facilitate the retrieval and storage of off-chain price data from various sources such as Binance, OKX, GeckoTerminal, and DexScreener. This contract works in conjunction with the GTXOracle main contract to provide a seamless and efficient mechanism for price evaluation and storage.

## Deployed Contracts

- 📜 **GTXOracleServiceManager**: [0xe18769210e128687bf2488fc2c967e9dd6576d16](https://sepolia.arbiscan.io/address/0xe18769210e128687bf2488fc2c967e9dd6576d16)

### Key Features

- 🔍 **Price Data Retrieval**: The contract retrieves price data from multiple off-chain sources, including Binance, OKX, GeckoTerminal, and DexScreener.
- 📊 **Average Price Calculation**: It calculates the average price from the retrieved data to ensure accuracy and reliability.
- ⏳ **Timestamped Storage**: The calculated average price is stored in the contract along with a timestamp, providing a reliable historical record of price data.

### Flow

1. 🔄 **Data Retrieval**: The contract requests price data from various off-chain sources.
2. 📈 **Data Aggregation**: The retrieved prices are aggregated to calculate an average price.
3. 💾 **Data Storage**: The average price, along with a timestamp, is stored in the GTXOracle contract for future reference and use.
4. ✅ **Data Validation**: The stored price data undergoes validation via AVS to ensure its integrity and reliability.

This flow ensures that price data is processed efficiently and securely, leveraging the decentralized nature of the AVS network to provide reliable price evaluations.

## Token Pair Registration

To register a token pair, set up identifiers used to get prices from Binance, OKX, GeckoTerminal, and DexScreener. Below are example values and URLs for fetching price data:

- **Token Pair**: ETH/USDT
  - 📌 **Binance Symbol**: ETHUSDT
  - 📌 **OKX Symbol**: ETH-USDT
  - 📌 **GeckoTerminal Token Address**: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
  - 📌 **DexScreener Token Address**: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

### Example URLs

- 🌐 **Binance**: `https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT`
- 🌐 **OKX**: `https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT`
- 🌐 **GeckoTerminal**: `https://api.geckoterminal.com/api/v2/networks/eth/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- 🌐 **DexScreener**: `https://api.dexscreener.com/tokens/v1/ethereum/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`

## Quick Start

The following instructions explain how to manually deploy the AVS from scratch, including EigenLayer and AVS-specific contracts using Foundry (forge) to a local anvil chain, and start the TypeScript Operator application and tasks.

### Commands

| ⚡ Command         | 📝 Description                                                                  |
| ------------------ | ------------------------------------------------------------------------------- |
| `build`            | Compiles the smart contracts using `forge build`.                               |
| `start:anvil`      | Launches the Anvil local blockchain environment.                                |
| `deploy:core`      | Deploys the EigenLayer core contracts using Foundry.                            |
| `deploy:gtxOracle` | Deploys the GTXOracle contracts using Foundry.                                  |
| `extract:abis`     | Extracts ABI files using `src/abis.ts`.                                         |
| `start:operator`   | Starts the operator service using `ts-node operator/index.ts`.                  |
| `start:traffic`    | Initializes the task creation process via `ts-node operator/createNewTasks.ts`. |

## Oracle Creation Example

Below is an example JSON request to create a new oracle for different tokens:

```json
[
	{
		"tokenAddress": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
		"tokenPair": "ETH/USDT",
		"sources": [
			{
				"name": "geckoterminal",
				"identifier": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
				"network": "eth"
			},
			{
				"name": "dexscreener",
				"identifier": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
				"network": "ethereum"
			},
			{ "name": "binance", "identifier": "ETHUSDT", "network": "" },
			{ "name": "okx", "identifier": "ETH-USDT", "network": "" }
		],
		"isNewData": true
	}
]
```

### Handling Solana Addresses

🪙 Solana addresses use a different format than EVM addresses. To request an oracle for Solana tokens, the Solana address must be converted to an EVM-compatible address.

### GTXOracle AVS Workflow

1. ⚙️ **Operator Setup**: The GTXOracle AVS operator runs a service that listens for price update requests.
2. 🔎 **Price Data Querying**: Upon request, the operator fetches prices from the configured sources.
3. 📊 **Data Aggregation & Storage**: The operator computes the average price and updates the GTXOracle contract.
4. 🔐 **EigenLayer Validation**: The EigenLayer mechanism ensures data integrity before finalizing storage.

## API References

- 📖 **OKX**: [API Reference](https://www.okx.com/docs-v5/en/#order-book-trading-market-data-get-ticker)
- 📖 **Binance**: [API Reference](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#symbol-price-ticker)
- 📖 **GeckoTerminal**: [API Reference](https://www.geckoterminal.com/dex-api?utm_source=gt-apiguide&utm_medium=referral&utm_content=apiguide-menu)
- 📖 **DexScreener**: [API Reference](https://docs.dexscreener.com/api/reference#tokens-v1-chainid-tokenaddresses)
