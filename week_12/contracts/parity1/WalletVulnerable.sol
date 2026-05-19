// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Proxy wallet that forgets to initialize owners
/// @notice Anyone can call initWallet through fallback and become owner.
contract WalletVulnerable {
    address public walletLibrary;
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;

    constructor(address libraryAddress) payable {
        walletLibrary = libraryAddress;
    }

    fallback() external payable {
        address lib = walletLibrary;
        require(lib.code.length > 0, "library code missing");
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
