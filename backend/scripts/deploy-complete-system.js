import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

/**
 * Comprehensive deployment script for PodiumGuard X MEV Defense System
 * Deploys all contracts in the correct order with proper initialization
 */
async function main() {
  console.log('🚀 Starting PodiumGuard X Smart Contract Deployment...\n');

  // Get deployment parameters
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const network = await ethers.provider.getNetwork();
  
  console.log('📋 Deployment Configuration:');
  console.log(`  Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`  Deployer: ${deployerAddress}`);
  console.log(`  Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployerAddress))} ETH\n`);

  // Deployment configuration
  const config = {
    emergencyThreshold: 10,        // Number of high-risk detections to trigger emergency
    minStakeAmount: ethers.parseEther('0.1'), // Minimum stake for validators
    treasuryAddress: deployerAddress, // Treasury address (change for production)
    gasLimit: 3000000,
    gasPrice: ethers.parseUnits('20', 'gwei')
  };

  const deployedContracts = {};
  const deploymentData = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    // 1. Deploy PodiumGuardCore (Main contract)
    console.log('📦 1. Deploying PodiumGuardCore...');
    const PodiumGuardCore = await ethers.getContractFactory('PodiumGuardCore');
    const coreContract = await PodiumGuardCore.deploy(
      deployerAddress,           // Admin
      config.treasuryAddress,    // Treasury
      config.emergencyThreshold, // Emergency threshold
      config.minStakeAmount,     // Min stake
      {
        gasLimit: config.gasLimit,
        gasPrice: config.gasPrice
      }
    );
    await coreContract.waitForDeployment();
    
    const coreAddress = await coreContract.getAddress();
    deployedContracts.core = coreContract;
    deploymentData.contracts.PodiumGuardCore = {
      address: coreAddress,
      deployer: deployerAddress,
      constructorArgs: [deployerAddress, config.treasuryAddress, config.emergencyThreshold, config.minStakeAmount]
    };
    
    console.log(`  ✅ PodiumGuardCore deployed at: ${coreAddress}`);
    console.log(`     Transaction: ${coreContract.deploymentTransaction()?.hash}\n`);

    // 2. Deploy AIOracle
    console.log('📦 2. Deploying AIOracle...');
    const AIOracle = await ethers.getContractFactory('AIOracle');
    const aiOracleContract = await AIOracle.deploy(
      coreAddress,
      {
        gasLimit: config.gasLimit,
        gasPrice: config.gasPrice
      }
    );
    await aiOracleContract.waitForDeployment();
    
    const aiOracleAddress = await aiOracleContract.getAddress();
    deployedContracts.aiOracle = aiOracleContract;
    deploymentData.contracts.AIOracle = {
      address: aiOracleAddress,
      deployer: deployerAddress,
      constructorArgs: [coreAddress]
    };
    
    console.log(`  ✅ AIOracle deployed at: ${aiOracleAddress}`);
    console.log(`     Transaction: ${aiOracleContract.deploymentTransaction()?.hash}\n`);

    // 3. Deploy DecentralizedOracleNetwork
    console.log('📦 3. Deploying DecentralizedOracleNetwork...');
    const DecentralizedOracleNetwork = await ethers.getContractFactory('DecentralizedOracleNetwork');
    const oracleNetworkContract = await DecentralizedOracleNetwork.deploy(
      coreAddress,
      {
        gasLimit: config.gasLimit,
        gasPrice: config.gasPrice
      }
    );
    await oracleNetworkContract.waitForDeployment();
    
    const oracleNetworkAddress = await oracleNetworkContract.getAddress();
    deployedContracts.oracleNetwork = oracleNetworkContract;
    deploymentData.contracts.DecentralizedOracleNetwork = {
      address: oracleNetworkAddress,
      deployer: deployerAddress,
      constructorArgs: [coreAddress]
    };
    
    console.log(`  ✅ DecentralizedOracleNetwork deployed at: ${oracleNetworkAddress}`);
    console.log(`     Transaction: ${oracleNetworkContract.deploymentTransaction()?.hash}\n`);

    // 4. Deploy AutomatedDefenseSystem
    console.log('📦 4. Deploying AutomatedDefenseSystem...');
    const AutomatedDefenseSystem = await ethers.getContractFactory('AutomatedDefenseSystem');
    const defenseSystemContract = await AutomatedDefenseSystem.deploy(
      coreAddress,
      aiOracleAddress,
      {
        gasLimit: config.gasLimit,
        gasPrice: config.gasPrice
      }
    );
    await defenseSystemContract.waitForDeployment();
    
    const defenseSystemAddress = await defenseSystemContract.getAddress();
    deployedContracts.defenseSystem = defenseSystemContract;
    deploymentData.contracts.AutomatedDefenseSystem = {
      address: defenseSystemAddress,
      deployer: deployerAddress,
      constructorArgs: [coreAddress, aiOracleAddress]
    };
    
    console.log(`  ✅ AutomatedDefenseSystem deployed at: ${defenseSystemAddress}`);
    console.log(`     Transaction: ${defenseSystemContract.deploymentTransaction()?.hash}\n`);

    // 5. Configure contract permissions and roles
    console.log('⚙️  5. Configuring contract permissions...');
    
    // Grant AI Oracle role to the AIOracle contract
    console.log('  - Granting AI_ORACLE_ROLE to AIOracle contract...');
    await coreContract.registerAIOracle(aiOracleAddress);
    
    // Grant necessary roles for the defense system
    console.log('  - Setting up defense system permissions...');
    const GUARDIAN_ROLE = await coreContract.GUARDIAN_ROLE();
    await coreContract.grantRole(GUARDIAN_ROLE, defenseSystemAddress);
    
    console.log('  ✅ Contract permissions configured\n');

    // 6. Initialize default protection rules (if needed)
    console.log('⚙️  6. Setting up initial configuration...');
    
    // The contracts already have default configurations in their constructors
    // Additional configuration can be added here if needed
    
    console.log('  ✅ Initial configuration complete\n');

    // 7. Verify deployments
    console.log('🔍 7. Verifying deployments...');
    
    const coreStats = await coreContract.getSystemStats();
    console.log(`  - Core contract mode: ${coreStats.mode}`);
    console.log(`  - Core contract address: ${coreAddress}`);
    
    const aiOracleOwner = await aiOracleContract.hasRole(await aiOracleContract.DEFAULT_ADMIN_ROLE(), deployerAddress);
    console.log(`  - AI Oracle admin role: ${aiOracleOwner}`);
    
    console.log('  ✅ All deployments verified\n');

    // 8. Save deployment information
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `${network.name}-deployment.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    
    // Save environment variables file
    const envFile = path.join(process.cwd(), `.env.${network.name}`);
    const envContent = [
      `# PodiumGuard X Smart Contract Addresses - ${network.name}`,
      `ETHEREUM_NETWORK=${network.name}`,
      `CORE_CONTRACT_ADDRESS=${coreAddress}`,
      `AI_ORACLE_ADDRESS=${aiOracleAddress}`,
      `DEFENSE_SYSTEM_ADDRESS=${defenseSystemAddress}`,
      `ORACLE_NETWORK_ADDRESS=${oracleNetworkAddress}`,
      ``,
      `# Contract Configuration`,
      `EMERGENCY_THRESHOLD=${config.emergencyThreshold}`,
      `MIN_STAKE_AMOUNT=${ethers.formatEther(config.minStakeAmount)}`,
      `TREASURY_ADDRESS=${config.treasuryAddress}`,
      ``,
      `# Network Configuration`,
      `CHAIN_ID=${network.chainId}`,
      `DEPLOYMENT_BLOCK=${await ethers.provider.getBlockNumber()}`,
      `DEPLOYER_ADDRESS=${deployerAddress}`
    ].join('\n');
    
    fs.writeFileSync(envFile, envContent);
    
    console.log('💾 Deployment data saved:');
    console.log(`  - Deployment info: ${deploymentFile}`);
    console.log(`  - Environment file: ${envFile}\n`);

    // 9. Display summary
    console.log('🎉 DEPLOYMENT COMPLETE! 🎉\n');
    console.log('📋 Contract Addresses:');
    console.log(`  🏛️  PodiumGuardCore:           ${coreAddress}`);
    console.log(`  🤖 AIOracle:                  ${aiOracleAddress}`);
    console.log(`  🛡️  AutomatedDefenseSystem:    ${defenseSystemAddress}`);
    console.log(`  🌐 DecentralizedOracleNetwork: ${oracleNetworkAddress}\n`);
    
    console.log('🔧 Next Steps:');
    console.log('  1. Update your backend .env file with the new contract addresses');
    console.log('  2. Register AI oracles using the AIOracle contract');
    console.log('  3. Configure protection rules and thresholds as needed');
    console.log('  4. Test the system with the provided test scripts');
    console.log('  5. Consider deploying to testnet first before mainnet\n');
    
    console.log('🚀 Your PodiumGuard X MEV Defense System is ready to protect against attacks!');

    return deploymentData;

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    
    // Save partial deployment data if any contracts were deployed
    if (Object.keys(deploymentData.contracts).length > 0) {
      const failedDeploymentFile = path.join(process.cwd(), 'deployments', `${network.name}-failed-deployment.json`);
      fs.writeFileSync(failedDeploymentFile, JSON.stringify({
        ...deploymentData,
        error: error.message,
        partialDeployment: true
      }, null, 2));
      
      console.log(`💾 Partial deployment data saved to: ${failedDeploymentFile}`);
    }
    
    throw error;
  }
}

