import hre from "hardhat";
import { formatUnits } from "viem";

// ⚠️ Replace with your deployed contract address
const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS" as `0x${string}`;

const POLL_INTERVAL = 3000;
const TIMEOUT = 180_000;

async function main() {
  console.log("=== Web Data Extractor — Invoking LLM Parse Website Agent ===\n");

  const extractor = await hre.viem.getContractAt("WebDataExtractor", CONTRACT_ADDRESS);
  const publicClient = await hre.viem.getPublicClient();

  const deposit = await extractor.read.getRequiredDeposit();
  console.log(`Required deposit: ${formatUnits(deposit, 18)} STT`);

  // ──────────────────────────────
  // Example: Extract top crypto from CoinGecko
  // ──────────────────────────────
  console.log("\n🌐 Extracting: Who is the #1 cryptocurrency on CoinGecko?");
  console.log("   The agent will search coingecko.com, read the page, and extract the answer.\n");

  const hash = await extractor.write.whoIsTopCrypto({
    value: deposit,
  });
  console.log(`Transaction: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);

  console.log("\n⏳ Waiting for agent to scrape website and extract data...");
  console.log("   (This agent takes longer because it uses a real browser)\n");

  const fromBlock = receipt.blockNumber;
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT) {
    const successEvents = await extractor.getEvents.StringExtracted({}, { fromBlock });
    if (successEvents.length > 0) {
      for (const event of successEvents) {
        console.log(`✅ Extracted: "${event.args.result}"`);
      }
      process.exit(0);
    }

    const failEvents = await extractor.getEvents.ExtractionFailed({}, { fromBlock });
    if (failEvents.length > 0) {
      for (const event of failEvents) {
        console.log(`❌ Extraction failed: status ${event.args.status}`);
      }
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  console.log("⏰ Timeout — Parse Website agent may take longer than other agents.");
  console.log("   Check the explorer for the result.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
