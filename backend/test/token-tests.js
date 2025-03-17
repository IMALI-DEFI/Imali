const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IMALIToken Tests", function () {
  let token, owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const IMALIToken = await ethers.getContractFactory("IMALIToken");
    token = await IMALIToken.deploy(owner.address); // Deploy the contract
  });

  it("Should allow the owner to mint tokens", async function () {
    const mintAmount = ethers.parseEther("1000"); // 1000 tokens

    // Get the initial balance as BigInt
    const initialBalance = await token.balanceOf(owner.address);

    // Mint tokens to the owner's address
    await token.mint(owner.address, mintAmount);

    // Get the final balance as BigInt
    const finalBalance = await token.balanceOf(owner.address);

    // Assert using BigInt arithmetic
    expect(finalBalance).to.equal(BigInt(initialBalance) + BigInt(mintAmount));
  });
});
