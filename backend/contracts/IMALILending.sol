// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract IMALILending is Ownable, ReentrancyGuard, Pausable {
    struct Borrow {
        uint256 amount; // Borrowed stablecoin amount
        uint256 borrowTime; // Timestamp when the borrow occurred
        address collateralToken; // Collateral token address
        uint256 accruedInterest; // Accrued interest on the borrow
    }

    // Collateral balances: user => token => amount
    mapping(address => mapping(address => uint256)) public collateralBalances;

    // Borrow records: user => borrow ID => Borrow struct
    mapping(address => mapping(uint256 => Borrow)) public borrowRecords;
    mapping(address => uint256) public borrowCount; // Tracks the number of borrows per user

    // Stablecoin supply balances: user => amount
    mapping(address => uint256) public supplyBalances;

    // Stablecoin contract
    IERC20 public immutable stablecoin;

    // Collateral parameters: token => parameters
    mapping(address => uint256) public collateralRatios; // Collateral ratio (e.g., 130 = 130%)
    mapping(address => AggregatorV3Interface) public priceFeeds; // Chainlink price feed for collateral tokens

    // Platform parameters
    uint256 public supplyRate; // Interest rate for suppliers (e.g., 300 = 3.00%)
    uint256 public borrowRate; // Interest rate for borrowers (e.g., 700 = 7.00%)
    uint256 public depositFee; // Fee for depositing collateral (e.g., 50 = 0.50%)
    uint256 public borrowFee; // Fee for borrowing stablecoins (e.g., 50 = 0.50%)
    uint256 public liquidationThreshold; // Threshold for liquidation (e.g., 120 = 120%)
    uint256 public annualInterestRate; // Annual interest rate (e.g., 5 = 5%)

    // Events
    event CollateralDeposited(address indexed user, uint256 amount, address indexed collateralToken);
    event CollateralWithdrawn(address indexed user, uint256 amount, address indexed collateralToken);
    event Borrowed(address indexed user, uint256 amount, address indexed collateralToken, uint256 borrowId);
    event Repaid(address indexed user, uint256 amount, uint256 borrowId);
    event Liquidated(address indexed borrower, uint256 collateralSeized, address indexed collateralToken, uint256 borrowId);
    event Supplied(address indexed user, uint256 amount);
    event WithdrawnSupply(address indexed user, uint256 amount);
    event FeesCollected(address indexed user, uint256 feeAmount, string feeType);

    /// @notice Constructor to initialize the contract
    constructor(address _stablecoin) {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        stablecoin = IERC20(_stablecoin);

        // Set default parameters
        supplyRate = 300;
        borrowRate = 700;
        depositFee = 50;
        borrowFee = 50;
        liquidationThreshold = 120;
        annualInterestRate = 5;
    }

    /// @notice Admin function to register collateral parameters for a token.
    function setCollateralParameters(
        address token,
        address priceFeed,
        uint256 ratio
    ) external onlyOwner {
        require(token != address(0) && priceFeed != address(0), "Invalid address");
        require(ratio > 0, "Ratio must be > 0");
        priceFeeds[token] = AggregatorV3Interface(priceFeed);
        collateralRatios[token] = ratio;
    }

    /// @notice Deposit collateral.
    function depositCollateral(address token, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(address(priceFeeds[token]) != address(0), "Token not supported");

        // Deduct deposit fee
        uint256 fee = (amount * depositFee) / 10000;
        uint256 netAmount = amount - fee;
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        collateralBalances[msg.sender][token] += netAmount;

        emit CollateralDeposited(msg.sender, netAmount, token);
        emit FeesCollected(msg.sender, fee, "deposit");
    }

    /// @notice Withdraw collateral.
    function withdrawCollateral(address token, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(collateralBalances[msg.sender][token] >= amount, "Insufficient collateral");

        collateralBalances[msg.sender][token] -= amount;
        IERC20(token).transfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, amount, token);
    }

    /// @notice Borrow stablecoin using specified collateral.
    function borrow(uint256 amount, address collateralToken) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(address(priceFeeds[collateralToken]) != address(0), "Collateral not supported");

        uint256 collateralValue = getCollateralValue(msg.sender, collateralToken);
        uint256 requiredValue = (amount * collateralRatios[collateralToken]) / 100;
        require(collateralValue >= requiredValue, "Insufficient collateral");

        // Deduct borrow fee
        uint256 fee = (amount * borrowFee) / 10000;
        uint256 netBorrow = amount - fee;

        uint256 borrowId = borrowCount[msg.sender]++;
        borrowRecords[msg.sender][borrowId] = Borrow(netBorrow, block.timestamp, collateralToken, 0);

        stablecoin.transfer(msg.sender, netBorrow);
        emit Borrowed(msg.sender, netBorrow, collateralToken, borrowId);
        emit FeesCollected(msg.sender, fee, "borrow");
    }

    /// @notice Repay a borrow.
    function repay(uint256 borrowId, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be > 0");
        Borrow storage b = borrowRecords[msg.sender][borrowId];
        require(b.amount > 0, "No active borrow");

        uint256 interest = calculateAccruedInterest(msg.sender, borrowId);
        uint256 totalRepay = b.amount + interest;
        require(amount <= totalRepay, "Repay exceeds total owed");

        stablecoin.transferFrom(msg.sender, address(this), amount);
        if (amount >= totalRepay) {
            delete borrowRecords[msg.sender][borrowId];
        } else {
            b.amount = totalRepay - amount;
        }

        emit Repaid(msg.sender, amount, borrowId);
    }

    /// @notice Liquidate an undercollateralized borrow.
    function liquidate(address borrower, uint256 borrowId) external whenNotPaused nonReentrant {
        Borrow memory b = borrowRecords[borrower][borrowId];
        require(b.amount > 0, "No active borrow");

        uint256 collateralValue = getCollateralValue(borrower, b.collateralToken);
        uint256 requiredValue = (b.amount * liquidationThreshold) / 100;
        require(collateralValue < requiredValue, "Borrower not undercollateralized");

        uint256 seized = collateralBalances[borrower][b.collateralToken];
        collateralBalances[borrower][b.collateralToken] = 0;
        delete borrowRecords[borrower][borrowId];

        IERC20(b.collateralToken).transfer(msg.sender, seized);
        emit Liquidated(borrower, seized, b.collateralToken, borrowId);
    }

    /// @notice Supply stablecoin.
    function supply(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be > 0");
        stablecoin.transferFrom(msg.sender, address(this), amount);
        supplyBalances[msg.sender] += amount;
        emit Supplied(msg.sender, amount);
    }

    /// @notice Withdraw supplied stablecoin.
    function withdrawSupply(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(supplyBalances[msg.sender] >= amount, "Insufficient balance");
        supplyBalances[msg.sender] -= amount;
        stablecoin.transfer(msg.sender, amount);
        emit WithdrawnSupply(msg.sender, amount);
    }

    /// @notice Calculate accrued interest for a borrow.
    function calculateAccruedInterest(address user, uint256 borrowId) public view returns (uint256) {
        Borrow memory b = borrowRecords[user][borrowId];
        if (b.amount == 0) return 0;
        uint256 timeElapsed = block.timestamp - b.borrowTime;
        uint256 interest = (b.amount * annualInterestRate * timeElapsed) / (365 days * 100);
        return interest;
    }

    /// @notice Get token price from Chainlink (assumes 8 decimals)
    function getTokenPrice(address token) public view returns (uint256) {
        (, int256 price, , , ) = priceFeeds[token].latestRoundData();
        return uint256(price);
    }

    /// @notice Get USD value of user's collateral for a token.
    function getCollateralValue(address user, address token) public view returns (uint256) {
        uint256 deposited = collateralBalances[user][token];
        return (deposited * getTokenPrice(token)) / 1e8;
    }

    // --- Admin Functions to Update Dynamic Parameters ---

    function updateSupplyRate(uint256 newRate) external onlyOwner {
        supplyRate = newRate;
    }

    function updateBorrowRate(uint256 newRate) external onlyOwner {
        borrowRate = newRate;
    }

    function updateDepositFee(uint256 newFee) external onlyOwner {
        depositFee = newFee;
    }

    function updateBorrowFee(uint256 newFee) external onlyOwner {
        borrowFee = newFee;
    }

    function updateLiquidationThreshold(uint256 newThreshold) external onlyOwner {
        liquidationThreshold = newThreshold;
    }

    function updateAnnualInterestRate(uint256 newRate) external onlyOwner {
        annualInterestRate = newRate;
    }

    // --- Pausable Functions ---

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}