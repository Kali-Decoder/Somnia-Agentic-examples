# Somnia Agents — Templates & Example Projects

Hands-on templates and example projects for building with Somnia AI Agents.  
This repository acts as a complete starter kit for building **agentic applications on Somnia**, covering all currently available Somnia agents with practical examples, minimal smart contracts, and invocation scripts.

Whether you're building AI-powered dApps, autonomous workflows, governance tooling, or intelligent on-chain applications, these templates help you get started quickly.

> **Explore agents interactively:** https://agents.testnet.somnia.network/  
> **Full documentation:** https://metaversal.gitbook.io/agents/s8KLL5NzoS6LwJVIQCiT

---

## Included Example Projects

| # | Project | Agent Type | What You'll Learn |
|---|---------|-------------|-------------------|
| 01 | **Price Oracle** | JSON API Request | Fetch API data on-chain, decimal scaling, callback patterns |
| 02 | **Sentiment Analyzer** | LLM Inference | AI reasoning, constrained outputs, numeric inference |
| 03 | **Web Data Extractor** | LLM Parse Website | AI-powered scraping and structured extraction |
| 04 | **Idea Review** | LLM Inference | AI evaluation flows and startup/project analysis |
| 05 | **DAO Proposal Review** | LLM Inference | Governance proposal summarization and review |

---

## Repository Structure

```bash
somnia-agents-examples/
├── 01-price-oracle/
├── 02-sentiment-analyzer/
├── 03-web-data-extractor/
├── 04-idea-review/
├── 05-dao-proposal-review/
├── contracts/
│   ├── interfaces/
│   │   └── ISomniaAgents.sol
│   ├── PriceOracle.sol
│   ├── SentimentAnalyzer.sol
│   └── WebDataExtractor.sol
├── hardhat.config.ts
├── package.json
└── README.md
```

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- Wallet with STT (Somnia Testnet Token)

---

## Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/SomniaDevs/somnia-agents-examples.git

cd somnia-agents-examples

npm install
```

Configure your wallet:

```bash
cp .env.example .env
```

Add your private key inside `.env`.

Compile all contracts:

```bash
npm run compile
```

---

## Run an Example

### Deploy Price Oracle

```bash
npm run deploy:oracle
```

### Invoke Contract

Update deployed contract address inside:

```bash
01-price-oracle/scripts/invoke.ts
```

Then run:

```bash
npm run invoke:oracle
```

---

## How Somnia Agents Work

```text
┌─────────────┐       ┌──────────────────┐       ┌────────────────┐
│ Your Smart  │       │  Somnia Agents   │       │   Validator    │
│  Contract   │──────►│    Platform      │──────►│    Network     │
│             │       │                  │       │                │
│             │◄──────│  (consensus +    │◄──────│  (execute +    │
│             │       │   callback)      │       │   agree)       │
└─────────────┘       └──────────────────┘       └────────────────┘
```

1. Your contract sends a request with ABI-encoded payload + STT deposit  
2. Validators execute the agent independently  
3. Consensus is reached across validators  
4. The platform calls your contract callback with the result  
5. Unused deposit gets refunded  

---

## Available Somnia Agents

| Agent | ID | Methods | Use Case |
|-------|----|---------|----------|
| **JSON API Request** | `13174292974160097713` | `fetchString`, `fetchUint`, `fetchInt`, `fetchBool`, `fetchStringArray`, `fetchUintArray` | Fetch data from APIs |
| **LLM Inference** | `12847293847561029384` | `inferString`, `inferNumber`, `inferChat`, `inferToolsChat` | AI reasoning and decisions |
| **LLM Parse Website** | `12875401142070969085` | `ExtractString`, `ExtractANumber` | Extract and scrape website data |

---

## Network Information

| Property | Value |
|----------|-------|
| Network | Somnia Testnet |
| Chain ID | `50312` |
| RPC | `https://api.infra.testnet.somnia.network` |
| Explorer | https://shannon-explorer.somnia.network |
| Platform Contract | `0x7407cb35a17D511D1Bd32dD726ADb8D5344ECbE3` |
| Agent Registry | `0x08D1Fc808f1983d2Ea7B63a28ECD4d8C885Cd02A` |

---

## Deposits & Budget

Some agents (especially **LLM Inference**) may require a higher deposit than the minimum returned by `getRequestDeposit()`.

If you receive `insufficient_budget` receipts, send additional STT while invoking the request.

You can also use:

```bash
SOMNIA_DEPOSIT_BUFFER_STT=0.30 npm run invoke:idea-review
```

Unused funds are automatically refunded.

---

## Goal of This Repository

This repository is designed to become a complete open-source template collection for:

- AI-powered dApps on Somnia
- Agentic workflows
- Governance automation
- On-chain AI integrations
- Intelligent smart contracts
- Rapid prototyping with Somnia Agents

Contributions, improvements, and new agent examples are welcome 🚀