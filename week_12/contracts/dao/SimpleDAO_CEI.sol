// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SimpleDAO fixed with Checks-Effects-Interactions
contract SimpleDAO_CEI {
    mapping(address => uint256) public balances;

    function donate(address to) external payable {
        require(msg.value > 0, "donation required");
        balances[to] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient recorded balance");
        balances[msg.sender] -= amount; // effect first
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "send failed");
    }

    receive() external payable {}
}
