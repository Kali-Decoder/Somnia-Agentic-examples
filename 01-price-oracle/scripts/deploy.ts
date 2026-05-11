import hre from "hardhat";

async function main() {
  console.log("Deploying PriceOracle to Somnia Testnet...\n");

  const oracle = await hre.viem.deployContract("PriceOracle");

  console.log(`✅ PriceOracle deployed at: ${oracle.address}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Copy the contract address above`);
  console.log(`  2. Run: npm run invoke:oracle`);
  console.log(`  3. Check the result on the explorer:`);
  console.log(`     https://shannon-explorer.somnia.network/address/${oracle.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
