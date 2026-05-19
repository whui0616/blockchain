// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Shared wallet library with direct initialization disabled on the library instance
/// @notice No selfdestruct entrypoint is exposed.
contract SharedWalletLibraryFixed {
    address public walletLibrary;
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;
    bool public initialized;

    event Initialized(address[] owners, uint256 required);
    event Executed(address indexed to, uint256 value);

    constructor() {
        initialized = true; // protects the library's own storage from direct takeover
    }

    function initWallet(address[] memory newOwners, uint256 newRequired) public payable {
        require(!initialized, "already initialized");
        require(newOwners.length > 0, "owner required");
        require(newRequired > 0 && newRequired <= newOwners.length, "bad threshold");
        initialized = true;
        for (uint256 i = 0; i < newOwners.length; i++) {
            owners.push(newOwners[i]);
            isOwner[newOwners[i]] = true;
        }
        required = newRequired;
        emit Initialized(newOwners, newRequired);
    }

    function execute(address payable to, uint256 value) public {
        require(isOwner[msg.sender], "owner only");
        require(address(this).balance >= value, "insufficient wallet ether");
        (bool ok, ) = to.call{value: value}("");
        require(ok, "transfer failed");
        emit Executed(to, value);
    }
}
