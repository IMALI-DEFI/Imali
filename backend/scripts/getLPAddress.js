const { ethers } = require("hardhat");
require("dotenv").config();

// Addresses for IMALIToken and MATIC on Polygon
const IMALI_TOKEN_ADDRESS = "0x9cde4c3943Ab732a2a4fd2CF4c2Ae51B699FB3E2";
const MATIC_ADDRESS = "0x0000000000000000000000000000000000001010";

// UniswapV2 Factory address on Polygon
const UNISWAP_FACTORY_ADDRESS = "0x5757371414417b8c6caad45baef941abc7d3ab32";
const UNISWAP_FACTORY_ABI = [
    "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];

async function getLPTokenAddress() {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const factory = new ethers.Contract(UNISWAP_FACTORY_ADDRESS, UNISWAP_FACTORY_ABI, provider);

    const lpTokenAddress = await factory.getPair(IMALI_TOKEN_ADDRESS, MATIC_ADDRESS);
    if (lpTokenAddress === ethers.ZeroAddress) {
        console.log("LP Token not found. Ensure the liquidity pair exists on Uniswap.");
    } else {
        console.log("LP Token Address:", lpTokenAddress);
    }
}

getLPTokenAddress().catch(console.error);