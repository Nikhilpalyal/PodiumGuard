// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PodiumGuardCore.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AIOracle
 * @dev Secure bridge between AI analysis and blockchain execution
 * @notice Handles cryptographic verification of AI analysis results
 */
contract AIOracle is ReentrancyGuard, AccessControl {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Oracle configuration
    struct OracleConfig {
        address oracleAddress;
        bytes32 publicKeyHash;
        uint256 reputation;
        uint256 totalSubmissions;
        uint256 accurateSubmissions;
        bool active;
        uint256 stake;
    }

    struct AIAnalysis {
        bytes32 analysisId;
        bytes32 transactionHash;
        uint256 riskScore;
        uint256 confidence;
        string modelVersion;
        bytes32 dataHash;
        uint256 timestamp;
        address oracle;
        bytes signature;
        bool verified;
    }

    struct BatchAnalysis {
        bytes32 batchId;
        bytes32[] transactionHashes;
        uint256[] riskScores;
        uint256[] confidences;
        bytes32 merkleRoot;
        uint256 timestamp;
        address oracle;
        bytes signature;
    }

    // State variables
    PodiumGuardCore public immutable coreContract;
    uint256 public constant MIN_ORACLE_STAKE = 1 ether;
    uint256 public constant MIN_CONFIDENCE_THRESHOLD = 80;
    uint256 public oracleCount;
    
    mapping(address => OracleConfig) public oracles;
    mapping(bytes32 => AIAnalysis) public analyses;
    mapping(bytes32 => BatchAnalysis) public batchAnalyses;
    mapping(bytes32 => bool) public processedTransactions;
    
    // Events
    event OracleRegistered(address indexed oracle, uint256 stake, bytes32 publicKeyHash);
    event AnalysisSubmitted(bytes32 indexed analysisId, address indexed oracle, uint256 riskScore);
    event BatchAnalysisSubmitted(bytes32 indexed batchId, address indexed oracle, uint256 count);
    event AnalysisVerified(bytes32 indexed analysisId, bool accurate);
    event OracleSlashed(address indexed oracle, uint256 amount, string reason);

    constructor(address _coreContract) {
        // PodiumGuardCore may have a payable fallback; cast address to payable when converting
        coreContract = PodiumGuardCore(payable(_coreContract));
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register as an AI oracle with stake and public key
     * @param publicKeyHash Hash of the oracle's public key for verification
     */
    function registerOracle(bytes32 publicKeyHash) external payable {
        require(msg.value >= MIN_ORACLE_STAKE, "Insufficient stake");
        require(!oracles[msg.sender].active, "Oracle already registered");
        require(publicKeyHash != bytes32(0), "Invalid public key hash");

        oracles[msg.sender] = OracleConfig({
            oracleAddress: msg.sender,
            publicKeyHash: publicKeyHash,
            reputation: 100,
            totalSubmissions: 0,
            accurateSubmissions: 0,
            active: true,
            stake: msg.value
        });

        oracleCount++;
        emit OracleRegistered(msg.sender, msg.value, publicKeyHash);
    }

    /**
     * @dev Submit AI analysis with cryptographic proof
     * @param analysisId Unique identifier for this analysis
     * @param transactionHash Hash of the analyzed transaction
     * @param riskScore AI-calculated risk score (0-100)
     * @param confidence Confidence level of the analysis (0-100)
     * @param modelVersion Version of the AI model used
     * @param inputDataHash Hash of the input data used for analysis
     * @param signature Cryptographic signature of the analysis
     */
    function submitAnalysis(
        bytes32 analysisId,
        bytes32 transactionHash,
        uint256 riskScore,
        uint256 confidence,
        string calldata modelVersion,
        bytes32 inputDataHash,
        bytes calldata signature
    ) external nonReentrant {
        require(oracles[msg.sender].active, "Oracle not registered or inactive");
        require(riskScore <= 100, "Invalid risk score");
        require(confidence >= MIN_CONFIDENCE_THRESHOLD, "Confidence too low");
        require(analyses[analysisId].analysisId == bytes32(0), "Analysis already exists");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            analysisId,
            transactionHash,
            riskScore,
            confidence,
            modelVersion,
            inputDataHash,
            block.chainid
        ));
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == msg.sender, "Invalid signature");

        // Store analysis
        analyses[analysisId] = AIAnalysis({
            analysisId: analysisId,
            transactionHash: transactionHash,
            riskScore: riskScore,
            confidence: confidence,
            modelVersion: modelVersion,
            dataHash: inputDataHash,
            timestamp: block.timestamp,
            oracle: msg.sender,
            signature: signature,
            verified: false
        });

        // Update oracle stats
        oracles[msg.sender].totalSubmissions++;

        // Forward to core contract if high risk
        if (riskScore >= 70) {
            _forwardToCoreContract(analysisId, transactionHash, riskScore, confidence);
        }

        emit AnalysisSubmitted(analysisId, msg.sender, riskScore);
    }

    /**
     * @dev Submit batch analysis for efficiency
     * @param batchId Unique identifier for this batch
     * @param transactionHashes Array of transaction hashes
     * @param riskScores Array of risk scores
     * @param confidences Array of confidence levels
     * @param merkleRoot Merkle root of the batch data
     * @param signature Cryptographic signature of the batch
     */
    function submitBatchAnalysis(
        bytes32 batchId,
        bytes32[] calldata transactionHashes,
        uint256[] calldata riskScores,
        uint256[] calldata confidences,
        bytes32 merkleRoot,
        bytes calldata signature
    ) external nonReentrant {
        require(oracles[msg.sender].active, "Oracle not registered or inactive");
        require(transactionHashes.length == riskScores.length, "Array length mismatch");
        require(riskScores.length == confidences.length, "Array length mismatch");
        require(transactionHashes.length <= 100, "Batch too large");

        // Verify batch signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            batchId,
            merkleRoot,
            transactionHashes.length,
            block.chainid
        ));
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == msg.sender, "Invalid batch signature");

        // Store batch analysis
        batchAnalyses[batchId] = BatchAnalysis({
            batchId: batchId,
            transactionHashes: transactionHashes,
            riskScores: riskScores,
            confidences: confidences,
            merkleRoot: merkleRoot,
            timestamp: block.timestamp,
            oracle: msg.sender,
            signature: signature
        });

        // Process high-risk transactions
        for (uint256 i = 0; i < transactionHashes.length; i++) {
            if (riskScores[i] >= 70 && confidences[i] >= MIN_CONFIDENCE_THRESHOLD) {
                bytes32 individualId = keccak256(abi.encodePacked(batchId, i));
                _forwardToCoreContract(individualId, transactionHashes[i], riskScores[i], confidences[i]);
            }
        }

        oracles[msg.sender].totalSubmissions += transactionHashes.length;
        emit BatchAnalysisSubmitted(batchId, msg.sender, transactionHashes.length);
    }

    /**
     * @dev Forward high-risk analysis to core contract
     */
    function _forwardToCoreContract(
        bytes32 analysisId,
        bytes32 transactionHash,
        uint256 riskScore,
        uint256 confidence
    ) internal {
        // Convert risk score to attack type (simplified logic)
        PodiumGuardCore.AttackType attackType = _determineAttackType(riskScore);
        
        // Create signature for core contract
        bytes32 messageHash = keccak256(abi.encodePacked(
            analysisId,
            address(0), // Will be determined by core contract
            transactionHash,
            uint256(attackType),
            riskScore,
            confidence
        ));
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        // Note: In a real implementation, this would require proper signature generation
        bytes memory coreSignature = abi.encodePacked(ethSignedMessageHash);

        try coreContract.submitMEVDetection(
            analysisId,
            address(0), // Target address would be extracted from transaction
            transactionHash,
            attackType,
            riskScore,
            confidence,
            coreSignature
        ) {
            // Successfully forwarded
        } catch {
            // Handle forwarding failure
        }
    }

    /**
     * @dev Determine attack type based on risk patterns (simplified)
     */
    function _determineAttackType(uint256 riskScore) internal pure returns (PodiumGuardCore.AttackType) {
        if (riskScore >= 90) return PodiumGuardCore.AttackType.SANDWICH;
        if (riskScore >= 80) return PodiumGuardCore.AttackType.FRONTRUN;
        if (riskScore >= 70) return PodiumGuardCore.AttackType.BACKRUN;
        return PodiumGuardCore.AttackType.ARBITRAGE;
    }

    /**
     * @dev Verify analysis accuracy (called by validators)
     */
    function verifyAnalysis(bytes32 analysisId, bool accurate) external {
        require(analyses[analysisId].analysisId != bytes32(0), "Analysis not found");
        require(!analyses[analysisId].verified, "Already verified");
        require(hasRole(coreContract.VALIDATOR_ROLE(), msg.sender), "Not authorized validator");

        analyses[analysisId].verified = true;
        address oracle = analyses[analysisId].oracle;

        if (accurate) {
            oracles[oracle].accurateSubmissions++;
            oracles[oracle].reputation = _updateReputation(oracle, true);
        } else {
            oracles[oracle].reputation = _updateReputation(oracle, false);
            _slashOracle(oracle, "Inaccurate analysis");
        }

        emit AnalysisVerified(analysisId, accurate);
    }

    /**
     * @dev Update oracle reputation based on accuracy
     */
    function _updateReputation(address oracle, bool accurate) internal view returns (uint256) {
        OracleConfig memory config = oracles[oracle];
        uint256 currentReputation = config.reputation;
        
        if (accurate) {
            return currentReputation < 100 ? currentReputation + 1 : 100;
        } else {
            return currentReputation > 10 ? currentReputation - 5 : 10;
        }
    }

    /**
     * @dev Slash oracle for misconduct
     */
    function _slashOracle(address oracle, string memory reason) internal {
        OracleConfig storage config = oracles[oracle];
        uint256 slashAmount = config.stake / 10; // 10% slash
        
        if (slashAmount > 0) {
            config.stake -= slashAmount;
            // Send slashed amount to treasury
            (bool success,) = payable(address(coreContract)).call{value: slashAmount}("");
            require(success, "Slash transfer failed");
        }

        if (config.reputation < 20) {
            config.active = false;
        }

        emit OracleSlashed(oracle, slashAmount, reason);
    }

    /**
     * @dev Get oracle information
     */
    function getOracleInfo(address oracle) external view returns (
        uint256 reputation,
        uint256 totalSubmissions,
        uint256 accurateSubmissions,
        bool active,
        uint256 stake
    ) {
        OracleConfig memory config = oracles[oracle];
        return (
            config.reputation,
            config.totalSubmissions,
            config.accurateSubmissions,
            config.active,
            config.stake
        );
    }

    /**
     * @dev Get analysis details
     */
    function getAnalysis(bytes32 analysisId) external view returns (AIAnalysis memory) {
        return analyses[analysisId];
    }

    /**
     * @dev Calculate oracle accuracy percentage
     */
    function getOracleAccuracy(address oracle) external view returns (uint256) {
        OracleConfig memory config = oracles[oracle];
        if (config.totalSubmissions == 0) return 0;
        return (config.accurateSubmissions * 100) / config.totalSubmissions;
    }

    /**
     * @dev Emergency deactivate oracle (admin only)
     */
    function deactivateOracle(address oracle, string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        oracles[oracle].active = false;
        emit OracleSlashed(oracle, 0, reason);
    }
}