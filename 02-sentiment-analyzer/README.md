# 02 — Sentiment Analyzer

**Agent:** LLM Inference
**Methods:** `inferString`, `inferNumber`
**Difficulty:** Intermediate

## What This Does

Uses on-chain AI to analyze text sentiment. Demonstrates two LLM methods:
1. **Classification** — Constrain the LLM to return exactly "bullish", "bearish", or "neutral"
2. **Scoring** — Get a numeric score from 1 to 100

The LLM runs deterministically across multiple validator nodes. They reach consensus on the output, making it trustworthy for on-chain use.

## Key Concepts

### 1. inferString with Allowed Values
Constrain the LLM to return one of a predefined set of values:

```solidity
string[] memory allowedValues = new string[](3);
allowedValues[0] = "bullish";
allowedValues[1] = "bearish";
allowedValues[2] = "neutral";

bytes memory payload = abi.encodeWithSelector(
    ILLMAgent.inferString.selector,
    prompt,
    systemPrompt,
    false,           // chainOfThought
    allowedValues    // LLM MUST return one of these
);
```

### 2. inferNumber with Range
Force the LLM to return a number within a range:

```solidity
bytes memory payload = abi.encodeWithSelector(
    ILLMAgent.inferNumber.selector,
    prompt,
    systemPrompt,
    int256(1),    // min
    int256(100),  // max
    false         // chainOfThought
);
```

### 3. Multiple Callbacks
Use different callback functions for different response types:

```solidity
// Classification → string callback
PLATFORM.createRequest{value: deposit}(
    LLM_AGENT_ID, address(this),
    this.handleClassification.selector,  // ← string decoder
    classificationPayload
);

// Score → int256 callback
PLATFORM.createRequest{value: deposit}(
    LLM_AGENT_ID, address(this),
    this.handleScore.selector,           // ← int256 decoder
    scorePayload
);
```

### 4. Deterministic AI
The same prompt produces the same output across all validator nodes. This is how consensus works — if all validators agree on the result, it's accepted.

## Run It

```bash
# 1. Deploy
npm run deploy:sentiment

# 2. Update CONTRACT_ADDRESS in scripts/invoke.ts

# 3. Invoke (sends both classification and score requests)
npm run invoke:sentiment
```

## Files

- `contracts/SentimentAnalyzer.sol` — Smart contract
- `scripts/deploy.ts` — Deployment script
- `scripts/invoke.ts` — Invoke both methods and listen for responses
