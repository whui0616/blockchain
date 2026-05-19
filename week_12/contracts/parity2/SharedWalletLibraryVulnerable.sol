// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Shared library vulnerable to direct initialization and SELFDESTRUCT
/// @notice Mirrors the Parity #2 lesson: the library itself can be taken over and killed.
contract SharedWalletLibraryVulnerable {
    address public walletLibrary;
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;
    bool public initialized;

    event Initialized(address[] owners, uint256 required);
    event Executed(address indexed to, uint256 value);
    event LibraryKilled(address indexed by);

    function initWallet(address[] memory newOwners, uint256 newRequired) public payable {
        require(newOwners.length > 0, "owner required");
        require(newRequired > 0 && newRequired <= newOwners.length, "bad threshold");
        for (uint256 i = 0; i < owners.length; i++) {
            isOwner[owners[i]] = false;
        }
        delete owners;
        for (uint256 i = 0; i < newOwners.length; i++) {
            owners.push(newOwners[i]);
            isOwner[newOwners[i]] = true;
        }
        required = newRequired;
        initialized = true;
        emit Initialized(newOwners, newRequired);
    }

    function execute(address payable to, uint256 value) public {
        require(isOwner[msg.sender], "owner only");
        require(address(this).balance >= value, "insufficient wallet ether");
        (bool ok, ) = to.call{value: value}("");
        require(ok, "transfer failed");
        emit Executed(to, value);
    }

    function killLibrary() public {
        require(isOwner[msg.sender], "owner only");
        emit LibraryKilled(msg.sender);
        selfdestruct(payable(msg.sender));
    }
}
