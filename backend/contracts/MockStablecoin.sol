// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockStablecoin is ERC20 {
    constructor() ERC20("MockStablecoin", "mUSDC") {
        _mint(msg.sender, 1000000 * 10**18); // Mint 1M tokens for testing
    }
}
