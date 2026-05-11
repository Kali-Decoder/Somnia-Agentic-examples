// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaAgents.sol";

/// @title PriceOracle
/// @notice Fetches live cryptocurrency prices using the JSON API Request agent
/// @dev Uses the fetchUint method to get prices with decimal scaling
///
/// CONCEPT: This contract demonstrates the simplest Somnia Agent pattern:
///   1. Encode a request payload (which API to call, what data to extract)
///   2. Send it to the platform with a deposit
///   3. Receive the result via callback when validators reach consensus
///
/// AGENT: JSON API Request (ID: 13174292974160097713)
/// METHOD: fetchUint(url, selector, decimals) → uint256

contract PriceOracle {
    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────

    IAgentRequester public constant PLATFORM =
        IAgentRequester(0x7407cb35a17D511D1Bd32dD726ADb8D5344ECbE3);

    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;

    // ──────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────

    /// @notice Latest price fetched (scaled by 10^8, e.g., 42000.50 → 4200050000000)
    uint256 public latestPrice;

    /// @notice Timestamp of last update
    uint256 public lastUpdatedAt;

    /// @notice Track which requests are pending
    mapping(uint256 => bool) public pendingRequests;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    event PriceRequested(uint256 indexed requestId, string url, string selector);
    event PriceReceived(uint256 indexed requestId, uint256 price);
    event RequestFailed(uint256 indexed requestId, ResponseStatus status);

    // ──────────────────────────────────────────────
    // Core Functions
    // ──────────────────────────────────────────────

    /// @notice Request the current Bitcoin price from CoinGecko
    /// @return requestId The ID to track this request
    function requestBtcPrice() external payable returns (uint256 requestId) {
        return _requestPrice(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
            "bitcoin.usd"
        );
    }

    /// @notice Request the current Ethereum price from CoinGecko
    /// @return requestId The ID to track this request
    function requestEthPrice() external payable returns (uint256 requestId) {
        return _requestPrice(
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
            "ethereum.usd"
        );
    }

    /// @notice Request a price from any CoinGecko-supported token
    /// @param coinId The CoinGecko coin ID (e.g., "solana", "cardano")
    /// @return requestId The ID to track this request
    function requestPrice(string calldata coinId) external payable returns (uint256 requestId) {
        string memory url = string.concat(
            "https://api.coingecko.com/api/v3/simple/price?ids=",
            coinId,
            "&vs_currencies=usd"
        );
        string memory selector = string.concat(coinId, ".usd");

        return _requestPrice(url, selector);
    }

    // ──────────────────────────────────────────────
    // Internal
    // ──────────────────────────────────────────────

    function _requestPrice(
        string memory url,
        string memory selector
    ) internal returns (uint256 requestId) {
        // Step 1: Encode the agent payload
        // We use fetchUint with 8 decimals to convert the float price to uint256
        bytes memory payload = abi.encodeWithSelector(
            IJsonApiAgent.fetchUint.selector,
            url,
            selector,
            uint8(8) // 8 decimal places (like most price feeds)
        );

        // Step 2: Get the required deposit and send the request
        uint256 deposit = PLATFORM.getRequestDeposit();
        require(msg.value >= deposit, "Insufficient deposit");

        requestId = PLATFORM.createRequest{value: deposit}(
            JSON_API_AGENT_ID,
            address(this),                  // callback to this contract
            this.handleResponse.selector,   // callback function
            payload
        );

        pendingRequests[requestId] = true;
        emit PriceRequested(requestId, url, selector);

        // Refund excess ETH
        if (msg.value > deposit) {
            payable(msg.sender).transfer(msg.value - deposit);
        }
    }

    // ──────────────────────────────────────────────
    // Callback (called by the platform)
    // ──────────────────────────────────────────────

    /// @notice Called by the platform when validators reach consensus
    /// @dev This is the callback function — the platform calls it automatically
    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        // Security: only the platform can call this
        require(msg.sender == address(PLATFORM), "Only platform");
        require(pendingRequests[requestId], "Unknown request");

        delete pendingRequests[requestId];

        if (status == ResponseStatus.Success && responses.length > 0) {
            // Decode the uint256 result from the first successful response
            latestPrice = abi.decode(responses[0].result, (uint256));
            lastUpdatedAt = block.timestamp;
            emit PriceReceived(requestId, latestPrice);
        } else {
            emit RequestFailed(requestId, status);
        }
    }

    // ──────────────────────────────────────────────
    // View Helpers
    // ──────────────────────────────────────────────

    /// @notice Get the human-readable price (e.g., "42000.50000000")
    /// @return wholePart The integer part of the price
    /// @return decimalPart The fractional part (8 decimals)
    function getFormattedPrice() external view returns (uint256 wholePart, uint256 decimalPart) {
        wholePart = latestPrice / 1e8;
        decimalPart = latestPrice % 1e8;
    }

    /// @notice Check how much deposit is needed to make a request
    function getRequiredDeposit() external view returns (uint256) {
        return PLATFORM.getRequestDeposit();
    }

    // Accept rebates from the platform
    receive() external payable {}
}
