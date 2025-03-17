// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IMALIStaking is Ownable, ReentrancyGuard {

    IERC20 public immutable imaliToken; // IMALI Token
    IERC20 public immutable lpToken; // LP Token

    uint256 public imaliRewardRate = 50; // Reward rate for IMALI staking
    uint256 public lpRewardRate = 100; // Higher reward rate for LP staking

    uint256 public imaliFeePercentage = 3; // 3% fee for IMALI staking
    uint256 public lpFeePercentage = 5; // 5% fee for LP staking

    address public feeRecipient; // Where the fee is sent

    struct StakeInfo {
        uint256 amount;
        uint256 lastUpdated;
        uint256 rewards;
    }

    mapping(address => StakeInfo) public imaliStakers;
    mapping(address => StakeInfo) public lpStakers;

    // Events
    event StakedIMALI(address indexed user, uint256 amount);
    event StakedLP(address indexed user, uint256 amount);
    event UnstakedIMALI(address indexed user, uint256 amount);
    event UnstakedLP(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event FeeTransferred(address indexed user, uint256 feeAmount);

    // Constructor
    constructor(IERC20 _imaliToken, IERC20 _lpToken, address _feeRecipient) Ownable() {
        require(address(_imaliToken) != address(0), "IMALI token address cannot be zero");
        require(address(_lpToken) != address(0), "LP token address cannot be zero");
        require(_feeRecipient != address(0), "Fee recipient cannot be zero address");

        imaliToken = _imaliToken;
        lpToken = _lpToken;
        feeRecipient = _feeRecipient;
    }

    /** 
     * @dev Stake IMALI tokens with fee deduction
     */
    function stakeIMALI(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0 IMALI");
        
        uint256 feeAmount = (amount * imaliFeePercentage) / 100;
        uint256 stakeAmount = amount - feeAmount;

        require(imaliToken.transferFrom(msg.sender, feeRecipient, feeAmount), "IMALI fee transfer failed");
        require(imaliToken.transferFrom(msg.sender, address(this), stakeAmount), "IMALI stake transfer failed");

        updateRewards(msg.sender, true);
        imaliStakers[msg.sender].amount += stakeAmount;
        imaliStakers[msg.sender].lastUpdated = block.timestamp;

        emit StakedIMALI(msg.sender, stakeAmount);
        emit FeeTransferred(msg.sender, feeAmount);
    }

    /** 
     * @dev Stake LP tokens with fee deduction (higher rewards)
     */
    function stakeLP(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0 LP");

        uint256 feeAmount = (amount * lpFeePercentage) / 100;
        uint256 stakeAmount = amount - feeAmount;

        require(lpToken.transferFrom(msg.sender, feeRecipient, feeAmount), "LP fee transfer failed");
        require(lpToken.transferFrom(msg.sender, address(this), stakeAmount), "LP stake transfer failed");

        updateRewards(msg.sender, false);
        lpStakers[msg.sender].amount += stakeAmount;
        lpStakers[msg.sender].lastUpdated = block.timestamp;

        emit StakedLP(msg.sender, stakeAmount);
        emit FeeTransferred(msg.sender, feeAmount);
    }

    /** 
     * @dev Unstake IMALI tokens with fee deduction
     */
    function unstakeIMALI(uint256 amount) external nonReentrant {
        require(amount > 0 && imaliStakers[msg.sender].amount >= amount, "Invalid IMALI unstake amount");

        uint256 feeAmount = (amount * imaliFeePercentage) / 100;
        uint256 unstakeAmount = amount - feeAmount;

        imaliStakers[msg.sender].amount -= amount;
        require(imaliToken.transfer(feeRecipient, feeAmount), "IMALI fee transfer failed");
        require(imaliToken.transfer(msg.sender, unstakeAmount), "IMALI unstake transfer failed");

        emit UnstakedIMALI(msg.sender, unstakeAmount);
        emit FeeTransferred(msg.sender, feeAmount);
    }

    /** 
     * @dev Unstake LP tokens with fee deduction
     */
    function unstakeLP(uint256 amount) external nonReentrant {
        require(amount > 0 && lpStakers[msg.sender].amount >= amount, "Invalid LP unstake amount");

        uint256 feeAmount = (amount * lpFeePercentage) / 100;
        uint256 unstakeAmount = amount - feeAmount;

        lpStakers[msg.sender].amount -= amount;
        require(lpToken.transfer(feeRecipient, feeAmount), "LP fee transfer failed");
        require(lpToken.transfer(msg.sender, unstakeAmount), "LP unstake transfer failed");

        emit UnstakedLP(msg.sender, unstakeAmount);
        emit FeeTransferred(msg.sender, feeAmount);
    }

    /** 
     * @dev Claim rewards based on staking duration and reward rate
     */
    function claimRewards() external nonReentrant {
        updateRewards(msg.sender, true);
        updateRewards(msg.sender, false);

        uint256 totalReward = imaliStakers[msg.sender].rewards + lpStakers[msg.sender].rewards;
        require(totalReward > 0, "No rewards to claim");

        imaliStakers[msg.sender].rewards = 0;
        lpStakers[msg.sender].rewards = 0;

        require(imaliToken.transfer(msg.sender, totalReward), "Reward transfer failed");
        emit RewardClaimed(msg.sender, totalReward);
    }

    /** 
     * @dev Calculate rewards
     */
    function updateRewards(address user, bool isIMALI) internal {
        uint256 timeStaked;
        uint256 rate;
        uint256 amount;
        
        if (isIMALI) {
            timeStaked = block.timestamp - imaliStakers[user].lastUpdated;
            rate = imaliRewardRate;
            amount = imaliStakers[user].amount;
            imaliStakers[user].rewards += (amount * rate * timeStaked) / 1 days;
            imaliStakers[user].lastUpdated = block.timestamp;
        } else {
            timeStaked = block.timestamp - lpStakers[user].lastUpdated;
            rate = lpRewardRate;
            amount = lpStakers[user].amount;
            lpStakers[user].rewards += (amount * rate * timeStaked) / 1 days;
            lpStakers[user].lastUpdated = block.timestamp;
        }
    }

    /** 
     * @dev Owner function to change reward rates
     */
    function setRewardRates(uint256 _imaliRate, uint256 _lpRate) external onlyOwner {
        imaliRewardRate = _imaliRate;
        lpRewardRate = _lpRate;
    }

    /** 
     * @dev Owner function to update fee settings
     */
    function setFeeSettings(uint256 _imaliFee, uint256 _lpFee, address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_imaliFee <= 10 && _lpFee <= 10, "Fees too high");
        imaliFeePercentage = _imaliFee;
        lpFeePercentage = _lpFee;
        feeRecipient = _feeRecipient;
    }
}
