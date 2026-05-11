import hre from "hardhat";
import { formatUnits } from "viem";

// ⚠️ Replace with your deployed contract address
const CONTRACT_ADDRESS = "0xecf77b168b531b9d70955cf3051ffef095c33350" as `0x${string}`;

const POLL_INTERVAL = 2000;
const TIMEOUT = 120_000;

async function main() {
  console.log("=== Sentiment Analyzer — Invoking LLM Inference Agent ===\n");

  const analyzer = await hre.viem.getContractAt("SentimentAnalyzer", CONTRACT_ADDRESS);
  const publicClient = await hre.viem.getPublicClient();

  const deposit = await analyzer.read.getRequiredDeposit();
  console.log(`Required deposit: ${formatUnits(deposit, 18)} STT`);

  // ──────────────────────────────
  // Example 1: Classification
  // ──────────────────────────────
  const sampleText = "Bitcoin just broke its all-time high! Institutional adoption is accelerating.";

  console.log(`\n📝 Analyzing: "${sampleText}"`);
  console.log("\n🔤 Test 1: Classification (bullish/bearish/neutral)...");

  const classifyHash = await analyzer.write.classifySentiment([sampleText], {
    value: deposit,
  });
  console.log(`Transaction: ${classifyHash}`);

  const classifyReceipt = await publicClient.waitForTransactionReceipt({ hash: classifyHash });
  console.log(`Confirmed in block ${classifyReceipt.blockNumber}`);

  // ──────────────────────────────
  // Example 2: Score
  // ──────────────────────────────
  console.log("\n🔢 Test 2: Numeric score (1-100)...");

  const scoreHash = await analyzer.write.scoreSentiment([sampleText], {
    value: deposit,
  });
  console.log(`Transaction: ${scoreHash}`);

  const scoreReceipt = await publicClient.waitForTransactionReceipt({ hash: scoreHash });
  console.log(`Confirmed in block ${scoreReceipt.blockNumber}`);

  // ──────────────────────────────
  // Poll for results
  // ──────────────────────────────
  console.log("\n⏳ Waiting for agent responses...\n");

  const fromBlock = classifyReceipt.blockNumber;
  const startTime = Date.now();
  let classificationDone = false;
  let scoreDone = false;

  while (Date.now() - startTime < TIMEOUT) {
    if (!classificationDone) {
      const classEvents = await analyzer.getEvents.ClassificationReceived({}, { fromBlock });
      if (classEvents.length > 0) {
        for (const event of classEvents) {
          console.log(`✅ Classification result: ${event.args.classification}`);
        }
        classificationDone = true;
      }
    }

    if (!scoreDone) {
      const scoreEvents = await analyzer.getEvents.ScoreReceived({}, { fromBlock });
      if (scoreEvents.length > 0) {
        for (const event of scoreEvents) {
          console.log(`✅ Sentiment score: ${event.args.score}/100`);
        }
        scoreDone = true;
      }
    }

    const failEvents = await analyzer.getEvents.AnalysisFailed({}, { fromBlock });
    if (failEvents.length > 0) {
      for (const event of failEvents) {
        console.log(`❌ Analysis failed for request ${event.args.requestId}: status ${event.args.status}`);
      }
    }

    if (classificationDone && scoreDone) {
      console.log("\n🎉 Both analyses complete!");
      process.exit(0);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  const results = [classificationDone ? "classification" : null, scoreDone ? "score" : null].filter(Boolean);
  console.log(`\n⏰ Timeout. Received: ${results.length > 0 ? results.join(", ") : "none"}`);
  process.exit(results.length === 2 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
