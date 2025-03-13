// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ECDSAServiceManagerBase} from
    "@eigenlayer-middleware/src/unaudited/ECDSAServiceManagerBase.sol";
import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import {IServiceManager} from "@eigenlayer-middleware/src/interfaces/IServiceManager.sol";
import {ECDSAUpgradeable} from
    "@openzeppelin-upgrades/contracts/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC1271Upgradeable} from
    "@openzeppelin-upgrades/contracts/interfaces/IERC1271Upgradeable.sol";
import {IGTXOracleServiceManager} from "./IGTXOracleServiceManager.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@eigenlayer/contracts/interfaces/IRewardsCoordinator.sol";
import {TransparentUpgradeableProxy} from
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import {Claims} from "./reclaim/Claims.sol";
import {Reclaim} from "./reclaim/Reclaim.sol";
import {IMarketFactory} from "./IMarketFactory.sol";

contract GTXOracleServiceManager is ECDSAServiceManagerBase, IGTXOracleServiceManager {
    using ECDSAUpgradeable for bytes32;

    uint256 public constant PRICE_PRECISION = 100;
    uint256 public constant MAX_PRICE_DEVIATION = 10; // 10% max deviation
    uint256 public constant SCALING_FACTOR = 1e4;
    address public constant CLAIM_OWNER = 0xfdE71B8a4f2D10DD2D210cf868BB437038548A39;
    uint256 public maxPriceAge;
    uint256 public minBlockInterval;
    uint256 public maxBlockInterval;
    uint32 public latestTaskNum;
    address public marketFactory;

    // State variables
    mapping(uint32 => bytes32) public allTaskHashes;
    mapping(address => mapping(uint32 => bytes)) public allTaskResponses;
    mapping(address tokenAddress => Price) public prices;
    mapping(address tokenAddress => Source[]) public sources;
    mapping(address tokenAddress => string tokenPair) public pairs;

    modifier onlyOperator() {
        require(
            ECDSAStakeRegistry(stakeRegistry).operatorRegistered(msg.sender),
            "Operator must be the caller"
        );
        _;
    }

    constructor(
        address _avsDirectory,
        address _stakeRegistry,
        address _rewardsCoordinator,
        address _delegationManager
    )
        ECDSAServiceManagerBase(_avsDirectory, _stakeRegistry, _rewardsCoordinator, _delegationManager)
    {}

    function initialize(
        address _marketFactory,
        uint256 _minBlockInterval,
        uint256 _maxBlockInterval,
        uint256 _maxPriceAge
    ) external {
        marketFactory = _marketFactory;
        minBlockInterval = _minBlockInterval;
        maxBlockInterval = _maxBlockInterval;
        maxPriceAge = _maxPriceAge;

        emit Initialize(marketFactory);
    }

    function requestNewOracleTask(
        address _tokenAddress,
        address _tokenAddress2,
        string calldata _tokenPair,
        Source[] memory _sources
    ) external returns (uint32 taskId) {
        if (_tokenAddress == address(0)) {
            revert InvalidToken();
        }
        if (sources[_tokenAddress].length != 0) {
            revert SourcesAlreadyExist(_tokenAddress);
        }
        if (_sources.length == 0) {
            revert SourcesEmpty(_tokenAddress);
        }

        OracleTask memory newTask;
        newTask.tokenAddress = _tokenAddress;
        newTask.tokenAddress2 = _tokenAddress2;
        newTask.tokenPair = _tokenPair;
        newTask.taskCreatedBlock = uint32(block.number);
        newTask.isNewData = true;
        newTask.sources = _sources;

        // store hash of task onchain, emit event, and increase taskNum
        allTaskHashes[latestTaskNum] = keccak256(abi.encode(newTask));
        emit NewOracleTaskCreated(latestTaskNum, newTask);
        taskId = latestTaskNum;
        latestTaskNum = taskId + 1;
    }

    function requestOraclePriceTask(
        address _tokenAddress
    ) external returns (uint32 taskId) {
        if (_tokenAddress == address(0)) {
            revert InvalidToken();
        }
        if (sources[_tokenAddress].length == 0) {
            revert SourcesEmpty(_tokenAddress);
        }

        OracleTask memory newTask;
        newTask.tokenAddress = _tokenAddress;
        newTask.tokenPair = pairs[_tokenAddress];
        newTask.taskCreatedBlock = uint32(block.number);
        newTask.sources = sources[_tokenAddress];

        // store hash of task onchain, emit event, and increase taskNum
        allTaskHashes[latestTaskNum] = keccak256(abi.encode(newTask));
        emit NewOracleTaskCreated(latestTaskNum, newTask);
        taskId = latestTaskNum;
        latestTaskNum = taskId + 1;
    }

    function respondToOracleTask(
        OracleTask calldata task,
        uint256 _price,
        uint32 referenceTaskIndex,
        bytes memory signature,
        Reclaim.Proof calldata proof
    ) external {
        if (keccak256(abi.encode(task)) != allTaskHashes[referenceTaskIndex]) {
            revert SuppliedTaskMismatch();
        }
        if (allTaskResponses[msg.sender][referenceTaskIndex].length != 0) {
            revert OperatorAlreadyResponded(referenceTaskIndex, msg.sender);
        }

        // // The message that was signed
        // bytes32 messageHash = keccak256(abi.encodePacked("GTX Oracle Service Manager."));
        // bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        // bytes4 magicValue = IERC1271Upgradeable.isValidSignature.selector;
        // if (
        //     !(
        //         magicValue
        //             == ECDSAStakeRegistry(stakeRegistry).isValidSignature(
        //                 ethSignedMessageHash, signature
        //             )
        //     )
        // )
        //     revert InvalidSignature();
        // }
        if (proof.signedClaim.claim.owner != CLAIM_OWNER) {
            revert InvalidClaimOwner();
        }

        // _validateBlockInterval(task.taskCreatedBlock, prices[task.tokenPair].blockNumber);
        _validatePrice(task.tokenAddress, _price, block.timestamp);

        allTaskResponses[msg.sender][referenceTaskIndex] = signature;

        if (task.isNewData == true && sources[task.tokenAddress].length == 0) {
            sources[task.tokenAddress] = task.sources;
            pairs[task.tokenAddress] = task.tokenPair;

            IMarketFactory(marketFactory).setMarketActivation(
                task.tokenAddress, task.tokenAddress2, IMarketFactory.Status.ACTIVE
            );
            emit OracleSourceCreated(task.tokenAddress, task.tokenPair, task.sources, msg.sender);
        }

        prices[task.tokenAddress] = Price({
            value: _price,
            timestamp: block.timestamp,
            blockNumber: task.taskCreatedBlock,
            minBlockInterval: minBlockInterval,
            maxBlockInterval: maxBlockInterval
        });

        // emitting event
        emit OraclePriceUpdated(task.tokenAddress, task.tokenPair, _price, block.timestamp);
        emit OracleTaskResponded(
            referenceTaskIndex, task, msg.sender, proof.signedClaim.signatures[0]
        );
    }

    // Validation functions
    function _validateBlockInterval(
        uint256 blockNumber,
        uint256 previousBlockNumber
    ) internal view {
        if (blockNumber <= previousBlockNumber) {
            revert BlockIntervalInvalid(0, blockNumber, previousBlockNumber);
        }

        uint256 blockDiff = blockNumber - previousBlockNumber;
        if (blockDiff < minBlockInterval) {
            revert BlockIntervalInvalid(1, blockDiff, minBlockInterval);
        }
        // if (blockDiff > maxBlockInterval) {
        //     revert BlockIntervalInvalid(2, blockDiff, maxBlockInterval);
        // }

        if (blockNumber > block.number) {
            revert BlockIntervalInvalid(3, blockNumber, block.number);
        }
    }

    function _validatePrice(
        address _tokenAddress,
        uint256 newPrice,
        uint256 timestamp
    ) internal view {
        Price memory currentPrice = prices[_tokenAddress];

        // Restore stale price checks
        if (timestamp <= currentPrice.timestamp) revert StalePrice();
        if (block.timestamp - timestamp > maxPriceAge) {
            revert StalePrice();
        }

        // Price deviation check
        if (currentPrice.value != 0) {
            uint256 priceDiff;
            if (newPrice > currentPrice.value) {
                priceDiff = ((newPrice - currentPrice.value) * SCALING_FACTOR) / currentPrice.value;
            } else {
                priceDiff = ((currentPrice.value - newPrice) * SCALING_FACTOR) / currentPrice.value;
            }

            if (priceDiff > MAX_PRICE_DEVIATION * PRICE_PRECISION) {
                revert PriceDeviationTooLarge();
            }
        }
    }

    function getSources(
        address _tokenAddress
    ) external view returns (Source[] memory) {
        return sources[_tokenAddress];
    }

    function getPrice(
        address _tokenAddress
    ) external view returns (uint256) {
        Price memory price = prices[_tokenAddress];
        if (price.value == 0) revert InvalidPrice();
        if (block.timestamp - price.timestamp > maxPriceAge) {
            revert StalePrice();
        }
        return price.value;
    }

    // Temporary fucntion used to test liquidation
    function setPrice(address _tokenAddress, uint256 _price) external {
        string memory tokenPair = pairs[_tokenAddress];
        prices[_tokenAddress] = Price({
            value: _price,
            timestamp: block.timestamp,
            blockNumber: block.number,
            minBlockInterval: minBlockInterval,
            maxBlockInterval: maxBlockInterval
        });

        emit OraclePriceUpdated(_tokenAddress, tokenPair, _price, block.timestamp);
    }
}
