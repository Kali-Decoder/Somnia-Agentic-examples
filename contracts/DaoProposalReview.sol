// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaAgents.sol";

contract DAOProposalFilter {
    IAgentRequester public constant PLATFORM =
        IAgentRequester(0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776);

    uint256 public constant LLM_AGENT_ID = 12847293847561029384; // from explorer

    mapping(uint256 => bool) public pendingRequests;
    mapping(uint256 => string) public results;

    event ProposalSubmitted(uint256 requestId, string proposal);
    event ProposalEvaluated(uint256 requestId, string result);
    event ProposalFailed(uint256 requestId, ResponseStatus status);

    // 🧠 Submit proposal for AI evaluation
    function evaluateProposal(string calldata proposal)
        external
        payable
        returns (uint256 requestId)
    {
        // Allowed outputs
        string[] memory  allowedValues = new string[](4);
        allowedValues[0] = "SAFE";
        allowedValues[1] = "SPAM";
        allowedValues[2] = "HARMFUL";
        allowedValues[3] = "DUPLICATE";

        // Prompt
        string memory prompt = string.concat(
            "Classify this DAO proposal into one of the following categories: SAFE, SPAM, HARMFUL, DUPLICATE.\n\nProposal: ",
            proposal
        );

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferString.selector,
            prompt,
            "You are a strict DAO governance moderator.",
            false, 
            allowedValues
        );

        uint256 deposit = PLATFORM.getRequestDeposit();
        require(msg.value >= deposit, "Insufficient deposit");

        requestId = PLATFORM.createRequest{value: deposit}(
            LLM_AGENT_ID,
            address(this),
            this.handleResponse.selector,
            payload
        );

        pendingRequests[requestId] = true;

        emit ProposalSubmitted(requestId, proposal);

        // refund extra
        if (msg.value > deposit) {
            payable(msg.sender).transfer(msg.value - deposit);
        }
    }

    // 🔁 Callback
    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        require(msg.sender == address(PLATFORM), "Only platform");
        require(pendingRequests[requestId], "Invalid request");

        delete pendingRequests[requestId];

        if (status != ResponseStatus.Success || responses.length == 0) {
            emit ProposalFailed(requestId, status);
            return;
        }

        string memory result = abi.decode(responses[0].result, (string));
        results[requestId] = result;

        emit ProposalEvaluated(requestId, result);
    }

    function getRequiredDeposit() external view returns (uint256) {
        return PLATFORM.getRequestDeposit();
    }

    receive() external payable {}
}