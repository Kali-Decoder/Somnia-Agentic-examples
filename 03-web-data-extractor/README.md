# 03 — Web Data Extractor

**Agent:** LLM Parse Website
**Methods:** `ExtractString`, `ExtractANumber`
**Difficulty:** Intermediate

## What This Does

Extracts structured data from any website — even JavaScript-rendered pages. Unlike JSON API Request (which needs a clean REST API), this agent uses a real browser to visit pages and an LLM to understand the content.

## When to Use Which Agent

| Need | Agent | Example |
|------|-------|---------|
| Clean JSON API available | JSON API Request | CoinGecko API, weather API |
| No API, need to read a website | **LLM Parse Website** | News sites, leaderboards, wikis |
| Need AI reasoning/decisions | LLM Inference | Sentiment analysis, classification |

## Key Concepts

### 1. Search vs Direct Scrape

**`resolveUrl = true`**: Agent searches the domain for relevant pages:
```solidity
// "Search espn.com for Champions League results"
ExtractString(key, desc, [], prompt, "espn.com", true, 3)
```

**`resolveUrl = false`**: Agent scrapes the exact URL:
```solidity
// "Read this specific page"
ExtractString(key, desc, [], prompt, "https://espn.com/scores/123", false, 1)
```

### 2. ExtractString — Get Text

```solidity
bytes memory payload = abi.encodeWithSelector(
    IParseWebsiteAgent.ExtractString.selector,
    "winner",                          // key
    "Name of the tournament winner",   // description
    new string[](0),                   // options (empty = unconstrained)
    "Who won the 2026 Champions League?", // prompt
    "espn.com",                        // url
    true,                              // resolveUrl: search the domain
    uint8(3)                           // numPages: check up to 3 pages
);
```

### 3. ExtractANumber — Get a Number

```solidity
bytes memory payload = abi.encodeWithSelector(
    IParseWebsiteAgent.ExtractANumber.selector,
    "goals",                           // key
    "Total goals scored in the match", // description
    uint256(0),                        // min (0 = no lower bound)
    uint256(0),                        // max (0 = no upper bound)
    "Total goals in the 2026 Champions League final", // prompt
    "espn.com",
    true,
    uint8(3)
);
```

### 4. How the Agent Processes

```
1. SEARCH  — Find relevant URLs on the domain (if resolveUrl=true)
2. SCRAPE  — Visit pages with a real browser, render JavaScript
3. CONVERT — Convert HTML to clean markdown
4. EXTRACT — LLM reads the markdown and extracts the answer
5. RETURN  — ABI-encoded result sent back on-chain
```

## Run It

```bash
# 1. Deploy
npm run deploy:extractor

# 2. Update CONTRACT_ADDRESS in scripts/invoke.ts

# 3. Invoke
npm run invoke:extractor
```

⚠️ **Note:** This agent takes longer than others (30-90 seconds) because it runs a real browser.

## Files

- `contracts/WebDataExtractor.sol` — Smart contract
- `scripts/deploy.ts` — Deployment script
- `scripts/invoke.ts` — Invoke the agent and listen for response