// Function to estimate deployment costs
async function estimateDeploymentCosts() {
  console.log('💰 Estimating deployment costs...\n');
  
  const [deployer] = await ethers.getSigners();
  const gasPrice = await ethers.provider.getFeeData();
  
  const contracts = [
    'PodiumGuardCore',
    'AIOracle', 
    'AutomatedDefenseSystem',
    'DecentralizedOracleNetwork'
  ];
  
  let totalGasEstimate = 0;
  
  for (const contractName of contracts) {
    try {
      const ContractFactory = await ethers.getContractFactory(contractName);
      const deploymentData = ContractFactory.getDeployTransaction();
      const gasEstimate = await ethers.provider.estimateGas(deploymentData);
      
      totalGasEstimate += Number(gasEstimate);
      
      console.log(`${contractName}:`);
      console.log(`  Gas estimate: ${gasEstimate.toLocaleString()}`);
      console.log(`  Cost estimate: ${ethers.formatEther(gasEstimate * gasPrice.gasPrice)} ETH\n`);
    } catch (error) {
      console.log(`${contractName}: Could not estimate (${error.message})\n`);
    }
  }
  
  const totalCost = BigInt(totalGasEstimate) * gasPrice.gasPrice;
  console.log(`Total estimated cost: ${ethers.formatEther(totalCost)} ETH`);
  console.log(`At current gas price: ${ethers.formatUnits(gasPrice.gasPrice, 'gwei')} gwei\n`);
}

// Run deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main as deployContracts, estimateDeploymentCosts };