// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WalletLibraryVulnerable {
    address public owner;
    bool public initialized;

    function initWallet(address newOwner) public {
        owner = newOwner;
        initialized = true;
    }

    function execute(address payable to, uint256 value) public {
        require(msg.sender == owner, "not owner");
        (bool ok, ) = to.call{value: value}("");
        require(ok, "transfer failed");
    }

    function kill() public {
        selfdestruct(payable(msg.sender));
    }
}

contract WalletProxy {
    bytes32 private constant LIB_SLOT = keccak256("wallet.proxy.library.slot");

    constructor(address _libraryAddress) {
        bytes32 slot = LIB_SLOT;
        assembly {
            sstore(slot, _libraryAddress)
        }
    }

    function libraryAddress() public view returns (address impl) {
        bytes32 slot = LIB_SLOT;
        assembly {
            impl := sload(slot)
        }
    }

    receive() external payable {}

    fallback() external payable {
        bytes32 slot = LIB_SLOT;
        address impl;
        assembly {
            impl := sload(slot)
        }
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}

contract WalletLibraryFixed {
    address public owner;
    bool public initialized;

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function initWallet(address newOwner) public {
        require(!initialized, "already initialized");
        owner = newOwner;
        initialized = true;
    }

    function execute(address payable to, uint256 value) public onlyOwner {
        (bool ok, ) = to.call{value: value}("");
        require(ok, "transfer failed");
    }
}
