import hardhat from "hardhat";

const { ethers } = hardhat;

async function main() {
  const TrustLend = await ethers.getContractFactory("TrustLend");
  const trustLend = await TrustLend.deploy();
  await trustLend.waitForDeployment();

  console.log(`TrustLend deployed to ${await trustLend.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
