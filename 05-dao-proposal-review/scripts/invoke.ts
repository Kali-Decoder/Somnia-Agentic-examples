import hre from "hardhat";
import { formatUnits } from "viem";

// ⚠️ Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x341d9ACEd0BA649960eB6D392De75226BBe01f62" as `0x${string}`;

const POLL_INTERVAL = 3000;
const TIMEOUT = 180_000;

async function main() {
  console.log("=== DAO Proposal Filter — LLM Agent ===\n");

  const contract = await hre.viem.getContractAt(
    "DAOProposalFilter",
    CONTRACT_ADDRESS
  );

  const publicClient = await hre.viem.getPublicClient();

  // 💰 Get deposit
  const deposit = await contract.read.getRequiredDeposit();
  console.log(`Required deposit: ${formatUnits(deposit, 18)} STT`);

  // 🧠 Example proposal
  const proposal =
    "Allocate 20% of the DAO treasury to a new growth fund managed by a single wallet address (0x742d35Cc6634C0532925a3b844Bc454e4438f44e). The purpose of this fund is to aggressively market the protocol through influencer partnerships and paid campaigns. Funds will be controlled by the wallet owner, who will decide allocation strategies without requiring further DAO votes in order to act quickly in competitive markets. While this introduces some centralization, it is necessary to ensure rapid expansion and market dominance.";

  console.log("\n📨 Evaluating proposal:");
  console.log(`"${proposal}"\n`);

  // 🚀 Send request
  const hash = await contract.write.evaluateProposal([proposal], {
    value: deposit,
  });

  console.log(`Transaction: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);

  // 🔥 Extract requestId
  const submittedEvents = await contract.getEvents.ProposalSubmitted(
    {},
    {
      fromBlock: receipt.blockNumber - 5n,
      toBlock: receipt.blockNumber,
    }
  );

  let requestId: bigint | null = null;

  const matched = submittedEvents.find(
    (e) => e.transactionHash === hash
  );

  if (!matched) {
    console.log("❌ Could not find requestId");
  } else {
    requestId = matched.args.requestId;
    console.log(`🆔 Request ID: ${requestId}`);
  }

  console.log("\n⏳ Waiting for AI evaluation...\n");

  const fromBlock = receipt.blockNumber - 5n;
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT) {
    // ✅ Success event
    const successEvents = await contract.getEvents.ProposalEvaluated(
      {},
      { fromBlock }
    );

    if (successEvents.length > 0) {
      for (const event of successEvents) {
        console.log(
          `✅ [${event.args.requestId}] Result: "${event.args.result}"`
        );
      }
      process.exit(0);
    }

    // ❌ Failure event
    const failEvents = await contract.getEvents.ProposalFailed(
      {},
      { fromBlock }
    );

    if (failEvents.length > 0) {
      for (const event of failEvents) {
        console.log(
          `❌ [${event.args.requestId}] Failed: status ${event.args.status}`
        );
      }
      process.exit(1);
    }

    console.log("⏳ Still processing...");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  console.log("⏰ Timeout — agent may take longer.");
  console.log("Check explorer for result.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});