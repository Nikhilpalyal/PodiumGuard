const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying CrossChainMEVDefense (Audit Version)...");

    // Get the contract factory
    const CrossChainMEVDefense = await ethers.getContractFactory("CrossChainMEVDefense_Audit");

    // For audit purposes, we'll use a mock core contract address
    // In production, this would be the actual PodiumGuardCore address
    const mockCoreContract = "0x1234567890123456789012345678901234567890";

    console.log("📋 Deployment Parameters:");
    console.log(`   Core Contract: ${mockCoreContract}`);
    console.log(`   Deployer: ${(await ethers.getSigners())[0].address}`);

    // Deploy the contract
    const crossChainDefense = await CrossChainMEVDefense.deploy(mockCoreContract);

    // Wait for deployment
    await crossChainDefense.waitForDeployment();

    const deployedAddress = await crossChainDefense.getAddress();

    console.log("✅ Contract deployed successfully!");
    console.log(`📍 Contract Address: ${deployedAddress}`);
    console.log(`🔗 Network: ${await ethers.provider.getNetwork()}`);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    try {
        const version = await crossChainDefense.CONTRACT_VERSION();
        const chainId = await crossChainDefense.currentChainId();
        const maxRisk = await crossChainDefense.MAX_RISK_SCORE();
        
        console.log(`   Contract Version: ${version}`);
        console.log(`   Current Chain ID: ${chainId}`);
        console.log(`   Max Risk Score: ${maxRisk}`);
        
        console.log("✅ Deployment verification successful!");
        
        // Contract is ready for audit
        console.log("\n🎯 Ready for SecureDApp Audit!");
        console.log("📝 You can now upload this contract to SecureDApp Audit Express");
        console.log(`📋 Contract Address: ${deployedAddress}`);
        
    } catch (error) {
        console.error("❌ Deployment verification failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });