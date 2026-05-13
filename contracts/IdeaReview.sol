// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaAgents.sol";

contract IdeaReview {
    IAgentRequester public constant PLATFORM =
        IAgentRequester(0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776);

    uint256 public constant LLM_AGENT_ID = 12847293847561029384;
    uint256 public constant SUBCOMMITTEE_SIZE = 3;
    // Hardcoded platform deposit (0.12 STT, 18 decimals)
    uint256 public constant REQUEST_DEPOSIT = 12e16;

    struct Review {
        string idea;
        string result;
        bool completed;
        uint256 timestamp;
    }

    mapping(uint256 => Review) public reviews;

    /// 🔥 NEW: track latest review
    string public latestReview;

    event IdeaRequested(uint256 indexed requestId, string idea);
    event IdeaReviewed(uint256 indexed requestId, string review);
    event IdeaFailed(uint256 indexed requestId, ResponseStatus status);

    function reviewIdea(string calldata idea) external payable returns (uint256 requestId) {
        string memory prompt = string.concat(
            "Critique this startup idea. Be honest and brutal. Format: \n",
            "Summary: [1 sentence]\n",
            "Strengths: [Bullet points]\n",
            "Weaknesses: [Bullet points]\n",
            "Score: [X/10]\n\n",
            "Idea: ", idea
        );

        string[] memory noConstraints = new string[](0);

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferString.selector,
            prompt,
            "You are a sophisticated VC investor. Provide structured feedback.",
            false,
            noConstraints
        );

        uint256 deposit = REQUEST_DEPOSIT;
        require(msg.value >= deposit, "Insufficient deposit");

        requestId = PLATFORM.createRequest{value: deposit}(
            LLM_AGENT_ID,
            address(this),
            this.handleReview.selector,
            payload
        );

        reviews[requestId] = Review({
            idea: idea,
            result: "",
            completed: false,
            timestamp: block.timestamp
        });

        emit IdeaRequested(requestId, idea);

        if (msg.value > deposit) {
            payable(msg.sender).transfer(msg.value - deposit);
        }
    }

    function handleReview(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        require(msg.sender == address(PLATFORM), "Only platform");

        if (status == ResponseStatus.Success && responses.length > 0) {
            string memory result = abi.decode(responses[0].result, (string));

            reviews[requestId].result = result;
            reviews[requestId].completed = true;

            /// 🔥 NEW: store latest
            latestReview = result;

            emit IdeaReviewed(requestId, result);
        } else {
            emit IdeaFailed(requestId, status);
        }
    }

    // ──────────────────────────────
    // 🔥 NEW VIEW HELPERS
    // ──────────────────────────────

    /// @notice Get full review struct
    function getReview(uint256 requestId) external view returns (Review memory) {
        return reviews[requestId];
    }

    /// @notice Get only result string
    function getResult(uint256 requestId) external view returns (string memory) {
        return reviews[requestId].result;
    }

    /// @notice Check if review completed
    function isCompleted(uint256 requestId) external view returns (bool) {
        return reviews[requestId].completed;
    }

    function getRequiredDeposit() external pure returns (uint256) {
        return REQUEST_DEPOSIT;
    }

    receive() external payable {}
}
