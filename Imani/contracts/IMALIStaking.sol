// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IMALIStaking is Ownable {

    IERC20 public imaliToken; // Declare the IMALIToken as an ERC20 token
    uint256 public rewardRate = 100; // Rate at which rewards are distributed per second
    uint256 public feePercentage = 5; // Fee percentage (5% fee)
    address public feeRecipient; // Address where the fees will be sent
    
    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public lastUpdated;
    mapping(address => uint256) public rewards;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event FeeTransferred(address indexed user, uint256 feeAmount);

    // Constructor
    constructor(IERC20 _imaliToken, address _feeRecipient) Ownable() {
        require(address(_imaliToken) != address(0), "IMALIToken address cannot be zero");
        require(_feeRecipient != address(0), "Fee recipient cannot be the zero address");
        
        imaliToken = _imaliToken;
        feeRecipient = _feeRecipient; // Set the fee recipient address
    }

    // Stake tokens with fee deduction
    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0 tokens");
        uint256 feeAmount = (amount * feePercentage) / 100; // Calculate the fee to be deducted
        uint256 stakeAmount = amount - feeAmount; // Subtract fee from the staked amount

        // Transfer tokens: First transfer the fee to the fee recipient, then the remaining stake amount
        require(imaliToken.transferFrom(msg.sender, feeRecipient, feeAmount), "Fee transfer failed");
        require(imaliToken.transferFrom(msg.sender, address(this), stakeAmount), "Stake transfer failed");

        stakedAmount[msg.sender] += stakeAmount;
        lastUpdated[msg.sender] = block.timestamp;

        emit Staked(msg.sender, stakeAmount);
        emit FeeTransferred(msg.sender, feeAmount); // Emit the fee transfer event
    }

    // Unstake tokens with fee deduction
    function unstake(uint256 amount) external {
        require(amount > 0 && stakedAmount[msg.sender] >= amount, "Invalid unstake amount");

        uint256 feeAmount = (amount * feePercentage) / 100; // Calculate the fee to be deducted
        uint256 unstakeAmount = amount - feeAmount; // Subtract fee from the unstaked amount

        // Reduce staked amount by the unstaked amount
        stakedAmount[msg.sender] -= amount;

        // Transfer the fee to the fee recipient and the remaining tokens to the user
        require(imaliToken.transfer(feeRecipient, feeAmount), "Fee transfer failed");
        require(imaliToken.transfer(msg.sender, unstakeAmount), "Unstake transfer failed");

        emit Unstaked(msg.sender, unstakeAmount);
        emit FeeTransferred(msg.sender, feeAmount); // Emit the fee transfer event
    }

    // Claim rewards
    function claimRewards() external {
        uint256 reward = calculateReward(msg.sender);
        require(reward > 0, "No rewards to claim");

        rewards[msg.sender] = 0; // Reset rewards
        lastUpdated[msg.sender] = block.timestamp;
        require(imaliToken.transfer(msg.sender, reward), "Transfer failed");

        emit RewardClaimed(msg.sender, reward);
    }

    // Calculate rewards based on staking duration and reward rate
    function calculateReward(address user) public view returns (uint256) {
        uint256 timeStaked = block.timestamp - lastUpdated[user];
        return stakedAmount[user] * rewardRate * timeStaked / 1 days;
    }

    // Owner function to change the fee percentage
    function setFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 100, "Fee percentage must be between 0 and 100");
        feePercentage = newFeePercentage;
    }

    // Owner function to change the fee recipient address
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Fee recipient cannot be the zero address");
        feeRecipient = newFeeRecipient;
    }
}
