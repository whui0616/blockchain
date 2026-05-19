// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Vulnerable SimpleDAO
/// @notice Intentionally vulnerable: external call happens before the balance is reduced.
contract SimpleDAO {
    mapping(address => uint256) public balances;

    event Donated(address indexed from, address indexed to, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function donate(address to) external payable {
        require(msg.value > 0, "donation required");
        balances[to] += msg.value;
        emit Donated(msg.sender, to, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient recorded balance");

        // VULNERABILITY: control is handed to msg.sender before effects are applied.
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "send failed");

        // Legacy DAO-style teaching model: old Solidity versions didn't check
        // arithmetic underflow. This keeps the vulnerable replay executable on
        // Solidity 0.8 while the fixed contracts keep normal checked arithmetic.
        unchecked {
            balances[msg.sender] -= amount;
        }
        emit Withdrawn(msg.sender, amount);
    }

    receive() external payable {}
}
