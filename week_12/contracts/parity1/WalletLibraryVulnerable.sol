// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Parity-style wallet library with missing initializer guard
/// @notice The storage layout intentionally matches WalletVulnerable because calls use delegatecall.
contract WalletLibraryVulnerable {
    address public walletLibrary;
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;

    event Initialized(address[] owners, uint256 required);
    event Executed(address indexed to, uint256 value);

    function initWallet(address[] memory newOwners, uint256 newRequired) public {
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
