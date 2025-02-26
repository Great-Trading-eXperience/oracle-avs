// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Reclaim} from "./reclaim/Reclaim.sol";

interface IGTXOracleServiceManager {
    event NewOracleTaskCreated(uint32 indexed taskIndex, OracleTask task);
    event OracleTaskResponded(
        uint32 indexed taskIndex, OracleTask task, address operator, bytes signature
    );
    event OraclePriceInserted(string indexed tokenPair, uint256 price, uint256 timestamp);
    event OracleSourceRegistered(
        string indexed tokenPair,
        string coingeckoSymbol,
        string binanceSymbol,
        string okxSymbol,
        address indexed operator
    );

    struct OracleTask {
        string tokenPair; // ETHUSD
        uint32 taskCreatedBlock;
        OracleSourceData source;
    }

    struct OraclePriceData {
        uint256 price;
        uint256 lastUpdate;
    }

    struct OracleSourceData {
        string coingeckoSymbol;
        string binanceSymbol;
        string okxSymbol;
    }

    function getOraclePriceData(string calldata _tokenPair)
        external
        view
        returns (OraclePriceData memory);

    function getOracleSourceData(string calldata _tokenPair)
        external
        view
        returns (OracleSourceData memory);

    function latestTaskNum() external view returns (uint32);

    function allTaskHashes(uint32 taskIndex) external view returns (bytes32);

    function allTaskResponses(
        address operator,
        uint32 taskIndex
    ) external view returns (bytes memory);

    function registerOracleSource(
        string calldata _tokenPair,
        string calldata _coingeckoSymbol,
        string calldata _binanceSymbol,
        string calldata _okxSymbol
    ) external;

    function requestOracleTask(string calldata tokenName) external returns (OracleTask memory);

    function respondToOracleTask(
        OracleTask calldata task,
        uint256 price,
        uint32 referenceTaskIndex,
        bytes calldata signature,
        Reclaim.Proof calldata proof
    ) external;
}
