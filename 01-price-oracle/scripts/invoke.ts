import hre from "hardhat";
import { formatUnits } from "viem";

// ⚠️ Replace with your deployed contract address
const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS" as `0x${string}`;

const POLL_INTERVAL = 2000;
const TIMEOUT = 120_000;

async function main() {
  console.log("=== Price Oracle — Invoking JSON API Request Agent ===\n");

  const oracle = await hre.viem.getContractAt("PriceOracle", CONTRACT_ADDRESS);
  const publicClient = await hre.viem.getPublicClient();

  // Step 1: Check required deposit
  const deposit = await oracle.read.getRequiredDeposit();
  console.log(`Required deposit: ${formatUnits(deposit, 18)} STT`);

  // Step 2: Request Bitcoin price
  console.log("\n📡 Requesting BTC price from CoinGecko via agent...");

  const hash = await oracle.write.requestBtcPrice({
    value: deposit,
  });
  console.log(`Transaction hash: ${hash}`);

  // Step 3: Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  const fromBlock = receipt.blockNumber;

  // Step 4: Poll for the agent callback
  console.log("\n⏳ Waiting for agent response (this may take 10-60 seconds)...");
  console.log("   Validators are executing the agent and reaching consensus.\n");

  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT) {
    const successEvents = await oracle.getEvents.PriceReceived({}, { fromBlock });
    if (successEvents.length > 0) {
      for (const event of successEvents) {
        const price = event.args.price!;
        const wholePart = price / BigInt(1e8);
        const decimalPart = price % BigInt(1e8);
        console.log(`✅ Price received!`);
        console.log(`   BTC/USD: $${wholePart}.${decimalPart.toString().padStart(8, "0")}`);
        console.log(`   Raw value (8 decimals): ${price}`);
      }
      process.exit(0);
    }

    const failEvents = await oracle.getEvents.RequestFailed({}, { fromBlock });
    if (failEvents.length > 0) {
      for (const event of failEvents) {
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
