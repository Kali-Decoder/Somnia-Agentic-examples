import hre from "hardhat";

async function main() {
  console.log("Deploying SentimentAnalyzer to Somnia Testnet...\n");

  const analyzer = await hre.viem.deployContract("SentimentAnalyzer");

  console.log(`✅ SentimentAnalyzer deployed at: ${analyzer.address}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Copy the contract address above`);
  console.log(`  2. Run: npm run invoke:sentiment`);
  console.log(`  3. Check the result on the explorer:`);
  console.log(`     https://shannon-explorer.somnia.network/address/${analyzer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
