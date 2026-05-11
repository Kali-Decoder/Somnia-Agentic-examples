import { ethers } from "hardhat";

async function main() {
  console.log("Deploying DAO Proposal Filter to Somnia Testnet...\n");

  const DAOFilter = await ethers.getContractFactory("DAOProposalFilter");
  const daoFilter = await DAOFilter.deploy();

  await daoFilter.waitForDeployment();

  const address = await daoFilter.getAddress();

  console.log(`✅ DAO Proposal Filter deployed at: ${address}`);

  console.log(`\nNext steps:`);
  console.log(`  1. Copy the contract address above`);
  console.log(`  2. Run test script to submit proposal`);
  console.log(`  3. Check on explorer:`);
  console.log(
    `     https://shannon-explorer.somnia.network/address/${address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});