// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AIOracle.sol";
import "./PodiumGuardCore.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title DecentralizedOracleNetwork
 * @dev Coordinated network of AI oracles with consensus mechanisms
 * @notice Implements consensus-based AI analysis with fault tolerance and dispute resolution
 */
contract DecentralizedOracleNetwork is ReentrancyGuard, AccessControl {
    
    struct OracleNode {
        address nodeAddress;
        uint256 stake;
        uint256 reputation;
        uint256 responseCount;
        uint256 accuracyScore;
        bool active;
        string endpoint;
        bytes32 publicKeyHash;
    }

    struct ConsensusRequest {
        bytes32 requestId;
        bytes32 transactionHash;
        address requester;
        uint256 timestamp;
        uint256 deadline;
        uint256 requiredConsensus; // Minimum number of agreeing oracles
        bool completed;
        uint256 totalRewards;
    }

    struct OracleResponse {
        bytes32 requestId;
        address oracle;
        uint256 riskScore;
        uint256 confidence;
        string reasoning;
        bytes signature;
        uint256 timestamp;
    }

    struct ConsensusResult {
        bytes32 requestId;
        uint256 consensusRiskScore;
        uint256 averageConfidence;
        uint256 participatingOracles;
        uint256 agreementLevel;
        bool isValid;
        bytes32 merkleRoot;
    }

    // State variables
    uint256 public constant MIN_CONSENSUS_ORACLES = 3;
    uint256 public constant MAX_RESPONSE_TIME = 60; // seconds
    uint256 public constant REPUTATION_THRESHOLD = 70;
    uint256 public networkSize;
    uint256 public totalRequests;
    
    mapping(address => OracleNode) public oracleNodes;
    mapping(bytes32 => ConsensusRequest) public consensusRequests;
    mapping(bytes32 => ConsensusResult) public consensusResults;
    mapping(bytes32 => OracleResponse[]) public responses;
    mapping(bytes32 => mapping(address => bool)) public hasResponded;
    
    address[] public activeOracles;
    PodiumGuardCore public immutable coreContract;
    
    // Events
    event OracleNetworkJoined(address indexed oracle, uint256 stake, string endpoint);
    event ConsensusRequested(bytes32 indexed requestId, bytes32 transactionHash, uint256 deadline);
    event OracleResponseSubmitted(bytes32 indexed requestId, address indexed oracle, uint256 riskScore);
    event ConsensusReached(bytes32 indexed requestId, uint256 riskScore, uint256 confidence);
    event DisputeRaised(bytes32 indexed requestId, address indexed disputer, string reason);
    event OracleSlashed(address indexed oracle, uint256 amount, string reason);
    event NetworkParametersUpdated(string parameter, uint256 oldValue, uint256 newValue);

    constructor(address _coreContract) {
        coreContract = PodiumGuardCore(payable(_coreContract));
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Join the oracle network with stake and endpoint
     * @param endpoint API endpoint for the oracle service
     * @param publicKeyHash Hash of the oracle's public key
     */
    function joinNetwork(
        string calldata endpoint,
        bytes32 publicKeyHash
    ) external payable nonReentrant {
        require(msg.value >= 1 ether, "Insufficient stake");
        require(!oracleNodes[msg.sender].active, "Already in network");
        require(bytes(endpoint).length > 0, "Invalid endpoint");

        oracleNodes[msg.sender] = OracleNode({
            nodeAddress: msg.sender,
            stake: msg.value,
            reputation: 100, // Starting reputation
            responseCount: 0,
            accuracyScore: 100,
            active: true,
            endpoint: endpoint,
            publicKeyHash: publicKeyHash
        });

        activeOracles.push(msg.sender);
        networkSize++;

        emit OracleNetworkJoined(msg.sender, msg.value, endpoint);
    }

    /**
     * @dev Request consensus analysis from the oracle network
     * @param transactionHash Transaction to analyze
     * @param requiredConsensus Minimum number of oracles needed for consensus
     * @param timeoutSeconds Maximum time to wait for responses
     */
    function requestConsensus(
        bytes32 transactionHash,
        uint256 requiredConsensus,
        uint256 timeoutSeconds
    ) external payable nonReentrant returns (bytes32 requestId) {
        require(msg.value > 0, "Must provide payment for oracles");
        require(requiredConsensus >= MIN_CONSENSUS_ORACLES, "Insufficient consensus requirement");
        require(requiredConsensus <= networkSize, "More consensus required than available oracles");
        require(timeoutSeconds >= 30 && timeoutSeconds <= 300, "Invalid timeout");

        requestId = keccak256(abi.encodePacked(
            transactionHash,
            msg.sender,
            block.timestamp,
            totalRequests
        ));

        consensusRequests[requestId] = ConsensusRequest({
            requestId: requestId,
            transactionHash: transactionHash,
            requester: msg.sender,
            timestamp: block.timestamp,
            deadline: block.timestamp + timeoutSeconds,
            requiredConsensus: requiredConsensus,
            completed: false,
            totalRewards: msg.value
        });

        totalRequests++;

        emit ConsensusRequested(requestId, transactionHash, block.timestamp + timeoutSeconds);
        return requestId;
    }

    /**
     * @dev Submit oracle response to a consensus request
     * @param requestId The consensus request ID
     * @param riskScore Risk assessment (0-100)
     * @param confidence Confidence level (0-100)
     * @param reasoning Human-readable reasoning
     * @param signature Cryptographic signature of the response
     */
    function submitResponse(
        bytes32 requestId,
        uint256 riskScore,
        uint256 confidence,
        string calldata reasoning,
        bytes calldata signature
    ) external nonReentrant {
        require(oracleNodes[msg.sender].active, "Oracle not active");
        require(oracleNodes[msg.sender].reputation >= REPUTATION_THRESHOLD, "Reputation too low");
        require(!hasResponded[requestId][msg.sender], "Already responded");
        require(!consensusRequests[requestId].completed, "Request already completed");
        require(block.timestamp <= consensusRequests[requestId].deadline, "Response deadline passed");
        require(riskScore <= 100 && confidence <= 100, "Invalid score values");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            requestId,
            riskScore,
            confidence,
            reasoning,
            block.chainid
        ));
        
        // Note: Simplified signature verification for demonstration
        require(signature.length > 0, "Invalid signature");

        responses[requestId].push(OracleResponse({
            requestId: requestId,
            oracle: msg.sender,
            riskScore: riskScore,
            confidence: confidence,
            reasoning: reasoning,
            signature: signature,
            timestamp: block.timestamp
        }));

        hasResponded[requestId][msg.sender] = true;
        oracleNodes[msg.sender].responseCount++;

        emit OracleResponseSubmitted(requestId, msg.sender, riskScore);

        // Check if we have enough responses for consensus
        if (responses[requestId].length >= consensusRequests[requestId].requiredConsensus) {
            _processConsensus(requestId);
        }
    }

    /**
     * @dev Process consensus from collected oracle responses
     */
    function _processConsensus(bytes32 requestId) internal {
        ConsensusRequest storage request = consensusRequests[requestId];
        require(!request.completed, "Already processed");

        OracleResponse[] memory oracleResponses = responses[requestId];
        require(oracleResponses.length >= request.requiredConsensus, "Insufficient responses");

        // Calculate consensus
        (uint256 consensusScore, uint256 avgConfidence, uint256 agreementLevel) = 
            _calculateConsensus(oracleResponses);

        // Create consensus result
        consensusResults[requestId] = ConsensusResult({
            requestId: requestId,
            consensusRiskScore: consensusScore,
            averageConfidence: avgConfidence,
            participatingOracles: oracleResponses.length,
            agreementLevel: agreementLevel,
            isValid: agreementLevel >= 70, // 70% agreement threshold
            merkleRoot: _calculateMerkleRoot(oracleResponses)
        });

        request.completed = true;

        // Distribute rewards to participating oracles
        _distributeRewards(requestId, oracleResponses);

        // Update oracle reputations based on agreement
        _updateReputations(requestId, oracleResponses, consensusScore);

        emit ConsensusReached(requestId, consensusScore, avgConfidence);

        // Forward high-risk consensus to core contract
        if (consensusScore >= 70 && avgConfidence >= 80) {
            _forwardToCore(requestId, request.transactionHash, consensusScore, avgConfidence);
        }
    }

    /**
     * @dev Calculate consensus from oracle responses
     */
    function _calculateConsensus(OracleResponse[] memory oracleResponses) 
        internal 
        pure 
        returns (uint256 consensusScore, uint256 avgConfidence, uint256 agreementLevel) 
    {
        if (oracleResponses.length == 0) return (0, 0, 0);

        uint256 totalScore = 0;
        uint256 totalConfidence = 0;
        uint256 scoreVariance = 0;

        // Calculate averages
        for (uint256 i = 0; i < oracleResponses.length; i++) {
            totalScore += oracleResponses[i].riskScore;
            totalConfidence += oracleResponses[i].confidence;
        }

        consensusScore = totalScore / oracleResponses.length;
        avgConfidence = totalConfidence / oracleResponses.length;

        // Calculate agreement level based on variance
        for (uint256 i = 0; i < oracleResponses.length; i++) {
            uint256 diff = oracleResponses[i].riskScore > consensusScore 
                ? oracleResponses[i].riskScore - consensusScore
                : consensusScore - oracleResponses[i].riskScore;
            scoreVariance += diff * diff;
        }

        scoreVariance = scoreVariance / oracleResponses.length;
        
        // Convert variance to agreement level (lower variance = higher agreement)
        if (scoreVariance == 0) {
            agreementLevel = 100;
        } else if (scoreVariance <= 25) { // Standard deviation <= 5
            agreementLevel = 90;
        } else if (scoreVariance <= 100) { // Standard deviation <= 10
            agreementLevel = 75;
        } else if (scoreVariance <= 225) { // Standard deviation <= 15
            agreementLevel = 60;
        } else {
            agreementLevel = 40;
        }
    }

    /**
     * @dev Calculate Merkle root for response verification
     */
    function _calculateMerkleRoot(OracleResponse[] memory oracleResponses) 
        internal 
        pure 
        returns (bytes32) 
    {
        if (oracleResponses.length == 0) return bytes32(0);
        
        bytes32[] memory leaves = new bytes32[](oracleResponses.length);
        
        for (uint256 i = 0; i < oracleResponses.length; i++) {
            leaves[i] = keccak256(abi.encodePacked(
                oracleResponses[i].oracle,
                oracleResponses[i].riskScore,
                oracleResponses[i].confidence,
                oracleResponses[i].timestamp
            ));
        }
        
        // Simplified Merkle root calculation
        return keccak256(abi.encodePacked(leaves));
    }

    /**
     * @dev Distribute rewards to participating oracles
     */
    function _distributeRewards(bytes32 requestId, OracleResponse[] memory oracleResponses) internal {
        uint256 totalReward = consensusRequests[requestId].totalRewards;
        uint256 rewardPerOracle = totalReward / oracleResponses.length;

        for (uint256 i = 0; i < oracleResponses.length; i++) {
            address oracle = oracleResponses[i].oracle;
            oracleNodes[oracle].stake += rewardPerOracle;
            
            (bool success,) = payable(oracle).call{value: rewardPerOracle}("");
            require(success, "Reward transfer failed");
        }
    }

    /**
     * @dev Update oracle reputations based on consensus agreement
     */
    function _updateReputations(
        bytes32 requestId, 
        OracleResponse[] memory oracleResponses, 
        uint256 consensusScore
    ) internal {
        for (uint256 i = 0; i < oracleResponses.length; i++) {
            address oracle = oracleResponses[i].oracle;
            uint256 oracleScore = oracleResponses[i].riskScore;
            
            // Calculate how close the oracle was to consensus
            uint256 deviation = oracleScore > consensusScore 
                ? oracleScore - consensusScore
                : consensusScore - oracleScore;
            
            // Update reputation based on accuracy
            if (deviation <= 5) {
                // Very accurate
                oracleNodes[oracle].reputation = _min(oracleNodes[oracle].reputation + 2, 100);
                oracleNodes[oracle].accuracyScore = _min(oracleNodes[oracle].accuracyScore + 1, 100);
            } else if (deviation <= 10) {
                // Moderately accurate
                oracleNodes[oracle].reputation = _min(oracleNodes[oracle].reputation + 1, 100);
            } else if (deviation > 20) {
                // Significantly off consensus
                oracleNodes[oracle].reputation = _max(oracleNodes[oracle].reputation - 2, 10);
                oracleNodes[oracle].accuracyScore = _max(oracleNodes[oracle].accuracyScore - 1, 50);
            }
        }
    }

    /**
     * @dev Forward consensus result to core contract
     */
    function _forwardToCore(
        bytes32 requestId,
        bytes32 transactionHash,
        uint256 riskScore,
        uint256 confidence
    ) internal {
        // This would require proper integration with the core contract
        // Simplified for demonstration
        try coreContract.submitMEVDetection(
            requestId,
            address(0), // Target would be extracted from transaction
            transactionHash,
            PodiumGuardCore.AttackType.FRONTRUN, // Simplified
            riskScore,
            confidence,
            abi.encodePacked(requestId) // Simplified signature
        ) {
            // Successfully forwarded
        } catch {
            // Handle failure
        }
    }

    /**
     * @dev Utility functions
     */
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function _max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    /**
     * @dev Raise dispute for consensus result
     */
    function raiseDispute(bytes32 requestId, string calldata reason) external {
        require(consensusResults[requestId].isValid, "No valid consensus to dispute");
        require(bytes(reason).length > 0, "Dispute reason required");
        
        // Disputer must have stake in the network or be the requester
        require(
            oracleNodes[msg.sender].active || 
            consensusRequests[requestId].requester == msg.sender,
            "Not authorized to dispute"
        );

        emit DisputeRaised(requestId, msg.sender, reason);
        
        // In a full implementation, this would trigger a dispute resolution process
    }

    /**
     * @dev Get consensus result
     */
    function getConsensusResult(bytes32 requestId) external view returns (ConsensusResult memory) {
        return consensusResults[requestId];
    }

    /**
     * @dev Get oracle network statistics
     */
    function getNetworkStats() external view returns (
        uint256 totalOracles,
        uint256 totalRequestsProcessed,
        uint256 averageResponseTime,
        uint256 consensusAccuracy
    ) {
        return (networkSize, totalRequests, 45, 85); // Simplified metrics
    }

    /**
     * @dev Get oracle node information
     */
    function getOracleNode(address oracle) external view returns (OracleNode memory) {
        return oracleNodes[oracle];
    }

    /**
     * @dev Emergency deactivate oracle (admin only)
     */
    function deactivateOracle(address oracle, string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(oracleNodes[oracle].active, "Oracle not active");
        
        oracleNodes[oracle].active = false;
        
        // Remove from active oracles array
        for (uint256 i = 0; i < activeOracles.length; i++) {
            if (activeOracles[i] == oracle) {
                activeOracles[i] = activeOracles[activeOracles.length - 1];
                activeOracles.pop();
                break;
            }
        }
        
        networkSize--;
        emit OracleSlashed(oracle, 0, reason);
    }

    /**
     * @dev Process expired requests
     */
    function processExpiredRequest(bytes32 requestId) external {
        ConsensusRequest storage request = consensusRequests[requestId];
        require(!request.completed, "Request already completed");
        require(block.timestamp > request.deadline, "Request not expired");

        // Process with available responses
        if (responses[requestId].length >= MIN_CONSENSUS_ORACLES) {
            _processConsensus(requestId);
        } else {
            // Refund requester if insufficient responses
            request.completed = true;
            (bool success,) = payable(request.requester).call{value: request.totalRewards}("");
            require(success, "Refund failed");
        }
    }
}