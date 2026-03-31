// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract HelloCombined {
    // 1. 인사말 (누구나 볼 수 있게 public)
    string public greeting = "Hello World";

    // 2. 숫자 (private으로 숨김! 외부에서 안 보임)
    int private _number = 10;

    // 3. 숨겨진 숫자를 꺼내서 보여주는 함수 (Getter)
    function getNumber() public view returns (int) {
        return _number;
    }

    // 4. (보너스) 숫자를 바꾸는 함수 (Setter)
    function setNumber(int newNumber) public {
        _number = newNumber;
    }
}