// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Reclaim} from "./reclaim/Reclaim.sol";

interface IGTXOracleServiceManager {
    error InvalidPrice();
    error StalePrice();
    error InvalidSignature();
    error InvalidClaimOwner();
    error InvalidToken();
    error SourcesAlreadyExist(address token);
    error SourcesEmpty(address token);
    error PriceDeviationTooLarge();
    error SuppliedTaskMismatch();
    error OperatorAlreadyResponded(uint256 id, address operator);
    error BlockIntervalInvalid(uint256 id, uint256 blockNumber, uint256 previousBlockNumber);

    event NewOracleTaskCreated(uint32 indexed taskIndex, OracleTask task);
    event OracleTaskResponded(
        uint32 indexed taskIndex, OracleTask task, address operator, bytes signature
    );
    event OraclePriceUpdated(
        address indexed tokenAddress, string indexed tokenPair, uint256 price, uint256 timestamp
    );
    event OracleSourceCreated(
        address indexed tokenAddress, string indexed tokenPair, Source[] sources, address operator
    );
    event Initialize(address marketFactory);

    struct OracleTask {
        address tokenAddress; // long token
        address tokenAddress2; // short token
        uint32 taskCreatedBlock;
        bool isNewData; // True for new data, False for updating existing data
        string tokenPair;
        Source[] sources;
    }

    struct Source {
        string name; // "binance", "dexscreener", "coingecko"
        string identifier; // "BTCUSDT" for CEXs, "0x..." for DEXs
        string network; // Optional: "ethereum", "bsc" (for DEXs)
    }

    struct Price {
        uint256 value;
        uint256 timestamp;
        uint256 blockNumber;
        uint256 minBlockInterval;
        uint256 maxBlockInterval;
    }

    function initialize(
        address _marketFactory,
        uint256 _minBlockInterval,
        uint256 _maxBlockInterval,
        uint256 _maxPriceAge
    ) external;

    function latestTaskNum() external view returns (uint32);

    function allTaskHashes(
        uint32 taskIndex
    ) external view returns (bytes32);

    function allTaskResponses(
        address operator,
        uint32 taskIndex
    ) external view returns (bytes memory);

    function requestNewOracleTask(
        address _tokenAddress,
        address _tokenAddress2,
        string calldata _tokenPair,
        Source[] calldata _sources
    ) external returns (uint32 taskIndex);

    function requestOraclePriceTask(
        address _tokenAddress // string calldata _tokenPair
    ) external returns (uint32 taskIndex);

    function respondToOracleTask(
        OracleTask calldata task,
        uint256 price,
        uint32 referenceTaskIndex,
        bytes calldata signature,
        Reclaim.Proof calldata proof
    ) external;

    function getPrice(
        address _tokenAddress // string calldata _tokenPair
    ) external view returns (uint256);

    function getSources(
        address _tokenAddress // string calldata _tokenPair
    ) external view returns (Source[] memory);

    function setPrice(address _tokenAddress, uint256 _price) external;
}
