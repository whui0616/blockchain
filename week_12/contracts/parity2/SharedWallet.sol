// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Wallet proxy that depends on a shared library
contract SharedWallet {
    address public walletLibrary;
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;
    bool public initialized;

    constructor(address libraryAddress, address[] memory initialOwners, uint256 initialRequired) payable {
        walletLibrary = libraryAddress;
        (bool ok, bytes memory data) = libraryAddress.delegatecall(
            abi.encodeWithSignature("initWallet(address[],uint256)", initialOwners, initialRequired)
        );
        if (!ok) {
            assembly {
                revert(add(data, 0x20), mload(data))
            }
        }
    }

    fallback() external payable {
        address lib = walletLibrary;
        require(lib.code.length > 0, "library code missing: wallet funds frozen");
        (bool ok, bytes memory data) = lib.delegatecall(msg.data);
        if (!ok) {
            assembly {
                revert(add(data, 0x20), mload(data))
            }
        }
        assembly {
            return(add(data, 0x20), mload(data))
        }
    }

    receive() external payable {}
}
