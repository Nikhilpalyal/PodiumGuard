// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CrossChainMEVDefense
 * @notice Optimized MEV protection with risk scoring and access control
 * @dev No external dependencies - pure Solidity implementation
 * @custom:security-contact security@example.com
 */
contract CrossChainMEVDefense {
    // State variables
    address public owner;
    bool public paused;
    uint256 public constant MAX_RISK_SCORE = 100;
    uint256 public riskThreshold = 85;
    uint256 public totalTransactions;
    uint256 public highRiskTransactions;
    
    // Role-based mappings
    mapping(address => uint8) public roles; // 0=none, 1=guardian, 2=admin, 3=owner
    mapping(bytes32 => bool) public processedTransactions;
    mapping(address => uint256) public userRiskScores;
    mapping(address => bool) public blacklistedAddresses;
    
    // Events
    event TransactionProcessed(bytes32 indexed txHash, uint256 riskScore, bool blocked);
    event RiskThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event AddressBlacklisted(address indexed addr, string reason);
    event AddressWhitelisted(address indexed addr);
    event RoleGranted(address indexed account, uint8 role);
    event PausedStatusChanged(bool status);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Custom errors (gas efficient)
    error Unauthorized();
    error Paused();
    error InvalidAddress();
    error InvalidThreshold();
    error AlreadyProcessed();
    error InsufficientBalance();
    error SameOwner();
    error InvalidRole();
    
    constructor() {
        owner = msg.sender;
        roles[msg.sender] = 3; // Owner role
        emit RoleGranted(msg.sender, 3);
    }
    
    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyAdmin() {
        if (roles[msg.sender] < 2 && msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyGuardian() {
        if (roles[msg.sender] < 1 && msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }
    
    // Role management
    function grantRole(address account, uint8 role) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        if (role > 2) revert InvalidRole();
        roles[account] = role;
        emit RoleGranted(account, role);
    }
    
    // Risk threshold management
    function setRiskThreshold(uint256 newThreshold) external onlyAdmin {
        if (newThreshold > MAX_RISK_SCORE) revert InvalidThreshold();
        uint256 oldThreshold = riskThreshold;
        riskThreshold = newThreshold;
        emit RiskThresholdUpdated(oldThreshold, newThreshold);
    }
    
    // Pause control
    function setPaused(bool _paused) external onlyAdmin {
        paused = _paused;
        emit PausedStatusChanged(_paused);
    }
    
    // Blacklist management
    function blacklistAddress(address addr, string calldata reason) external onlyGuardian {
        if (addr == address(0)) revert InvalidAddress();
        blacklistedAddresses[addr] = true;
        emit AddressBlacklisted(addr, reason);
    }
    
    function whitelistAddress(address addr) external onlyGuardian {
        blacklistedAddresses[addr] = false;
        emit AddressWhitelisted(addr);
    }
    
    // Core transaction processing
    function processTransaction(
        bytes32 txHash,
        address sender,
        uint256 amount,
        uint256 gasPrice
    ) external onlyGuardian whenNotPaused returns (uint256 riskScore, bool shouldBlock) {
        if (processedTransactions[txHash]) revert AlreadyProcessed();
        if (sender == address(0)) revert InvalidAddress();
        
        processedTransactions[txHash] = true;
        unchecked { ++totalTransactions; }
        
        riskScore = calculateRiskScore(sender, amount, gasPrice);
        shouldBlock = (riskScore >= riskThreshold) || blacklistedAddresses[sender];
        
        if (shouldBlock) {
            unchecked { ++highRiskTransactions; }
        }
        
        userRiskScores[sender] = riskScore;
        emit TransactionProcessed(txHash, riskScore, shouldBlock);
    }
    
    // Risk calculation algorithm
    function calculateRiskScore(
        address sender,
        uint256 amount,
        uint256 gasPrice
    ) public view returns (uint256 score) {
        if (blacklistedAddresses[sender]) return MAX_RISK_SCORE;
        
        score = 10;
        
        // Amount-based risk
        if (amount > 100 ether) score += 30;
        else if (amount > 10 ether) score += 15;
        else if (amount > 1 ether) score += 5;
        
        // Gas price risk
        if (gasPrice > 100 gwei) score += 25;
        else if (gasPrice > 50 gwei) score += 15;
        else if (gasPrice > 20 gwei) score += 5;
        
        // Historical risk
        uint256 previousRisk = userRiskScores[sender];
        if (previousRisk > 70) score += 20;
        else if (previousRisk > 50) score += 10;
        
        // Contract detection
        if (_isContract(sender)) score += 10;
        
        // Cap at max score
        return score > MAX_RISK_SCORE ? MAX_RISK_SCORE : score;
    }
    
    // Internal contract check
    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }
    
    // View functions
    function isTransactionProcessed(bytes32 txHash) external view returns (bool) {
        return processedTransactions[txHash];
    }
    
    function getUserRiskScore(address user) external view returns (uint256) {
        return userRiskScores[user];
    }
    
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklistedAddresses[addr];
    }
    
    function getStats() external view returns (
        uint256 total,
        uint256 highRisk,
        uint256 threshold,
        bool isPaused
    ) {
        return (totalTransactions, highRiskTransactions, riskThreshold, paused);
    }
    
    function hasRole(address addr, uint8 minRole) external view returns (bool) {
        return roles[addr] >= minRole || addr == owner;
    }
    
    // Emergency functions
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        if (amount > address(this).balance) revert InsufficientBalance();
        payable(owner).transfer(amount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        if (newOwner == owner) revert SameOwner();
        
        address oldOwner = owner;
        owner = newOwner;
        roles[newOwner] = 3;
        
        emit OwnershipTransferred(oldOwner, newOwner);
        emit RoleGranted(newOwner, 3);
    }
    
    receive() external payable {}
    
    fallback() external payable {
        revert("Function not found");
    }
}