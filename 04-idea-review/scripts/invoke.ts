import hre from "hardhat";
import { formatUnits, parseUnits } from "viem";
import readline from "readline";

const CONTRACT_ADDRESS = "0x9214610cfbeb2296690bb84c4d425f1dbc1de030" as `0x${string}`;
const POLL_INTERVAL = 3000;
const TIMEOUT = 600_000;

// ──────────────────────────────
// 🧠 Input helper
// ──────────────────────────────
function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// ──────────────────────────────
// 🚀 Invoke Idea
// ──────────────────────────────
async function invokeIdea(idea: string) {
  const ideaReview = await hre.viem.getContractAt("IdeaReview", CONTRACT_ADDRESS);
  const publicClient = await hre.viem.getPublicClient();

  const baseDeposit = await ideaReview.read.getRequiredDeposit();
  const buffer = parseUnits(process.env.SOMNIA_DEPOSIT_BUFFER_STT ?? "0", 18);
  const deposit = baseDeposit + buffer;
  console.log(
    `💰 Deposit: ${formatUnits(deposit, 18)} STT` +
      (buffer > 0n ? ` (base ${formatUnits(baseDeposit, 18)} + buffer ${formatUnits(buffer, 18)})` : "")
  );

  console.log("\n📡 Sending request...");
  const hash = await ideaReview.write.reviewIdea([idea], {
    value: deposit,
  });

  console.log(`🔗 Tx: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

  // 🔥 Extract requestId safely
  const events = await ideaReview.getEvents.IdeaRequested(
    {},
    {
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    }
  );

  const matched = events.find((e) => e.transactionHash === hash);
  if (!matched) throw new Error("❌ requestId not found");

  const requestId = matched.args.requestId;
  console.log(`🆔 Request ID: ${requestId}`);

  // 🔥 Poll result
  console.log("\n⏳ Waiting for result...\n");

  const start = Date.now();

  while (Date.now() - start < TIMEOUT) {
    const completed = await ideaReview.read.isCompleted([requestId]);

    if (completed) {
      const result = await ideaReview.read.getResult([requestId]);

      console.log("\n📝 RESULT:");
      console.log("────────────────────────");
      console.log(result);
      console.log("────────────────────────");
      return;
    }

    console.log("⏳ Still processing...");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  console.log("\n⏰ Timeout — use fetch with requestId:", requestId);
}

// ──────────────────────────────
// 📦 Fetch Full Review
// ──────────────────────────────
async function fetchReview(requestId: bigint) {
  const ideaReview = await hre.viem.getContractAt("IdeaReview", CONTRACT_ADDRESS);

  const review = await ideaReview.read.getReview([requestId]);

  console.log(`\n🆔 Request ID: ${requestId}`);
  console.log("────────────────────────");

  console.log("💡 Idea:", review.idea || "(empty)");
  console.log("📅 Timestamp:", review.timestamp);

  if (review.completed) {
    console.log("\n📝 Result:");
    console.log(review.result);
  } else {
    console.log("\n⏳ Still processing...");
  }

  console.log("────────────────────────\n");
}

// ──────────────────────────────
// 📄 Get Only Result
// ──────────────────────────────
async function getResult(requestId: bigint) {
  const ideaReview = await hre.viem.getContractAt("IdeaReview", CONTRACT_ADDRESS);

  const result = await ideaReview.read.getResult([requestId]);
  console.log(`\n📝 Result:\n${result || "(empty)"}`);
}

// ──────────────────────────────
// ✅ Check Status
// ──────────────────────────────
async function checkStatus(requestId: bigint) {
  const ideaReview = await hre.viem.getContractAt("IdeaReview", CONTRACT_ADDRESS);

  const completed = await ideaReview.read.isCompleted([requestId]);
  console.log(`\n📊 Status: ${completed ? "✅ Completed" : "⏳ Pending"}`);
}

// ──────────────────────────────
// 💰 Get Deposit
// ──────────────────────────────
async function getDeposit() {
  const ideaReview = await hre.viem.getContractAt("IdeaReview", CONTRACT_ADDRESS);

  const baseDeposit = await ideaReview.read.getRequiredDeposit();
  const buffer = parseUnits(process.env.SOMNIA_DEPOSIT_BUFFER_STT ?? "0", 18);
  const deposit = baseDeposit + buffer;
  console.log(`\n💰 Required Deposit: ${formatUnits(deposit, 18)} STT`);
  if (buffer > 0n) {
    console.log(
      `   (base ${formatUnits(baseDeposit, 18)} + buffer ${formatUnits(buffer, 18)}; env SOMNIA_DEPOSIT_BUFFER_STT)`
    );
  }
}

// ──────────────────────────────
// 🎯 CLI Controller
// ──────────────────────────────
async function main() {
  console.log("\n=== IdeaReview CLI ===\n");

  let action = process.argv[2];

  if (!action) {
    action = await ask(
      "Choose action:\n1 = invoke\n2 = fetch\n3 = result\n4 = status\n5 = deposit\n> "
    );
  }

  if (action === "1" || action === "invoke") {
    const idea =
      process.argv[3] ||
      (await ask("\nEnter your startup idea:\n> "));
    await invokeIdea(idea);

  } else if (action === "2" || action === "fetch") {
    const idInput =
      process.argv[3] ||
      (await ask("\nEnter requestId:\n> "));
    await fetchReview(BigInt(idInput));

  } else if (action === "3" || action === "result") {
    const idInput =
      process.argv[3] ||
      (await ask("\nEnter requestId:\n> "));
    await getResult(BigInt(idInput));

  } else if (action === "4" || action === "status") {
    const idInput =
      process.argv[3] ||
      (await ask("\nEnter requestId:\n> "));
    await checkStatus(BigInt(idInput));

  } else if (action === "5" || action === "deposit") {
    await getDeposit();

  } else {
    console.log("❌ Invalid option");
  }
}

main().catch(console.error);
