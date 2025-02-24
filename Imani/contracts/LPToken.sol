// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LPToken is ERC20 {
    constructor() ERC20("Liquidity Provider Token", "LP") {
        _mint(msg.sender, 1000000 * 10**18); // Mint 1M LP tokens to deployer
    }
}
