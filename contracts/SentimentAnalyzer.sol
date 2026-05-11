// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaAgents.sol";

/// @title SentimentAnalyzer
/// @notice Uses the LLM Inference agent to analyze text sentiment on-chain
/// @dev Demonstrates two LLM methods:
///   - inferString: Get a text classification (bullish/bearish/neutral)
///   - inferNumber: Get a numeric sentiment score (1-100)
///
/// CONCEPT: This contract shows how to use on-chain AI for decision-making.
///   The LLM runs deterministically across validator nodes, so the result
///   is consensus-verified — not just one node's opinion.
///
/// AGENT: LLM Inference (ID: 12847293847561029384)
/// METHODS: inferString, inferNumber

contract SentimentAnalyzer {
    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────

    IAgentRequester public constant PLATFORM =
        IAgentRequester(0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776);

    uint256 public constant LLM_AGENT_ID = 12847293847561029384;

    // ──────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────

    enum AnalysisType { Classification, Score }

    struct Analysis {
        string inputText;
        string classification;  // "bullish", "bearish", or "neutral"
        int256 score;            // 1-100 sentiment score
        AnalysisType analysisType;
        uint256 timestamp;
        bool completed;
    }

    /// @notice All analyses by request ID
    mapping(uint256 => Analysis) public analyses;

    /// @notice Latest classification result
    string public latestClassification;

    /// @notice Latest score result
    int256 public latestScore;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    event ClassificationRequested(uint256 indexed requestId, string text);
    event ClassificationReceived(uint256 indexed requestId, string classification);
    event ScoreRequested(uint256 indexed requestId, string text);
    event ScoreReceived(uint256 indexed requestId, int256 score);
    event AnalysisFailed(uint256 indexed requestId, ResponseStatus status);

    // ──────────────────────────────────────────────
    // Core Functions
    // ──────────────────────────────────────────────

    /// @notice Classify text sentiment as bullish, bearish, or neutral
    /// @dev Uses inferString with allowedValues to constrain the LLM output
    /// @param text The text to analyze (e.g., a tweet, news headline)
    function classifySentiment(string calldata text) external payable returns (uint256 requestId) {
        // Build the prompt
        string memory prompt = string.concat(
            "Analyze the sentiment of the following text about cryptocurrency markets. ",
            "Text: \"", text, "\""
        );

        // Constrain output to exactly these values
        string[] memory allowedValues = new string[](3);
        allowedValues[0] = "bullish";
        allowedValues[1] = "bearish";
        allowedValues[2] = "neutral";

        // Encode the inferString call
        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferString.selector,
            prompt,
            "You are a crypto market sentiment analyst. Classify the sentiment.",
            false,           // chainOfThought — false for speed
            allowedValues    // constrain to bullish/bearish/neutral
        );

        uint256 deposit = PLATFORM.getRequestDeposit();
        require(msg.value >= deposit, "Insufficient deposit");

        requestId = PLATFORM.createRequest{value: deposit}(
            LLM_AGENT_ID,
            address(this),
            this.handleClassification.selector,
            payload
        );

        analyses[requestId] = Analysis({
            inputText: text,
            classification: "",
            score: 0,
            analysisType: AnalysisType.Classification,
            timestamp: block.timestamp,
            completed: false
        });

        emit ClassificationRequested(requestId, text);

        if (msg.value > deposit) {
            payable(msg.sender).transfer(msg.value - deposit);
        }
    }

    /// @notice Get a numeric sentiment score (1-100) for text
    /// @dev Uses inferNumber with min/max bounds — the LLM must return a number in range
    /// @param text The text to score
    function scoreSentiment(string calldata text) external payable returns (uint256 requestId) {
        string memory prompt = string.concat(
            "Rate the sentiment of the following cryptocurrency-related text on a scale of 1-100. ",
            "1 = extremely bearish, 50 = neutral, 100 = extremely bullish. ",
            "Text: \"", text, "\""
        );

        // Encode the inferNumber call
        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferNumber.selector,
            prompt,
            "You are a crypto market sentiment analyst. Return only a number.",
            int256(1),    // minValue
            int256(100),  // maxValue
            false         // chainOfThought
        );

        uint256 deposit = PLATFORM.getRequestDeposit();
        require(msg.value >= deposit, "Insufficient deposit");

        requestId = PLATFORM.createRequest{value: deposit}(
            LLM_AGENT_ID,
            address(this),
            this.handleScore.selector,
            payload
        );

        analyses[requestId] = Analysis({
            inputText: text,
            classification: "",
            score: 0,
            analysisType: AnalysisType.Score,
            timestamp: block.timestamp,
            completed: false
        });

        emit ScoreRequested(requestId, text);

        if (msg.value > deposit) {
            payable(msg.sender).transfer(msg.value - deposit);
        }
    }

    // ──────────────────────────────────────────────
    // Callbacks
    // ──────────────────────────────────────────────

    function handleClassification(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        require(msg.sender == address(PLATFORM), "Only platform");

        if (status == ResponseStatus.Success && responses.length > 0) {
            string memory result = abi.decode(responses[0].result, (string));
            analyses[requestId].classification = result;
            analyses[requestId].completed = true;
            latestClassification = result;
            emit ClassificationReceived(requestId, result);
        } else {
            emit AnalysisFailed(requestId, status);
        }
    }

    function handleScore(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        require(msg.sender == address(PLATFORM), "Only platform");

        if (status == ResponseStatus.Success && responses.length > 0) {
            int256 result = abi.decode(responses[0].result, (int256));
            analyses[requestId].score = result;
            analyses[requestId].completed = true;
            latestScore = result;
            emit ScoreReceived(requestId, result);
        } else {
            emit AnalysisFailed(requestId, status);
        }
    }

    // ──────────────────────────────────────────────
    // View Helpers
    // ──────────────────────────────────────────────

    function getAnalysis(uint256 requestId) external view returns (Analysis memory) {
        return analyses[requestId];
    }

    function getRequiredDeposit() external view returns (uint256) {
        return PLATFORM.getRequestDeposit();
    }

    receive() external payable {}
}
