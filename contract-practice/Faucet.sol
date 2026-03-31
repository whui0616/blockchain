// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract Faucet {
    address payable public owner;
    uint256 public constant WITHDRAWAL_AMOUNT = 0.1 ether;
    uint256 public constant LOCK_TIME = 1 days;
    mapping(address => uint256) public lastWithdrawalTime;

    event Withdrawal(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;
    }

    constructor() {
        owner = payable(msg.sender);
    }

    function withdraw() external {
        require(block.timestamp >= lastWithdrawalTime[msg.sender] + LOCK_TIME, "Wait 24 hours.");
        require(address(this).balance >= WITHDRAWAL_AMOUNT, "Insufficient balance.");
        
        lastWithdrawalTime[msg.sender] = block.timestamp;
        payable(msg.sender).transfer(WITHDRAWAL_AMOUNT);
        emit Withdrawal(msg.sender, WITHDRAWAL_AMOUNT);
    }

    // 컨트랙트가 이더를 받을 수 있게 해주는 특별한 함수
    receive() external payable {}
}