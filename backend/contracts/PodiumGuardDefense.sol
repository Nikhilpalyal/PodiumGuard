// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PodiumGuardDefense
 * @dev Smart contract for logging MEV detection events and managing system modes
 * @author PodiumGuard Team
 */
contract PodiumGuardDefense is Ownable, ReentrancyGuard, Pausable {
    
    // System modes
    enum SystemMode { Normal, Safe, Emergency }
    
    // Detection categories
    enum DetectionCategory { Normal, Frontrunning, Sandwich, MEVBot, Arbitrage, HighRisk }
    
    // Struct to store detection data
    struct Detection {
        uint256 id;
        string txHash;
        address from;
        address to;
        uint256 value;
        uint256 riskScore;
        DetectionCategory category;
        uint256 timestamp;
        bool mitigated;
        string[] riskFactors;
    }
    
    // System state variables
    SystemMode public currentMode;
    uint256 public detectionCounter;
    uint256 public highRiskThreshold;
    uint256 public safeModeThreshold;
    uint256 public emergencyThreshold;
    
    // Mappings
    mapping(uint256 => Detection) public detections;
    mapping(string => bool) public processedTransactions;
    mapping(address => bool) public authorizedCallers;
    mapping(DetectionCategory => uint256) public categoryCount;
    
    // Arrays for tracking
    uint256[] public recentDetections;
    uint256 public maxRecentDetections;
    
    // Events
    event DetectionLogged(
        uint256 indexed detectionId,
        string indexed txHash,
        address indexed from,
        address to,
        uint256 riskScore,
        DetectionCategory category,
        uint256 timestamp
    );
    
    event SystemModeChanged(
        SystemMode previousMode,
        SystemMode newMode,
        uint256 timestamp,
        string reason
    );
    
    event HighRiskAlert(
        uint256 indexed detectionId,
        string indexed txHash,
        uint256 riskScore,
        DetectionCategory category,
        uint256 timestamp
    );
    
    event EmergencyTriggered(
        uint256 detectionCount,
        uint256 timeWindow,
        uint256 timestamp
    );
    
    event AuthorizedCallerAdded(address indexed caller);
    event AuthorizedCallerRemoved(address indexed caller);
    event DetectionMitigated(uint256 indexed detectionId, address mitigatedBy);
    
    // Modifiers
    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    modifier validDetection(string memory _txHash, uint256 _riskScore) {
        require(bytes(_txHash).length > 0, "Invalid transaction hash");
        require(_riskScore <= 100, "Risk score must be <= 100");
        require(!processedTransactions[_txHash], "Transaction already processed");
        _;
    }
    
    /**
     * @dev Constructor to initialize the contract
     */
    constructor() Ownable(msg.sender) {
        currentMode = SystemMode.Normal;
        detectionCounter = 0;
        highRiskThreshold = 75;
        safeModeThreshold = 5; // 5 high-risk detections per minute
        emergencyThreshold = 10; // 10 high-risk detections per minute
        maxRecentDetections = 100;
        
        // Add deployer as authorized caller
        authorizedCallers[msg.sender] = true;
        emit AuthorizedCallerAdded(msg.sender);
    }
    
    /**
     * @dev Log a new MEV detection
     */
    function logDetection(
        string memory _txHash,
        address _from,
        address _to,
        uint256 _value,
        uint256 _riskScore,
        DetectionCategory _category,
        string[] memory _riskFactors
    ) external onlyAuthorized nonReentrant whenNotPaused validDetection(_txHash, _riskScore) {
        
        detectionCounter++;
        uint256 detectionId = detectionCounter;
        
        // Store detection
        Detection storage detection = detections[detectionId];
        detection.id = detectionId;
        detection.txHash = _txHash;
        detection.from = _from;
        detection.to = _to;
        detection.value = _value;
        detection.riskScore = _riskScore;
        detection.category = _category;
        detection.timestamp = block.timestamp;
        detection.mitigated = false;
        detection.riskFactors = _riskFactors;
        
        // Mark transaction as processed
        processedTransactions[_txHash] = true;
        
        // Update category count
        categoryCount[_category]++;
        
        // Add to recent detections
        _addToRecentDetections(detectionId);
        
        // Emit main detection event
        emit DetectionLogged(
            detectionId,
            _txHash,
            _from,
            _to,
            _riskScore,
            _category,
            block.timestamp
        );
        
        // Check if high risk and emit alert
        if (_riskScore >= highRiskThreshold) {
            emit HighRiskAlert(detectionId, _txHash, _riskScore, _category, block.timestamp);
            
            // Check for system mode changes
            _checkSystemModeChange();
        }
    }
    
    /**
     * @dev Manually set system mode (emergency override)
     */
    function setSystemMode(SystemMode _mode, string memory _reason) external onlyOwner {
        SystemMode previousMode = currentMode;
        currentMode = _mode;
        
        emit SystemModeChanged(previousMode, _mode, block.timestamp, _reason);
    }
    
    /**
     * @dev Mark a detection as mitigated
     */
    function mitigateDetection(uint256 _detectionId) external onlyAuthorized {
        require(_detectionId <= detectionCounter && _detectionId > 0, "Invalid detection ID");
        require(!detections[_detectionId].mitigated, "Already mitigated");
        
        detections[_detectionId].mitigated = true;
        emit DetectionMitigated(_detectionId, msg.sender);
    }
    
    /**
     * @dev Add authorized caller
     */
    function addAuthorizedCaller(address _caller) external onlyOwner {
        require(_caller != address(0), "Invalid address");
        require(!authorizedCallers[_caller], "Already authorized");
        
        authorizedCallers[_caller] = true;
        emit AuthorizedCallerAdded(_caller);
    }
    
    /**
     * @dev Remove authorized caller
     */
    function removeAuthorizedCaller(address _caller) external onlyOwner {
        require(authorizedCallers[_caller], "Not authorized");
        
        authorizedCallers[_caller] = false;
        emit AuthorizedCallerRemoved(_caller);
    }
    
    /**
     * @dev Update thresholds
     */
    function updateThresholds(
        uint256 _highRiskThreshold,
        uint256 _safeModeThreshold,
        uint256 _emergencyThreshold
    ) external onlyOwner {
        require(_highRiskThreshold <= 100, "High risk threshold too high");
        require(_safeModeThreshold > 0, "Safe mode threshold too low");
        require(_emergencyThreshold >= _safeModeThreshold, "Emergency threshold too low");
        
        highRiskThreshold = _highRiskThreshold;
        safeModeThreshold = _safeModeThreshold;
        emergencyThreshold = _emergencyThreshold;
    }
    
    /**
     * @dev Get detection details
     */
    function getDetection(uint256 _detectionId) external view returns (
        uint256 id,
        string memory txHash,
        address from,
        address to,
        uint256 value,
        uint256 riskScore,
        DetectionCategory category,
        uint256 timestamp,
        bool mitigated
    ) {
        require(_detectionId <= detectionCounter && _detectionId > 0, "Invalid detection ID");
        
        Detection storage detection = detections[_detectionId];
        return (
            detection.id,
            detection.txHash,
            detection.from,
            detection.to,
            detection.value,
            detection.riskScore,
            detection.category,
            detection.timestamp,
            detection.mitigated
        );
    }
    
    /**
     * @dev Get detection risk factors
     */
    function getDetectionRiskFactors(uint256 _detectionId) external view returns (string[] memory) {
        require(_detectionId <= detectionCounter && _detectionId > 0, "Invalid detection ID");
        return detections[_detectionId].riskFactors;
    }
    
    /**
     * @dev Get recent high-risk detections count
     */
    function getRecentHighRiskCount(uint256 _timeWindow) external view returns (uint256) {
        uint256 count = 0;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 0; i < recentDetections.length; i++) {
            uint256 detectionId = recentDetections[i];
            Detection storage detection = detections[detectionId];
            
            if (currentTime - detection.timestamp <= _timeWindow && 
                detection.riskScore >= highRiskThreshold) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * @dev Get system statistics
     */
    function getSystemStats() external view returns (
        uint256 totalDetections,
        uint256 highRiskDetections,
        SystemMode mode,
        uint256[6] memory categoryCounts
    ) {
        uint256 highRisk = 0;
        
        for (uint256 i = 1; i <= detectionCounter; i++) {
            if (detections[i].riskScore >= highRiskThreshold) {
                highRisk++;
            }
        }
        
        return (
            detectionCounter,
            highRisk,
            currentMode,
            [
                categoryCount[DetectionCategory.Normal],
                categoryCount[DetectionCategory.Frontrunning],
                categoryCount[DetectionCategory.Sandwich],
                categoryCount[DetectionCategory.MEVBot],
                categoryCount[DetectionCategory.Arbitrage],
                categoryCount[DetectionCategory.HighRisk]
            ]
        );
    }
    
    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyOwner {
        _pause();
        SystemMode previousMode = currentMode;
        currentMode = SystemMode.Emergency;
        emit SystemModeChanged(previousMode, SystemMode.Emergency, block.timestamp, "Emergency pause activated");
    }
    
    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
        SystemMode previousMode = currentMode;
        currentMode = SystemMode.Normal;
        emit SystemModeChanged(previousMode, SystemMode.Normal, block.timestamp, "System unpaused");
    }
    
    /**
     * @dev Internal function to check and update system mode
     */
    function _checkSystemModeChange() internal {
        uint256 recentHighRisk = this.getRecentHighRiskCount(60); // Last 1 minute
        
        if (recentHighRisk >= emergencyThreshold && currentMode != SystemMode.Emergency) {
            SystemMode previousMode = currentMode;
            currentMode = SystemMode.Emergency;
            emit SystemModeChanged(previousMode, SystemMode.Emergency, block.timestamp, "High detection rate");
            emit EmergencyTriggered(recentHighRisk, 60, block.timestamp);
        } else if (recentHighRisk >= safeModeThreshold && currentMode == SystemMode.Normal) {
            SystemMode previousMode = currentMode;
            currentMode = SystemMode.Safe;
            emit SystemModeChanged(previousMode, SystemMode.Safe, block.timestamp, "Elevated detection rate");
        } else if (recentHighRisk < safeModeThreshold && currentMode == SystemMode.Safe) {
            SystemMode previousMode = currentMode;
            currentMode = SystemMode.Normal;
            emit SystemModeChanged(previousMode, SystemMode.Normal, block.timestamp, "Detection rate normalized");
        }
    }
    
    /**
     * @dev Internal function to add detection to recent list
     */
    function _addToRecentDetections(uint256 _detectionId) internal {
        recentDetections.push(_detectionId);
        
        // Keep only recent detections to manage gas costs
        if (recentDetections.length > maxRecentDetections) {
            // Remove oldest detection
            for (uint256 i = 0; i < recentDetections.length - 1; i++) {
                recentDetections[i] = recentDetections[i + 1];
            }
            recentDetections.pop();
        }
    }
}