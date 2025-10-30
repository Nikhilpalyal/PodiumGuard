const hre = require("hardhat");

async function main() {
  const PodiumGuardCoreAddr = "0x0000000000000000000000000000000000000000"; // placeholder

  const Defense = await hre.ethers.getContractFactory("CrossChainMEVDefense");
  const defense = await Defense.deploy(PodiumGuardCoreAddr);

  await defense.waitForDeployment();
  console.log("✅ CrossChainMEVDefense deployed at:", defense.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
