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

contract GTXOracleServiceManager is ECDSAServiceManagerBase, IGTXOracleServiceManager {
    using ECDSAUpgradeable for bytes32;

    address public constant OWNER_ADDRESS = 0xfdE71B8a4f2D10DD2D210cf868BB437038548A39;
    uint32 public latestTaskNum;

    mapping(uint32 => bytes32) public allTaskHashes;
    mapping(address => mapping(uint32 => bytes)) public allTaskResponses;
    mapping(string => OraclePriceData) private _oraclePriceData;
    mapping(string => OracleSourceData) private _oracleSourceData;

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

    function registerOracleSource(
        string calldata _tokenPair,
        string calldata _coingeckoSymbol,
        string calldata _binanceSymbol,
        string calldata _okxSymbol
    ) external onlyOperator {
        require(bytes(_tokenPair).length > 0, "Token pair cannot be empty");
        require(
            bytes(_coingeckoSymbol).length > 0 || bytes(_binanceSymbol).length > 0
                || bytes(_okxSymbol).length > 0,
            "At least one symbol must be provided"
        );

        OracleSourceData memory sourceData = OracleSourceData({
            coingeckoSymbol: _coingeckoSymbol,
            binanceSymbol: _binanceSymbol,
            okxSymbol: _okxSymbol
        });

        _oracleSourceData[_tokenPair] = sourceData;

        emit OracleSourceRegistered(
            _tokenPair, _coingeckoSymbol, _binanceSymbol, _okxSymbol, msg.sender
        );
    }

    function requestOracleTask(string calldata _tokenPair) external returns (OracleTask memory) {
        OracleTask memory newTask;
        OracleSourceData memory source = _oracleSourceData[_tokenPair];
        newTask.tokenPair = _tokenPair;
        newTask.taskCreatedBlock = uint32(block.number);
        newTask.source = source;

        // store hash of task onchain, emit event, and increase taskNum
        allTaskHashes[latestTaskNum] = keccak256(abi.encode(newTask));
        emit NewOracleTaskCreated(latestTaskNum, newTask);
        latestTaskNum = latestTaskNum + 1;

        return newTask;
    }

    function respondToOracleTask(
        OracleTask calldata task,
        uint256 _price,
        uint32 referenceTaskIndex,
        bytes memory signature,
        Reclaim.Proof calldata proof
    ) external {
        // check that the task is valid, hasn't been responsed yet, and is being responded in time
        require(
            keccak256(abi.encode(task)) == allTaskHashes[referenceTaskIndex],
            "supplied task does not match the one recorded in the contract"
        );
        require(
            allTaskResponses[msg.sender][referenceTaskIndex].length == 0,
            "Operator has already responded to the task"
        );

        // The message that was signed
        bytes32 messageHash = keccak256(
            abi.encodePacked("Hello, this is a signed message from the GTX Oracle Service Manager.")
        );
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        bytes4 magicValue = IERC1271Upgradeable.isValidSignature.selector;
        if (
            !(
                magicValue
                    == ECDSAStakeRegistry(stakeRegistry).isValidSignature(
                        ethSignedMessageHash, signature
                    )
            )
        ) {
            revert();
        }

        require(proof.signedClaim.claim.owner == OWNER_ADDRESS, "Owner is not valid!");
        allTaskResponses[msg.sender][referenceTaskIndex] = signature;

        _oraclePriceData[task.tokenPair] =
            OraclePriceData({price: _price, lastUpdate: block.timestamp});

        // emitting event
        emit OraclePriceInserted(task.tokenPair, _price, block.timestamp);
        emit OracleTaskResponded(
            referenceTaskIndex, task, msg.sender, proof.signedClaim.signatures[0]
        );
    }

    function getOraclePriceData(string calldata _tokenPair)
        external
        view
        returns (OraclePriceData memory)
    {
        return _oraclePriceData[_tokenPair];
    }

    function getOracleSourceData(string calldata _tokenPair)
        external
        view
        returns (OracleSourceData memory)
    {
        return _oracleSourceData[_tokenPair];
    }
}
