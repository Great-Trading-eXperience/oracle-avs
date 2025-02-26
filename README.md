# GTX Oracle AVS Contract

## Overview

The GTX Oracle Actively Validated Service (AVS) contract serves dual purposes as both an AVS and an oracle. It is designed to facilitate the retrieval and storage of off-chain price data from various sources such as Binance, CoinGecko, and OKX. This contract works in conjunction with the GTXOracle main contract to provide a seamless and efficient mechanism for price evaluation and storage.

## Deployed Contracts

- **AVS Contract**: [0x957b4957065a079e9aed9941e6f8b1290cea7319](https://sepolia.arbiscan.io/address/0xc4327AD867E6e9a938e03815Ccdd4198ccE1023c)

### Key Features

- **Price Data Retrieval**: The contract retrieves price data from multiple off-chain sources, including Binance, CoinGecko, and OKX.
- **Average Price Calculation**: It calculates the average price from the retrieved data to ensure accuracy and reliability.
- **Timestamped Storage**: The calculated average price is stored in the contract along with a timestamp, providing a reliable historical record of price data.

### Flow

1. **Data Retrieval**: The contract requests price data from various off-chain sources.
2. **Data Aggregation**: The retrieved prices are aggregated to calculate an average price.
3. **Data Storage**: The average price, along with a timestamp, is stored in the GTXOracle contract for future reference and use.

This flow ensures that price data is processed efficiently and securely, leveraging the decentralized nature of the AVS network to provide reliable price evaluations.

## Token Pair Registration

To register a token pair, set up identifiers used to get prices from Binance, CoinGecko, and OKX. Below are example values and URLs for fetching price data:

- **Token Pair**: ETHUSDT
  - **CoinGecko Symbol**: ethereum
  - **Binance Symbol**: ETHUSDT
  - **OKX Symbol**: ETH-USDT

### Example URLs

- **CoinGecko**: `https://api.coingecko.com/api/v3/simple/price?ids=**ethereum**&vs_currencies=usd`
- **Binance**: `https://api.binance.com/api/v3/ticker/price?symbol=**ETHUSDT**`
- **OKX**: `https://www.okx.com/api/v5/market/ticker?instId=**ETH-USDT**`

## Quick Start

The following instructions explain how to manually deploy the AVS from scratch, including EigenLayer and AVS-specific contracts using Foundry (forge) to a local anvil chain, and start the Typescript Operator application and tasks.

### Commands

| Command            | Description                                                                     |
| ------------------ | ------------------------------------------------------------------------------- |
| `build`            | Compiles the smart contracts using `forge build`.                               |
| `start:anvil`      | Launches the Anvil local blockchain environment.                                |
| `deploy:core`      | Deploys the EigenLayer core contracts using Foundry.                            |
| `deploy:gtxOracle` | Deploys the GTXOracle contracts using Foundry.                                  |
| `extract:abis`     | Extracts ABI files using `src/abis.ts`.                                         |
| `start:operator`   | Starts the operator service using `ts-node operator/index.ts`.                  |
| `start:traffic`    | Initializes the task creation process via `ts-node operator/createNewTasks.ts`. |

To execute any of these commands, run:
