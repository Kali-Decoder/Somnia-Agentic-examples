import hre from "hardhat";

async function main() {
  console.log("Deploying Idea Review to Somnia Testnet...\n");

  const ideaReview = await hre.viem.deployContract("IdeaReview");

  console.log(`✅ Idea Review deployed at: ${ideaReview.address}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Copy the contract address above`);
  console.log(`  2. Run: npm run invoke:idea-review`);
  console.log(`  3. Check the result on the explorer:`);
  console.log(`     https://shannon-explorer.somnia.network/address/${ideaReview.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
