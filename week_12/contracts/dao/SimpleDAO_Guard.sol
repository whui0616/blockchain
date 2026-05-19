// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SimpleDAO fixed with a local reentrancy guard
contract SimpleDAO_Guard {
    mapping(address => uint256) public balances;
    bool private locked;

    modifier nonReentrant() {
        require(!locked, "reentrant call blocked");
        locked = true;
        _;
        locked = false;
    }

    function donate(address to) external payable {
        require(msg.value > 0, "donation required");
        balances[to] += msg.value;
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "insufficient recorded balance");
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "send failed");
        balances[msg.sender] -= amount;
    }

    receive() external payable {}
}
