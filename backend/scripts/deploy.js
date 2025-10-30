const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying PodiumGuardDefense contract...");

  // Get the contract factory
  const PodiumGuardDefense = await ethers.getContractFactory("PodiumGuardDefense");
  
  // Deploy the contract
  const podiumGuard = await PodiumGuardDefense.deploy();
  
  // Wait for deployment
  await podiumGuard.waitForDeployment();
  
  const contractAddress = await podiumGuard.getAddress();
  console.log("PodiumGuardDefense deployed to:", contractAddress);
  
  // Verify deployment
  console.log("Contract deployed successfully!");
  console.log("Transaction hash:", podiumGuard.deploymentTransaction().hash);
  
  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    address: contractAddress,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    txHash: podiumGuard.deploymentTransaction().hash
  };
  
  fs.writeFileSync(
    `deployments/${hre.network.name}.json`, 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`Deployment info saved to deployments/${hre.network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });