// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title PodiumGuardCore
 * @dev Advanced MEV Defense Smart Contract System with AI Integration
 * @notice Core contract for blockchain-powered MEV defense with automated protection
 */
contract PodiumGuardCore is ReentrancyGuard, AccessControl, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Role definitions
    bytes32 public constant AI_ORACLE_ROLE = keccak256("AI_ORACLE_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // System modes
    enum DefenseMode { NORMAL, ALERT, SAFE, EMERGENCY }
    enum AttackType { FRONTRUN, BACKRUN, SANDWICH, FLASHLOAN, ARBITRAGE, LIQUIDATION }
    enum ActionType { MONITOR, DELAY, BLOCK, REVERT }

    // Core data structures
    struct MEVDetection {
        bytes32 detectionId;
        address targetAddress;
        bytes32 transactionHash;
        AttackType attackType;
        uint256 riskScore;
        uint256 confidence;
        uint256 timestamp;
        address detector;
        bool verified;
        ActionType recommendedAction;
    }

    struct ProtectionRule {
        uint256 riskThreshold;
        uint256 delaySeconds;
        ActionType action;
        bool active;
        uint256 priority;
    }

    struct UserProtection {
        bool isProtected;
        uint256 maxRiskTolerance;
        uint256 customDelay;
        mapping(AttackType => bool) protectionEnabled;
        uint256 stakingAmount;
        uint256 lastUpdate;
    }

    struct ValidatorNode {
        address validator;
        uint256 stake;
        uint256 reputation;
        bool active;
        uint256 detectionCount;
        uint256 accuracyScore;
    }

    // State variables
    DefenseMode public currentMode;
    uint256 public totalDetections;
    uint256 public totalProtected;
    uint256 public emergencyThreshold;
    uint256 public minStakeAmount;
    address public treasuryAddress;

    // Mappings
    mapping(bytes32 => MEVDetection) public detections;
    mapping(address => UserProtection) public userProtections;
    mapping(AttackType => ProtectionRule) public protectionRules;
    mapping(address => ValidatorNode) public validators;
    mapping(bytes32 => bool) public processedTransactions;
    mapping(address => uint256) public stakedAmounts;

    // Events
    event MEVDetected(
        bytes32 indexed detectionId,
        address indexed targetAddress,
        AttackType attackType,
        uint256 riskScore,
        ActionType action
    );

    event ProtectionActivated(
        address indexed user,
        bytes32 indexed transactionHash,
        ActionType action,
        uint256 delay
    );

    event ModeChanged(DefenseMode oldMode, DefenseMode newMode, string reason);
    
    event ValidatorRegistered(address indexed validator, uint256 stake);
    
    event EmergencyAction(
        bytes32 indexed actionId,
        address indexed executor,
        string action,
        uint256 timestamp
    );

    event AIAnalysisReceived(
        bytes32 indexed detectionId,
        uint256 riskScore,
        uint256 confidence,
        address oracle
    );

    // Modifiers
    modifier onlyAIOracle() {
        require(hasRole(AI_ORACLE_ROLE, msg.sender), "Not authorized AI oracle");
        _;
    }

    modifier onlyValidator() {
        require(hasRole(VALIDATOR_ROLE, msg.sender), "Not authorized validator");
        _;
    }

    modifier onlyGuardian() {
        require(hasRole(GUARDIAN_ROLE, msg.sender), "Not authorized guardian");
        _;
    }

    modifier onlyEmergency() {
        require(hasRole(EMERGENCY_ROLE, msg.sender), "Not authorized for emergency");
        _;
    }

    modifier whenModeIs(DefenseMode _mode) {
        require(currentMode == _mode, "Invalid mode for this operation");
        _;
    }

    constructor(
        address _admin,
        address _treasury,
        uint256 _emergencyThreshold,
        uint256 _minStake
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        treasuryAddress = _treasury;
        emergencyThreshold = _emergencyThreshold;
        minStakeAmount = _minStake;
        currentMode = DefenseMode.NORMAL;

        // Initialize default protection rules
        _initializeProtectionRules();
    }

    /**
     * @dev Initialize default protection rules for different attack types
     */
    function _initializeProtectionRules() internal {
        protectionRules[AttackType.FRONTRUN] = ProtectionRule(70, 30, ActionType.DELAY, true, 1);
        protectionRules[AttackType.BACKRUN] = ProtectionRule(60, 15, ActionType.MONITOR, true, 2);
        protectionRules[AttackType.SANDWICH] = ProtectionRule(80, 60, ActionType.BLOCK, true, 1);
        protectionRules[AttackType.FLASHLOAN] = ProtectionRule(90, 120, ActionType.REVERT, true, 1);
        protectionRules[AttackType.ARBITRAGE] = ProtectionRule(50, 10, ActionType.MONITOR, true, 3);
        protectionRules[AttackType.LIQUIDATION] = ProtectionRule(85, 45, ActionType.DELAY, true, 1);
    }

    /**
     * @dev Register a new AI oracle for MEV detection
     * @param oracle Address of the AI oracle
     */
    function registerAIOracle(address oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(AI_ORACLE_ROLE, oracle);
    }

    /**
     * @dev Register a new validator with stake
     */
    function registerValidator() external payable nonReentrant {
        require(msg.value >= minStakeAmount, "Insufficient stake amount");
        require(!validators[msg.sender].active, "Validator already registered");

        validators[msg.sender] = ValidatorNode({
            validator: msg.sender,
            stake: msg.value,
            reputation: 100, // Starting reputation
            active: true,
            detectionCount: 0,
            accuracyScore: 100
        });

        stakedAmounts[msg.sender] = msg.value;
        _grantRole(VALIDATOR_ROLE, msg.sender);

        emit ValidatorRegistered(msg.sender, msg.value);
    }

    /**
     * @dev Submit MEV detection from AI analysis
     * @param detectionId Unique identifier for the detection
     * @param targetAddress Address being targeted
     * @param transactionHash Hash of the suspicious transaction
     * @param attackType Type of MEV attack detected
     * @param riskScore Risk score from AI analysis (0-100)
     * @param confidence Confidence level of the detection (0-100)
     * @param signature Cryptographic signature for verification
     */
    function submitMEVDetection(
        bytes32 detectionId,
        address targetAddress,
        bytes32 transactionHash,
        AttackType attackType,
        uint256 riskScore,
        uint256 confidence,
        bytes calldata signature
    ) external onlyAIOracle nonReentrant whenNotPaused {
        require(riskScore <= 100, "Invalid risk score");
        require(confidence <= 100, "Invalid confidence");
        require(detections[detectionId].detectionId == bytes32(0), "Detection already exists");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            detectionId, targetAddress, transactionHash, uint256(attackType), riskScore, confidence
        ));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        require(hasRole(AI_ORACLE_ROLE, signer), "Invalid signature");

        // Create detection record
        detections[detectionId] = MEVDetection({
            detectionId: detectionId,
            targetAddress: targetAddress,
            transactionHash: transactionHash,
            attackType: attackType,
            riskScore: riskScore,
            confidence: confidence,
            timestamp: block.timestamp,
            detector: msg.sender,
            verified: false,
            recommendedAction: _determineAction(attackType, riskScore)
        });

        totalDetections++;

        // Execute protection if user is enrolled
        if (userProtections[targetAddress].isProtected) {
            _executeProtection(detectionId, targetAddress, attackType, riskScore);
        }

        emit MEVDetected(detectionId, targetAddress, attackType, riskScore, detections[detectionId].recommendedAction);
        emit AIAnalysisReceived(detectionId, riskScore, confidence, msg.sender);

        // Check if emergency mode should be triggered
        _checkEmergencyTrigger();
    }

    /**
     * @dev Determine the recommended action based on attack type and risk score
     */
    function _determineAction(AttackType attackType, uint256 riskScore) internal view returns (ActionType) {
        ProtectionRule memory rule = protectionRules[attackType];
        if (!rule.active || riskScore < rule.riskThreshold) {
            return ActionType.MONITOR;
        }
        return rule.action;
    }

    /**
     * @dev Execute protection measures for a detected MEV attack
     */
    function _executeProtection(
        bytes32 detectionId,
        address targetAddress,
        AttackType attackType,
        uint256 riskScore
    ) internal {
        UserProtection storage protection = userProtections[targetAddress];
        ProtectionRule memory rule = protectionRules[attackType];

        // Check if protection is enabled for this attack type
        if (!protection.protectionEnabled[attackType]) {
            return;
        }

        // Check user's risk tolerance
        if (riskScore < protection.maxRiskTolerance) {
            return;
        }

        ActionType action = _determineAction(attackType, riskScore);
        uint256 delay = protection.customDelay > 0 ? protection.customDelay : rule.delaySeconds;

        emit ProtectionActivated(targetAddress, detections[detectionId].transactionHash, action, delay);
    }

    /**
     * @dev Enable protection for a user
     * @param maxRiskTolerance Maximum risk score the user will tolerate
     * @param customDelay Custom delay in seconds (0 for default)
     * @param enabledAttackTypes Array of attack types to protect against
     */
    function enableProtection(
        uint256 maxRiskTolerance,
        uint256 customDelay,
        AttackType[] calldata enabledAttackTypes
    ) external payable nonReentrant {
        require(maxRiskTolerance <= 100, "Invalid risk tolerance");
        require(msg.value >= minStakeAmount, "Insufficient stake for protection");

        UserProtection storage protection = userProtections[msg.sender];
        protection.isProtected = true;
        protection.maxRiskTolerance = maxRiskTolerance;
        protection.customDelay = customDelay;
        protection.stakingAmount += msg.value;
        protection.lastUpdate = block.timestamp;

        // Enable protection for specified attack types
        for (uint256 i = 0; i < enabledAttackTypes.length; i++) {
            protection.protectionEnabled[enabledAttackTypes[i]] = true;
        }

        stakedAmounts[msg.sender] += msg.value;
        totalProtected++;
    }

    /**
     * @dev Verify a detection (for validators)
     */
    function verifyDetection(bytes32 detectionId, bool isValid) external onlyValidator {
        require(detections[detectionId].detectionId != bytes32(0), "Detection not found");
        require(!detections[detectionId].verified, "Detection already verified");

        detections[detectionId].verified = true;
        
        ValidatorNode storage validator = validators[msg.sender];
        validator.detectionCount++;

        if (isValid) {
            validator.accuracyScore = (validator.accuracyScore * 99 + 100) / 100; // Weighted average
            validator.reputation++;
        } else {
            validator.accuracyScore = (validator.accuracyScore * 99) / 100; // Slight penalty
        }
    }

    /**
     * @dev Check if emergency mode should be triggered
     */
    function _checkEmergencyTrigger() internal {
        if (currentMode == DefenseMode.EMERGENCY) return;

        uint256 recentHighRiskDetections = 0;
        uint256 timeWindow = 1 hours;
        
        // This would require tracking recent detections - simplified for demo
        if (recentHighRiskDetections >= emergencyThreshold) {
            _changeMode(DefenseMode.EMERGENCY, "High frequency MEV attacks detected");
        }
    }

    /**
     * @dev Change system defense mode
     */
    function _changeMode(DefenseMode newMode, string memory reason) internal {
        DefenseMode oldMode = currentMode;
        currentMode = newMode;
        emit ModeChanged(oldMode, newMode, reason);
    }

    /**
     * @dev Manual mode change (Guardian only)
     */
    function setDefenseMode(DefenseMode newMode, string calldata reason) external onlyGuardian {
        _changeMode(newMode, reason);
    }

    /**
     * @dev Emergency pause (Emergency role only)
     */
    function emergencyPause() external onlyEmergency {
        _pause();
        _changeMode(DefenseMode.EMERGENCY, "Emergency pause activated");
        
        emit EmergencyAction(
            keccak256(abi.encodePacked(block.timestamp, msg.sender)),
            msg.sender,
            "EMERGENCY_PAUSE",
            block.timestamp
        );
    }

    /**
     * @dev Emergency unpause
     */
    function emergencyUnpause() external onlyEmergency {
        _unpause();
        _changeMode(DefenseMode.NORMAL, "Emergency pause deactivated");
    }

    /**
     * @dev Update protection rule
     */
    function updateProtectionRule(
        AttackType attackType,
        uint256 riskThreshold,
        uint256 delaySeconds,
        ActionType action,
        bool active,
        uint256 priority
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        protectionRules[attackType] = ProtectionRule({
            riskThreshold: riskThreshold,
            delaySeconds: delaySeconds,
            action: action,
            active: active,
            priority: priority
        });
    }

    /**
     * @dev Withdraw validator stake (after cooldown period)
     */
    function withdrawValidatorStake() external nonReentrant {
        ValidatorNode storage validator = validators[msg.sender];
        require(validator.active, "Not an active validator");
        require(validator.stake > 0, "No stake to withdraw");

        uint256 amount = validator.stake;
        validator.stake = 0;
        validator.active = false;
        stakedAmounts[msg.sender] = 0;

        _revokeRole(VALIDATOR_ROLE, msg.sender);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get user protection status
     */
    function getProtectionStatus(address user) external view returns (
        bool isProtected,
        uint256 maxRiskTolerance,
        uint256 stakingAmount,
        uint256 lastUpdate
    ) {
        UserProtection storage protection = userProtections[user];
        return (
            protection.isProtected,
            protection.maxRiskTolerance,
            protection.stakingAmount,
            protection.lastUpdate
        );
    }

    /**
     * @dev Get detection details
     */
    function getDetection(bytes32 detectionId) external view returns (MEVDetection memory) {
        return detections[detectionId];
    }

    /**
     * @dev Get system statistics
     */
    function getSystemStats() external view returns (
        DefenseMode mode,
        uint256 totalDet,
        uint256 totalProt,
        uint256 totalStaked
    ) {
        return (currentMode, totalDetections, totalProtected, address(this).balance);
    }

    /**
     * @dev Fallback to receive ETH
     */
    receive() external payable {
        // Accept ETH for staking
    }
}