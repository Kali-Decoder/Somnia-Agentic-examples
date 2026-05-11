import hre from "hardhat";

const CONTRACT_ADDRESS = "0x819272339ccc3a7056b57dadfa4871faf1336294" as `0x${string}`;
const REQUEST_ID = 40225n;

async function main() {
  console.log("=== Debug Idea Review ===\n");

  const ideaReview = await hre.viem.getContractAt("IdeaReview", CONTRACT_ADDRESS);
  const publicClient = await hre.viem.getPublicClient();

  // ✅ Chain check
  const chainId = await publicClient.getChainId();
  console.log("🌐 Chain ID:", chainId);

  // ✅ Mapping check
  const review = await ideaReview.read.reviews([REQUEST_ID]);

  console.log("\n📦 Mapping Data:");
  console.log("Idea:", review.idea || "(empty)");
  console.log("Result:", review.result || "(empty)");
  console.log("Completed:", review.completed ?? "(undefined)");

  // 🚨 If idea empty → stop early
  if (!review.idea) {
    console.log("\n❌ CRITICAL: This requestId does NOT exist in this contract");
    console.log("👉 You are using WRONG contract address or network\n");
    process.exit(1);
  }

  // ✅ Safe event scan (last 1000 blocks only)
  console.log("\n🔍 Checking recent events...");

  const currentBlock = await publicClient.getBlockNumber();
  const fromBlock = currentBlock - 900n; // safe range

  const events = await ideaReview.getEvents.IdeaReviewed(
    {},
    {
      fromBlock,
      toBlock: currentBlock,
    }
  );

  console.log(`📊 Events found in last 900 blocks: ${events.length}`);

  const matched = events.find((e) => e.args.requestId === REQUEST_ID);

  if (matched) {
    console.log("\n✅ Found matching event!");
    console.log("Review:", matched.args.review);
  } else {
    console.log("\n⚠️ No event found for this requestId in recent blocks");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});