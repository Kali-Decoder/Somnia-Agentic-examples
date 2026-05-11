# 01 — Price Oracle

**Agent:** JSON API Request
**Method:** `fetchUint(url, selector, decimals)`
**Difficulty:** Beginner

## What This Does

Fetches live cryptocurrency prices from CoinGecko and stores them on-chain. This is the simplest Somnia Agent pattern — call an API, get data, put it on-chain.

## How It Works

```
Your Contract                    Somnia Platform                  Validators
     │                                │                               │
     │  createRequest(payload)        │                               │
     │  + deposit (STT)               │                               │
     ├───────────────────────────────►│                               │
     │                                │  RequestCreated event         │
     │                                ├──────────────────────────────►│
     │                                │                               │
     │                                │     fetch CoinGecko API       │
     │                                │     reach consensus           │
     │                                │                               │
     │  handleResponse(result)        │◄──────────────────────────────┤
     │◄───────────────────────────────┤                               │
     │                                │                               │
     │  + rebate (unused deposit)     │                               │
     │◄───────────────────────────────┤                               │
```

## Key Concepts

### 1. Payload Encoding
The request payload is ABI-encoded. For `fetchUint`, we encode: URL + JSON selector + decimal places.

```solidity
bytes memory payload = abi.encodeWithSelector(
    IJsonApiAgent.fetchUint.selector,
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    "bitcoin.usd",  // JSON path selector
    uint8(8)         // 8 decimal places
);
```

### 2. Decimal Scaling
Blockchains don't support floats. `decimals=8` means the price is multiplied by 10^8:
- `42000.50` → `4200050000000`
- `0.00001234` → `1234`

### 3. Deposit & Rebate
You send a deposit with `createRequest`. Unused funds are rebated after execution.

```solidity
uint256 deposit = PLATFORM.getRequestDeposit();
PLATFORM.createRequest{value: deposit}(agentId, callback, selector, payload);
```

### 4. Callback
The platform calls your `handleResponse` function when validators reach consensus.

## Run It

```bash
# 1. Deploy the contract
npm run deploy:oracle

# 2. Update CONTRACT_ADDRESS in scripts/invoke.ts

# 3. Invoke the agent
npm run invoke:oracle
```

## Available Methods

| Function | What It Does |
|----------|-------------|
| `requestBtcPrice()` | Fetch BTC/USD price |
| `requestEthPrice()` | Fetch ETH/USD price |
| `requestPrice(coinId)` | Fetch any CoinGecko-listed token price |

## Files

- `contracts/PriceOracle.sol` — Smart contract
- `scripts/deploy.ts` — Deployment script
- `scripts/invoke.ts` — Invoke the agent and listen for response
