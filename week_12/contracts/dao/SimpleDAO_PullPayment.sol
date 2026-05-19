// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SimpleDAO fixed with a pull-payment withdrawal queue
/// @notice withdraw() records a payment claim instead of pushing Ether immediately.
contract SimpleDAO_PullPayment {
    mapping(address => uint256) public balances;
    mapping(address => uint256) public pendingPayments;

    function donate(address to) external payable {
        require(msg.value > 0, "donation required");
        balances[to] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient recorded balance");
        balances[msg.sender] -= amount;
        pendingPayments[msg.sender] += amount;
    }

    function claimPayment() external {
        uint256 amount = pendingPayments[msg.sender];
        require(amount > 0, "nothing pending");
        pendingPayments[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "claim failed");
    }

    receive() external payable {}
}
