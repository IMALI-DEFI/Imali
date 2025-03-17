// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IMALIToken is ERC20, Ownable {
    // Define a sale rate: number of tokens per 1 MATIC (assuming 18 decimals)
    uint256 public constant RATE = 100; // e.g., 100 tokens per MATIC

    // Constructor initializes the token with a name, symbol, and initial owner
    constructor(address initialOwner) ERC20("IMALIToken", "IMAL") {
        require(initialOwner != address(0), "Owner cannot be the zero address");
        // Mint initial supply to the initial owner
        _mint(initialOwner, 1000 * 10 ** decimals());
        // Transfer ownership to the initial owner (if different from deployer)
        transferOwnership(initialOwner);
    }

    // Mint function that allows the owner to mint new tokens to a specified address
    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "Cannot mint to the zero address");
        _mint(to, amount);
    }

    // Airdrop function for distributing tokens to multiple addresses
    function airdrop(address[] memory recipients, uint256 amount) public onlyOwner {
        for (uint i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid address");
            _mint(recipients[i], amount);
        }
    }

    // Payable function to allow users to buy tokens by sending MATIC
    function buyTokens() external payable {
        require(msg.value > 0, "Send some MATIC to buy tokens");
        // Calculate the number of tokens to mint
        // For example: if RATE is 100 and user sends 1 MATIC (1e18 wei), they get 100 * 10^18 tokens.
        uint256 tokensToMint = msg.value * RATE;
        _mint(msg.sender, tokensToMint);
    }

    // Withdraw function for the owner to withdraw collected MATIC
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }
}
