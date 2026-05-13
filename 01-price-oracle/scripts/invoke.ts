import hre from "hardhat";
import { formatUnits } from "viem";

// ⚠️ Replace with your deployed contract address
const CONTRACT_ADDRESS = "0xd3899fe302b149e6130b56d6843e04c22b169adf" as `0x${string}`;

const POLL_INTERVAL = 2000;
const TIMEOUT = 120_000;

async function main() {
  console.log("=== Price Oracle — Invoking JSON API Request Agent ===\n");

  const oracle = await hre.viem.getContractAt("PriceOracle", CONTRACT_ADDRESS);
  const publicClient = await hre.viem.getPublicClient();

  const arg = "sol";
  const coin =
    arg === "btc" || arg === "bitcoin"
      ? "btc"
      : arg === "eth" || arg === "ethereum"
        ? "eth"
        : arg === "sol" || arg === "solana"
          ? "sol"
          : arg === "somnia" || arg === "stt"
            ? "somnia"
            : "btc";

  // Step 1: Check required deposit
  const deposit = await oracle.read.getRequiredDeposit();
  console.log(`Required deposit: ${formatUnits(deposit, 18)} STT`);

  // Step 2: Request Bitcoin price
  console.log(`\n📡 Requesting ${coin.toUpperCase()} price from CoinGecko via agent...`);

  const hash =
    coin === "eth"
      ? await oracle.write.requestEthPrice({ value: deposit })
      : coin === "sol"
        ? await oracle.write.requestSolPrice({ value: deposit })
        : coin === "somnia"
          ? await oracle.write.requestSomniaPrice({ value: deposit })
          : await oracle.write.requestBtcPrice({ value: deposit });
  console.log(`Transaction hash: ${hash}`);

  // Step 3: Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  const fromBlock = receipt.blockNumber;

  // Extract the request / subscription id from the PriceRequested event (emitted in the same tx)
  let requestId: bigint | undefined;
  try {
    const requestedEvents = await oracle.getEvents.PriceRequested(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    const requestedEvent =
      requestedEvents.find((e) => e.transactionHash === hash) ?? requestedEvents[0];
    requestId = requestedEvent?.args.requestId;
  } catch {
    // Best-effort: event querying can fail on some RPCs; polling below still works without requestId.
  }

  if (requestId !== undefined) {
    console.log(`Request / subscription id: ${requestId}`);
  }

  // Step 4: Poll for the agent callback
  console.log("\n⏳ Waiting for agent response (this may take 10-60 seconds)...");
  console.log("   Validators are executing the agent and reaching consensus.\n");

  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT) {
    const successEvents = await oracle.getEvents.PriceReceived(
      requestId !== undefined ? { requestId } : {},
      { fromBlock }
    );
    if (successEvents.length > 0) {
      for (const event of successEvents) {
        const price = event.args.price!;
        const wholePart = price / BigInt(1e8);
        const decimalPart = price % BigInt(1e8);
        console.log(`✅ Price received!`);
        console.log(`   Request / subscription id: ${event.args.requestId}`);
        console.log(
          `   ${coin.toUpperCase()}/USD: $${wholePart}.${decimalPart.toString().padStart(8, "0")}`
        );
        console.log(`   Raw value (8 decimals): ${price}`);
      }
      process.exit(0);
    }

    const failEvents = await oracle.getEvents.RequestFailed(
      requestId !== undefined ? { requestId } : {},
      { fromBlock }
    );
    if (failEvents.length > 0) {
      for (const event of failEvents) {
        console.log(`Request / subscription id: ${event.args.requestId}`);
        console.log(`❌ Request failed with status: ${event.args.status}`);
      }
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  console.log("⏰ Timeout — no response received after 2 minutes.");
  console.log("   Check the explorer for the request status.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
