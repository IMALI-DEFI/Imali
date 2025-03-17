require("dotenv").config();
const { ethers } = require("hardhat");

const UNISWAP_ROUTER = "0xa38cd27185a464914D3046f0AB9d43356B34829D"; // Uniswap v2 Router on Polygon
const IMALI_TOKEN = process.env.IMALITOKEN_ADDRESS;
const MATIC_ADDRESS = "0x0000000000000000000000000000000000001010"; // Wrapped MATIC

const UNISWAP_ROUTER_ABI = [
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)"
];

async function addLiquidity() {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
        const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
        
        const router = new ethers.Contract(UNISWAP_ROUTER, UNISWAP_ROUTER_ABI, wallet);
        const imaliToken = new ethers.Contract(IMALI_TOKEN, ERC20_ABI, wallet);

        const amountImali = ethers.parseUnits("100", 18); // 100 IMALI tokens
        const amountMatic = ethers.parseUnits("1", 18); // 1 MATIC

        console.log("🔍 Checking IMALI balance...");
        const balance = await imaliToken.balanceOf(wallet.address);
        if (balance < amountImali) {
            throw new Error("❌ Insufficient IMALI balance for liquidity addition.");
        }

        // 1️⃣ Approve Uniswap to spend IMALI tokens
        console.log("⏳ Approving Uniswap Router to spend IMALI tokens...");
        const approveTx = await imaliToken.approve(UNISWAP_ROUTER, amountImali, {
            maxPriorityFeePerGas: ethers.parseUnits("30", "gwei"),
            maxFeePerGas: ethers.parseUnits("50", "gwei")
        });
        await approveTx.wait();
        console.log("✅ Approved!");

        // 2️⃣ Add liquidity
        console.log("⏳ Adding liquidity to IMALI-MATIC pool...");
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now
        const tx = await router.addLiquidityETH(
            IMALI_TOKEN,
            amountImali,
            amountImali * 95n / 100n, // 5% slippage tolerance
            amountMatic * 95n / 100n,
            wallet.address,
            deadline,
            {
                value: amountMatic,
                maxPriorityFeePerGas: ethers.parseUnits("30", "gwei"),
                maxFeePerGas: ethers.parseUnits("50", "gwei")
            }
        );

        await tx.wait();
        console.log("✅ Liquidity added successfully!");
    } catch (error) {
        console.error("❌ Error adding liquidity:", error.message);
    }
}

addLiquidity();
