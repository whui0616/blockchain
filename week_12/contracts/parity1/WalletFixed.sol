// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Fixed wallet with one-time initialization
contract WalletFixed {
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;
    bool public initialized;

    event Initialized(address[] owners, uint256 required);
    event Executed(address indexed to, uint256 value);

    constructor(address[] memory initialOwners, uint256 initialRequired) payable {
        _init(initialOwners, initialRequired);
    }

    function initWallet(address[] memory newOwners, uint256 newRequired) external {
        require(!initialized, "already initialized");
        _init(newOwners, newRequired);
    }

    function _init(address[] memory newOwners, uint256 newRequired) internal {
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

    function execute(address payable to, uint256 value) external {
        require(isOwner[msg.sender], "owner only");
        require(address(this).balance >= value, "insufficient wallet ether");
        (bool ok, ) = to.call{value: value}("");
        require(ok, "transfer failed");
        emit Executed(to, value);
    }

    receive() external payable {}
}
