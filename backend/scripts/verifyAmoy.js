const { run } = require("hardhat");

async function verifyContract(name, address, constructorArgs) {
    console.log(`🔍 Verifying ${name} at ${address}...`);
    try {
        await run("verify:verify", {
            address,
            constructorArguments: constructorArgs,
        });
        console.log(`✅ Verified: ${name} at ${address}`);
    } catch (error) {
        console.error(`❌ Failed to verify ${name}:`, error.message);
    }
}

async function main() {
    console.log("🚀 Starting contract verification on AMOY Testnet...");

    // ✅ Define contract addresses and constructor arguments
    const CONTRACTS = [
        {
            name: "IMALI Token",
            address: "0x0A89f90B7fF1a890a573A4938a92A28F48ceF9E6",
            args: ["0x49C882829D5834d3f12a84dA54bdcfF9ed088B73"], // ✅ Only 1 argument (Owner Address)
        },
        {
            name: "Stablecoin",
            address: "0x24C2EfDC90286f6fd14FA7B07e4a74f0828548C7",
            args: [],
        },
        {
            name: "IMALI Price Feed",
            address: "0x58C7a11AEE191d670a79487A93eee6A9F34314A1",
            args: ["1000000000000000000"], // Example: 1.0 ETH
        },
        {
            name: "ETH Price Feed",
            address: "0x98b29cd6b990Bbbdb1733Fc151BC0b41C754665b",
            args: ["2000000000000000000"], // Example: 2.0 ETH
        },
        {
            name: "MATIC Price Feed",
            address: "0x9cde4c3943Ab732a2a4fd2CF4c2Ae51B699FB3E2",
            args: ["3000000000000000000"], // Example: 3.0 MATIC
        },
        {
            name: "Lending Contract",
            address: "0xcDAf0901AC0B5Ef29B0698ea57b2830d0B898c8e",
            args: [],
        },
        {
            name: "Staking Contract",
            address: "0xc01e59f51e2b39451EFbf926beEc4Ddc41168fFA",
            args: [
                "0x0A89f90B7fF1a890a573A4938a92A28F48ceF9E6", // IMALI Token Address
                "0x6A60F9401F97949C41926DbFA9c8E08A617c944a", // LP Token Address
                "0x49C882829D5834d3f12a84dA54bdcfF9ed088B73", // Fee Recipient
            ],
        },
        {
            name: "Yield Farming",
            address: "0x84C6DD6F1510bcB94EeFb15e60dB8Cc9A69C460a",
            args: [
                "0x0A89f90B7fF1a890a573A4938a92A28F48ceF9E6", // IMALI Token Address
                "0x6A60F9401F97949C41926DbFA9c8E08A617c944a", // LP Token Address
                "0x49C882829D5834d3f12a84dA54bdcfF9ed088B73", // Fee Recipient
            ],
        },
        {
            name: "LP Token",
            address: "0x6A60F9401F97949C41926DbFA9c8E08A617c944a",
            args: [],
        },
    ];

    for (const contract of CONTRACTS) {
        await verifyContract(contract.name, contract.address, contract.args);
    }

    console.log("✅ All verification attempts completed.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
