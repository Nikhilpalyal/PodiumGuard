// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CrossChainMEVDefense - Ultra Simplified for Audit
 * @notice MEV protection contract optimized for audit tools
 * @dev Single contract with no external dependencies for maximum compatibility
 */
contract CrossChainMEVDefense {
    
    /* ========== STATE VARIABLES ========== */
    address public owner;
    bool public paused;
    uint256 public constant MAX_RISK_SCORE = 100;
    uint256 public riskThreshold = 85;
    uint256 public totalTransactions;
    uint256 public highRiskTransactions;
    
    mapping(address => bool) public admins;
    mapping(address => bool) public guardians;
    mapping(bytes32 => bool) public processedTransactions;
    mapping(address => uint256) public userRiskScores;
    mapping(address => bool) public blacklistedAddresses;
    
    /* ========== EVENTS ========== */
    event TransactionProcessed(bytes32 indexed txHash, uint256 riskScore, bool blocked);
    event RiskThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event AddressBlacklisted(address indexed addr, string reason);
    event AddressWhitelisted(address indexed addr);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event GuardianAdded(address indexed guardian);
    event ContractPaused();
    event ContractUnpaused();
    
    /* ========== MODIFIERS ========== */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Not admin");
        _;
    }
    
    modifier onlyGuardian() {
        require(guardians[msg.sender] || admins[msg.sender] || msg.sender == owner, "Not guardian");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }
    
    /* ========== CONSTRUCTOR ========== */
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
        guardians[msg.sender] = true;
        emit AdminAdded(msg.sender);
        emit GuardianAdded(msg.sender);
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @notice Add admin
     * @param admin Address to add as admin
     */
    function addAdmin(address admin) external onlyOwner validAddress(admin) {
        admins[admin] = true;
        emit AdminAdded(admin);
    }
    
    /**
     * @notice Remove admin
     * @param admin Address to remove
     */
    function removeAdmin(address admin) external onlyOwner {
        admins[admin] = false;
        emit AdminRemoved(admin);
    }
    
    /**
     * @notice Add guardian
     * @param guardian Address to add as guardian
     */
    function addGuardian(address guardian) external onlyAdmin validAddress(guardian) {
        guardians[guardian] = true;
        emit GuardianAdded(guardian);
    }
    
    /**
     * @notice Set risk threshold
     * @param newThreshold New threshold (0-100)
     */
    function setRiskThreshold(uint256 newThreshold) external onlyAdmin {
        require(newThreshold <= MAX_RISK_SCORE, "Threshold too high");
        uint256 oldThreshold = riskThreshold;
        riskThreshold = newThreshold;
        emit RiskThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyAdmin {
        paused = true;
        emit ContractPaused();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyAdmin {
        paused = false;
        emit ContractUnpaused();
    }
    
    /* ========== SECURITY FUNCTIONS ========== */
    
    /**
     * @notice Blacklist suspicious address
     * @param addr Address to blacklist
     * @param reason Reason for blacklisting
     */
    function blacklistAddress(address addr, string calldata reason) external onlyGuardian validAddress(addr) {
        blacklistedAddresses[addr] = true;
        emit AddressBlacklisted(addr, reason);
    }
    
    /**
     * @notice Remove address from blacklist
     * @param addr Address to whitelist
     */
    function whitelistAddress(address addr) external onlyGuardian {
        blacklistedAddresses[addr] = false;
        emit AddressWhitelisted(addr);
    }
    
    /**
     * @notice Process transaction for MEV protection
     * @param txHash Transaction hash
     * @param sender Transaction sender
     * @param amount Transaction amount
     * @param gasPrice Gas price used
     * @return riskScore Calculated risk score
     * @return shouldBlock Whether transaction should be blocked
     */
    function processTransaction(
        bytes32 txHash,
        address sender,
        uint256 amount,
        uint256 gasPrice
    ) external onlyGuardian whenNotPaused returns (uint256 riskScore, bool shouldBlock) {
        require(!processedTransactions[txHash], "Transaction already processed");
        require(sender != address(0), "Invalid sender");
        
        processedTransactions[txHash] = true;
        totalTransactions++;
        
        // Calculate risk score
        riskScore = calculateRiskScore(sender, amount, gasPrice);
        shouldBlock = (riskScore >= riskThreshold) || blacklistedAddresses[sender];
        
        if (shouldBlock) {
            highRiskTransactions++;
        }
        
        // Update user risk score
        userRiskScores[sender] = riskScore;
        
        emit TransactionProcessed(txHash, riskScore, shouldBlock);
        
        return (riskScore, shouldBlock);
    }
    
    /**
     * @notice Calculate risk score for transaction
     * @param sender Transaction sender
     * @param amount Transaction amount  
     * @param gasPrice Gas price used
     * @return score Risk score (0-100)
     */
    function calculateRiskScore(
        address sender,
        uint256 amount,
        uint256 gasPrice
    ) public view returns (uint256 score) {
        score = 10; // Base score
        
        // Blacklisted address gets maximum score
        if (blacklistedAddresses[sender]) {
            return MAX_RISK_SCORE;
        }
        
        // Large amount increases risk
        if (amount > 100 ether) {
            score += 30;
        } else if (amount > 10 ether) {
            score += 15;
        } else if (amount > 1 ether) {
            score += 5;
        }
        
        // High gas price indicates potential MEV
        if (gasPrice > 100 gwei) {
            score += 25;
        } else if (gasPrice > 50 gwei) {
            score += 15;
        } else if (gasPrice > 20 gwei) {
            score += 5;
        }
        
        // Previous risk history
        uint256 previousRisk = userRiskScores[sender];
        if (previousRisk > 70) {
            score += 20;
        } else if (previousRisk > 50) {
            score += 10;
        }
        
        // Contract interaction adds some risk
        if (isContract(sender)) {
            score += 10;
        }
        
        // Cap at maximum
        if (score > MAX_RISK_SCORE) {
            score = MAX_RISK_SCORE;
        }
        
        return score;
    }
    
    /**
     * @notice Check if address is contract
     * @param addr Address to check
     * @return isContract True if address is contract
     */
    function isContract(address addr) internal view returns (bool isContract) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @notice Check if transaction was processed
     * @param txHash Transaction hash
     * @return bool True if processed
     */
    function isTransactionProcessed(bytes32 txHash) external view returns (bool) {
        return processedTransactions[txHash];
    }
    
    /**
     * @notice Get user risk score
     * @param user User address
     * @return uint256 Risk score
     */
    function getUserRiskScore(address user) external view returns (uint256) {
        return userRiskScores[user];
    }
    
    /**
     * @notice Check if address is blacklisted
     * @param addr Address to check
     * @return bool True if blacklisted
     */
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklistedAddresses[addr];
    }
    
    /**
     * @notice Get contract statistics
     * @return total Total transactions processed
     * @return highRisk High risk transactions
     * @return threshold Current risk threshold
     */
    function getStats() external view returns (uint256 total, uint256 highRisk, uint256 threshold) {
        return (totalTransactions, highRiskTransactions, riskThreshold);
    }
    
    /**
     * @notice Check admin status
     * @param addr Address to check
     * @return bool True if admin
     */
    function isAdmin(address addr) external view returns (bool) {
        return admins[addr] || addr == owner;
    }
    
    /**
     * @notice Check guardian status
     * @param addr Address to check
     * @return bool True if guardian
     */
    function isGuardian(address addr) external view returns (bool) {
        return guardians[addr] || admins[addr] || addr == owner;
    }
    
    /* ========== BATCH OPERATIONS ========== */
    
    /**
     * @notice Batch blacklist addresses
     * @param addresses Array of addresses to blacklist
     * @param reason Reason for blacklisting
     */
    function batchBlacklist(address[] calldata addresses, string calldata reason) external onlyGuardian {
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i] != address(0)) {
                blacklistedAddresses[addresses[i]] = true;
                emit AddressBlacklisted(addresses[i], reason);
            }
        }
    }
    
    /**
     * @notice Batch whitelist addresses
     * @param addresses Array of addresses to whitelist
     */
    function batchWhitelist(address[] calldata addresses) external onlyGuardian {
        for (uint256 i = 0; i < addresses.length; i++) {
            blacklistedAddresses[addresses[i]] = false;
            emit AddressWhitelisted(addresses[i]);
        }
    }
    
    /* ========== EMERGENCY FUNCTIONS ========== */
    
    /**
     * @notice Emergency withdrawal
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner).transfer(amount);
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner validAddress(newOwner) {
        require(newOwner != owner, "Same owner");
        address oldOwner = owner;
        owner = newOwner;
        
        // Remove old owner from admins and add new owner
        admins[oldOwner] = false;
        admins[newOwner] = true;
        
        emit AdminRemoved(oldOwner);
        emit AdminAdded(newOwner);
    }
    
    /* ========== FALLBACK FUNCTIONS ========== */
    
    /**
     * @dev Receive function for ETH deposits
     */
    receive() external payable {
        // Allow ETH deposits for contract funding
    }
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {
        revert("Function not found");
    }
}