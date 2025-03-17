// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LPToken is ERC20, Ownable {
    constructor() ERC20("Liquidity Provider Token", "LP") {
        _mint(msg.sender, 1000000 * 10**18); 
        _transferOwnership(msg.sender); 
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
