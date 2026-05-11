// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaAgents.sol";

/// @title WebDataExtractor
/// @notice Extracts structured data from websites using the LLM Parse Website agent
/// @dev Demonstrates how AI can scrape and parse web pages for on-chain use.
///   Unlike JSON API Request (which needs structured API endpoints),
///   this agent can read any website — even JavaScript-rendered pages.
///
/// CONCEPT: The agent visits websites with a real browser, converts HTML to
///   markdown, then uses an LLM to extract the specific data you need.
///   Great for data that doesn't have a clean API.
///
/// AGENT: LLM Parse Website (ID: 12875401142070969085)
/// METHODS: ExtractString, ExtractANumber

contract WebDataExtractor {
    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────

    IAgentRequester public constant PLATFORM =
        IAgentRequester(0x7407cb35a17D511D1Bd32dD726ADb8D5344ECbE3);

    uint256 public constant PARSE_WEBSITE_AGENT_ID = 12875401142070969085;

    // ──────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────

    struct Extraction {
        string query;
        string stringResult;
        uint256 numberResult;
        bool isNumber;
        uint256 timestamp;
        bool completed;
    }

    mapping(uint256 => Extraction) public extractions;

    string public latestStringResult;
    uint256 public latestNumberResult;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    event ExtractionRequested(uint256 indexed requestId, string prompt, string url);
    event StringExtracted(uint256 indexed requestId, string result);
    event NumberExtracted(uint256 indexed requestId, uint256 result);
    event ExtractionFailed(uint256 indexed requestId, ResponseStatus status);

    // ──────────────────────────────────────────────
    // Core Functions
    // ──────────────────────────────────────────────

    /// @notice Extract a text answer from a website
    /// @dev Uses ExtractString — the agent searches the domain, reads pages, and extracts the answer
    /// @param key A short key for the field (e.g., "winner")
    /// @param description What to extract (e.g., "Name of the tournament winner")
    /// @param prompt Search/extraction prompt (e.g., "Who won the 2026 Champions League?")
    /// @param url Domain to search (e.g., "espn.com") or direct URL
    /// @param resolveUrl true = search the domain, false = scrape the URL directly
    function extractString(
        string calldata key,
        string calldata description,
        string calldata prompt,
        string calldata url,
        bool resolveUrl
    ) external payable returns (uint256 requestId) {
        // Empty options array = unconstrained output
        string[] memory options = new string[](0);

        bytes memory payload = abi.encodeWithSelector(
            IParseWebsiteAgent.ExtractString.selector,
            key,
            description,
            options,
            prompt,
            url,
            resolveUrl,
            uint8(3)  // numPages: fetch up to 3 pages for context
        );

        uint256 deposit = PLATFORM.getRequestDeposit();
        require(msg.value >= deposit, "Insufficient deposit");

        requestId = PLATFORM.createRequest{value: deposit}(
            PARSE_WEBSITE_AGENT_ID,
            address(this),
            this.handleStringResponse.selector,
            payload
        );

        extractions[requestId] = Extraction({
            query: prompt,
            stringResult: "",
            numberResult: 0,
            isNumber: false,
            timestamp: block.timestamp,
            completed: false
        });

        emit ExtractionRequested(requestId, prompt, url);

        if (msg.value > deposit) {
            payable(msg.sender).transfer(msg.value - deposit);
        }
    }

    /// @notice Extract a number from a website
    /// @dev Uses ExtractANumber — same search+scrape flow but returns uint256
    /// @param key A short key for the field (e.g., "market_cap")
    /// @param description What to extract (e.g., "Current market cap in billions")
    /// @param prompt Search/extraction prompt
    /// @param url Domain or direct URL
    /// @param resolveUrl true = search domain, false = scrape directly
    function extractNumber(
        string calldata key,
        string calldata description,
        string calldata prompt,
        string calldata url,
        bool resolveUrl
    ) external payable returns (uint256 requestId) {
        bytes memory payload = abi.encodeWithSelector(
            IParseWebsiteAgent.ExtractANumber.selector,
            key,
            description,
            uint256(0),  // min (0 = no bound)
            uint256(0),  // max (0 = no bound)
            prompt,
            url,
            resolveUrl,
            uint8(3)
        );

        uint256 deposit = PLATFORM.getRequestDeposit();
        require(msg.value >= deposit, "Insufficient deposit");

        requestId = PLATFORM.createRequest{value: deposit}(
            PARSE_WEBSITE_AGENT_ID,
            address(this),
            this.handleNumberResponse.selector,
            payload
        );

        extractions[requestId] = Extraction({
            query: prompt,
            stringResult: "",
            numberResult: 0,
            isNumber: true,
            timestamp: block.timestamp,
            completed: false
        });

        emit ExtractionRequested(requestId, prompt, url);

        if (msg.value > deposit) {
            payable(msg.sender).transfer(msg.value - deposit);
        }
    }

    // ──────────────────────────────────────────────
    // Example convenience functions
    // ──────────────────────────────────────────────

    /// @notice Quick example: Who is the current #1 on CoinGecko?
    function whoIsTopCrypto() external payable returns (uint256) {
        string[] memory options = new string[](0);

        bytes memory payload = abi.encodeWithSelector(
            IParseWebsiteAgent.ExtractString.selector,
            "top_crypto",
            "Name of the cryptocurrency ranked #1 by market cap",
            options,
            "Top cryptocurrency by market cap ranking",
            "coingecko.com",
            true,      // search the domain
            uint8(2)
        );

        uint256 deposit = PLATFORM.getRequestDeposit();
        require(msg.value >= deposit, "Insufficient deposit");

        return PLATFORM.createRequest{value: deposit}(
            PARSE_WEBSITE_AGENT_ID,
            address(this),
            this.handleStringResponse.selector,
            payload
        );
    }

    // ──────────────────────────────────────────────
    // Callbacks
    // ──────────────────────────────────────────────

    function handleStringResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        require(msg.sender == address(PLATFORM), "Only platform");

        if (status == ResponseStatus.Success && responses.length > 0) {
            string memory result = abi.decode(responses[0].result, (string));
            extractions[requestId].stringResult = result;
            extractions[requestId].completed = true;
            latestStringResult = result;
            emit StringExtracted(requestId, result);
        } else {
            emit ExtractionFailed(requestId, status);
        }
    }

    function handleNumberResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        require(msg.sender == address(PLATFORM), "Only platform");

        if (status == ResponseStatus.Success && responses.length > 0) {
            uint256 result = abi.decode(responses[0].result, (uint256));
            extractions[requestId].numberResult = result;
            extractions[requestId].completed = true;
            latestNumberResult = result;
            emit NumberExtracted(requestId, result);
        } else {
            emit ExtractionFailed(requestId, status);
        }
    }

    // ──────────────────────────────────────────────
    // View
    // ──────────────────────────────────────────────

    function getExtraction(uint256 requestId) external view returns (Extraction memory) {
        return extractions[requestId];
    }

    function getRequiredDeposit() external view returns (uint256) {
        return PLATFORM.getRequestDeposit();
    }

    receive() external payable {}
}
