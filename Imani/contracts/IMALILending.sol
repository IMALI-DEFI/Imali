// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract IMALILending is ReentrancyGuard, Ownable {
    ERC20 public token;
    uint256 public constant COLLATERAL_FACTOR = 150; // 150%
    uint256 public constant INTEREST_RATE = 5; // 5% per year
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    struct Loan {
        uint256 collateralAmount;
        uint256 borrowedAmount;
        uint256 borrowTimestamp;
    }

    mapping(address => Loan) public loans;

    constructor(address _tokenAddress) {
        token = ERC20(_tokenAddress);
    }

    function depositCollateral() external payable {
        loans[msg.sender].collateralAmount += msg.value;
    }

    function borrowTokens(uint256 amount) external nonReentrant {
        Loan storage loan = loans[msg.sender];
        uint256 maxBorrow = (loan.collateralAmount * 100) / COLLATERAL_FACTOR;
        require(amount <= maxBorrow, "Exceeds borrow limit");

        loan.borrowedAmount += amount;
        loan.borrowTimestamp = block.timestamp;

        token.transfer(msg.sender, amount);
    }

    function repayLoan(uint256 amount) external nonReentrant {
        Loan storage loan = loans[msg.sender];
        require(loan.borrowedAmount > 0, "No active loan");

        uint256 timeElapsed = block.timestamp - loan.borrowTimestamp;
        uint256 interest = (loan.borrowedAmount * INTEREST_RATE * timeElapsed) /
            (SECONDS_PER_YEAR * 100);

        uint256 totalRepayment = loan.borrowedAmount + interest;
        require(amount >= totalRepayment, "Insufficient repayment amount");

        token.transferFrom(msg.sender, address(this), totalRepayment);
        loan.borrowedAmount = 0;
    }

    function withdrawCollateral() external nonReentrant {
        Loan storage loan = loans[msg.sender];
        require(loan.borrowedAmount == 0, "Loan not fully repaid");

        uint256 collateral = loan.collateralAmount;
        loan.collateralAmount = 0;

        payable(msg.sender).transfer(collateral);
    }
}
