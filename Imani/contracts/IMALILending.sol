// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract IMALILending is Ownable {
    struct Borrow {
        uint256 amount;
        uint256 borrowTime;
    }

    mapping(address => uint256) public imaliCollateral; // IMALI.e collateral
    mapping(address => uint256) public ethCollateral;   // ETH collateral
    mapping(address => uint256) public maticCollateral; // MATIC.e collateral
    mapping(address => Borrow) public borrowRecords;

    IERC20 public immutable imaliToken; // IMALI.e on Ethereum
    IERC20 public immutable stablecoin; // USDC/DAI
    AggregatorV3Interface public imaliPriceFeed; // Chainlink IMALI Price
    AggregatorV3Interface public ethPriceFeed; // Chainlink ETH Price
    AggregatorV3Interface public maticPriceFeed; // Chainlink MATIC Price

    uint256 public constant COLLATERAL_RATIO_IMALI = 130; // 130% for IMALI.e
    uint256 public constant COLLATERAL_RATIO_ETH = 150;   // 150% for ETH
    uint256 public constant COLLATERAL_RATIO_MATIC = 150; // 150% for MATIC.e
    uint256 public constant LIQUIDATION_THRESHOLD = 120;  // Liquidation at 120%
    uint256 public constant ANNUAL_INTEREST_RATE = 5;     // 5% yearly

    event CollateralDeposited(address indexed user, uint256 amount, string collateralType);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(address indexed user, uint256 collateralSeized);

    constructor(
        address _imali,
        address _stablecoin,
        address _imaliPriceFeed,
        address _ethPriceFeed,
        address _maticPriceFeed
    ) {
        imaliToken = IERC20(_imali);
        stablecoin = IERC20(_stablecoin);
        imaliPriceFeed = AggregatorV3Interface(_imaliPriceFeed);
        ethPriceFeed = AggregatorV3Interface(_ethPriceFeed);
        maticPriceFeed = AggregatorV3Interface(_maticPriceFeed);
    }

    // **Deposit IMALI.e as Collateral**
    function depositImaliCollateral(uint256 amount) external {
        require(amount > 0, "Deposit must be greater than zero");
        imaliToken.transferFrom(msg.sender, address(this), amount);
        imaliCollateral[msg.sender] += amount;
        emit CollateralDeposited(msg.sender, amount, "IMALI.e");
    }

    // **Deposit ETH as Collateral**
    function depositEthCollateral() external payable {
        require(msg.value > 0, "ETH deposit must be greater than zero");
        ethCollateral[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value, "ETH");
    }

    // **Deposit MATIC.e as Collateral**
    function depositMaticCollateral(uint256 amount) external {
        require(amount > 0, "Deposit must be greater than zero");
        imaliToken.transferFrom(msg.sender, address(this), amount);
        maticCollateral[msg.sender] += amount;
        emit CollateralDeposited(msg.sender, amount, "MATIC.e");
    }

    // **Borrow USDC/DAI based on collateral type**
    function borrow(uint256 amount, string memory collateralType) external {
        require(amount > 0, "Borrow amount must be greater than zero");
        
        uint256 collateralValue;
        uint256 requiredCollateral;
        
        if (keccak256(abi.encodePacked(collateralType)) == keccak256(abi.encodePacked("IMALI.e"))) {
            collateralValue = getCollateralValue(msg.sender, "IMALI.e");
            requiredCollateral = (amount * COLLATERAL_RATIO_IMALI) / 100;
            require(collateralValue >= requiredCollateral, "Insufficient IMALI.e collateral");
        } else if (keccak256(abi.encodePacked(collateralType)) == keccak256(abi.encodePacked("ETH"))) {
            collateralValue = getCollateralValue(msg.sender, "ETH");
            requiredCollateral = (amount * COLLATERAL_RATIO_ETH) / 100;
            require(collateralValue >= requiredCollateral, "Insufficient ETH collateral");
        } else if (keccak256(abi.encodePacked(collateralType)) == keccak256(abi.encodePacked("MATIC.e"))) {
            collateralValue = getCollateralValue(msg.sender, "MATIC.e");
            requiredCollateral = (amount * COLLATERAL_RATIO_MATIC) / 100;
            require(collateralValue >= requiredCollateral, "Insufficient MATIC.e collateral");
        } else {
            revert("Invalid collateral type");
        }

        borrowRecords[msg.sender] = Borrow(amount, block.timestamp);
        stablecoin.transfer(msg.sender, amount);
        emit Borrowed(msg.sender, amount);
    }

    // **Get real-time collateral value**
    function getCollateralValue(address borrower, string memory collateralType) public view returns (uint256) {
        if (keccak256(abi.encodePacked(collateralType)) == keccak256(abi.encodePacked("IMALI.e"))) {
            (, int256 price, , , ) = imaliPriceFeed.latestRoundData();
            return (imaliCollateral[borrower] * uint256(price)) / (10**8);
        } else if (keccak256(abi.encodePacked(collateralType)) == keccak256(abi.encodePacked("ETH"))) {
            (, int256 price, , , ) = ethPriceFeed.latestRoundData();
            return (ethCollateral[borrower] * uint256(price)) / (10**8);
        } else if (keccak256(abi.encodePacked(collateralType)) == keccak256(abi.encodePacked("MATIC.e"))) {
            (, int256 price, , , ) = maticPriceFeed.latestRoundData();
            return (maticCollateral[borrower] * uint256(price)) / (10**8);
        }
        return 0;
    }

    // **Liquidate undercollateralized borrowers**
    function liquidate(address borrower, string memory collateralType) external {
        uint256 collateralValue = getCollateralValue(borrower, collateralType);
        uint256 requiredCollateral = (borrowRecords[borrower].amount * LIQUIDATION_THRESHOLD) / 100;
        require(collateralValue < requiredCollateral, "Borrower is not undercollateralized");

        uint256 seizedCollateral = imaliCollateral[borrower];
        imaliCollateral[borrower] = 0;
        delete borrowRecords[borrower];

        imaliToken.transfer(msg.sender, seizedCollateral);
        emit Liquidated(borrower, seizedCollateral);
    }
}
