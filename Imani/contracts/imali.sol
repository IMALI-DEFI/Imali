// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract IMALIToken is ERC20 {
    constructor() ERC20("IMALI Token", "IMALI") {
        _mint(msg.sender, 1000000 * 10 ** decimals()); // Mint 1 million tokens
    }
}
