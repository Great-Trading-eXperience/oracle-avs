// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMarketFactory {
    enum Status {
        INACTIVE,
        ACTIVE
    }

    struct Market {
        address marketToken;
        address longToken;
        address shortToken;
        Status status;
    }

    event MarketCreated(
        address indexed marketToken, address indexed longToken, address indexed shortToken
    );
    event MarketActivation(address indexed marketToken, Status status);

    error MarketAlreadyExists(address longToken, address shortToken);
    error MarketDoesNotExists(address longToken, address shortToken);

    function createMarket(address _longToken, address _shortToken) external returns (address);

    function setMarketActivation(
        address _longToken,
        address _shortToken,
        Status _status
    ) external;
}
