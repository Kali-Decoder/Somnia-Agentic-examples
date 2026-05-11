import hre from "hardhat";

async function main() {
  console.log("Deploying WebDataExtractor to Somnia Testnet...\n");

  const extractor = await hre.viem.deployContract("WebDataExtractor");

  console.log(`✅ WebDataExtractor deployed at: ${extractor.address}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Copy the contract address above`);
  console.log(`  2. Run: npm run invoke:extractor`);
  console.log(`  3. Check the result on the explorer:`);
  console.log(`     https://shannon-explorer.somnia.network/address/${extractor.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
