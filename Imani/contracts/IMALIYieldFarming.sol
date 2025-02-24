// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IMALIYieldFarming is Ownable {
    IERC20 public immutable imaliToken;
    IERC20 public immutable lpToken;

    uint256 public rewardRate = 100;
    uint256 public totalStaked;
    uint256 public lastUpdated;
    uint256 public rewardPerTokenStored;

    uint256 public feePercentage = 5;
    address public feeRecipient;

    mapping(address => uint256) public stakedLpTokens;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public userRewardPerTokenPaid;

    event LiquidityStaked(address indexed user, uint256 amount);
    event LiquidityUnstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event FeeTransferred(address indexed user, uint256 feeAmount);

    constructor(IERC20 _imaliToken, IERC20 _lpToken, address _feeRecipient) Ownable() {
        require(address(_imaliToken) != address(0), "IMALI Token address cannot be zero");
        require(address(_lpToken) != address(0), "LP Token address cannot be zero");
        require(_feeRecipient != address(0), "Fee recipient cannot be zero");

        imaliToken = _imaliToken;
        lpToken = _lpToken;
        feeRecipient = _feeRecipient;
        lastUpdated = block.timestamp;
    }

    modifier updateReward(address user) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdated = block.timestamp;

        if (user != address(0)) {
            rewards[user] = earned(user);
            userRewardPerTokenPaid[user] = rewardPerTokenStored;
        }
        _;
    }

    function stake(uint256 amount) external updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0 tokens");
        require(lpToken.balanceOf(msg.sender) >= amount, "Insufficient LP Token balance");
        require(lpToken.allowance(msg.sender, address(this)) >= amount, "LP Token allowance too low");

        uint256 feeAmount = (amount * feePercentage) / 100;
        uint256 stakeAmount = amount - feeAmount;

        bool feeSent = lpToken.transferFrom(msg.sender, feeRecipient, feeAmount);
        require(feeSent, "Fee transfer failed");

        bool stakeSent = lpToken.transferFrom(msg.sender, address(this), stakeAmount);
        require(stakeSent, "Stake transfer failed");

        stakedLpTokens[msg.sender] += stakeAmount;
        totalStaked += stakeAmount;

        emit LiquidityStaked(msg.sender, stakeAmount);
        emit FeeTransferred(msg.sender, feeAmount);
    }

    function unstake(uint256 amount) external updateReward(msg.sender) {
        require(amount > 0, "Cannot unstake 0 tokens");
        require(stakedLpTokens[msg.sender] >= amount, "Insufficient staked balance");

        uint256 feeAmount = (amount * feePercentage) / 100;
        uint256 unstakeAmount = amount - feeAmount;

        stakedLpTokens[msg.sender] -= amount;
        totalStaked -= amount;

        bool feeSent = lpToken.transfer(feeRecipient, feeAmount);
        require(feeSent, "Fee transfer failed");

        bool unstakeSent = lpToken.transfer(msg.sender, unstakeAmount);
        require(unstakeSent, "Unstake transfer failed");

        emit LiquidityUnstaked(msg.sender, unstakeAmount);
        emit FeeTransferred(msg.sender, feeAmount);
    }

    function claimRewards() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards to claim");

        rewards[msg.sender] = 0;
        bool rewardSent = imaliToken.transfer(msg.sender, reward);
        require(rewardSent, "Reward transfer failed");

        emit RewardClaimed(msg.sender, reward);
    }

    function earned(address user) public view returns (uint256) {
        return ((stakedLpTokens[user] * (rewardPerToken() - userRewardPerTokenPaid[user])) / 1e18) + rewards[user];
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + ((rewardRate * (block.timestamp - lastUpdated) * 1e18) / totalStaked);
    }

    function setFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 100, "Fee must be between 0 and 100");
        feePercentage = newFeePercentage;
    }

    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Fee recipient cannot be zero address");
        feeRecipient = newFeeRecipient;
    }
}
