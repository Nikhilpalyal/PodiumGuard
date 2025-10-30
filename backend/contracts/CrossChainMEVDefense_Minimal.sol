// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CrossChainMEVDefense {
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
    
    event TransactionProcessed(bytes32 indexed txHash, uint256 riskScore, bool blocked);
    event RiskThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event AddressBlacklisted(address indexed addr, string reason);
    event AddressWhitelisted(address indexed addr);
    event AdminAdded(address indexed admin);
    event ContractPaused();
    event ContractUnpaused();
    
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
    
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
        guardians[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }
    
    function addAdmin(address admin) external onlyOwner validAddress(admin) {
        admins[admin] = true;
        emit AdminAdded(admin);
    }
    
    function setRiskThreshold(uint256 newThreshold) external onlyAdmin {
        require(newThreshold <= MAX_RISK_SCORE, "Threshold too high");
        uint256 oldThreshold = riskThreshold;
        riskThreshold = newThreshold;
        emit RiskThresholdUpdated(oldThreshold, newThreshold);
    }
    
    function pause() external onlyAdmin {
        paused = true;
        emit ContractPaused();
    }
    
    function unpause() external onlyAdmin {
        paused = false;
        emit ContractUnpaused();
    }
    
    function blacklistAddress(address addr, string calldata reason) external onlyGuardian validAddress(addr) {
        blacklistedAddresses[addr] = true;
        emit AddressBlacklisted(addr, reason);
    }
    
    function whitelistAddress(address addr) external onlyGuardian {
        blacklistedAddresses[addr] = false;
        emit AddressWhitelisted(addr);
    }
    
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
        
        riskScore = calculateRiskScore(sender, amount, gasPrice);
        shouldBlock = (riskScore >= riskThreshold) || blacklistedAddresses[sender];
        
        if (shouldBlock) {
            highRiskTransactions++;
        }
        
        userRiskScores[sender] = riskScore;
        emit TransactionProcessed(txHash, riskScore, shouldBlock);
        
        return (riskScore, shouldBlock);
    }
    
    function calculateRiskScore(
        address sender,
        uint256 amount,
        uint256 gasPrice
    ) public view returns (uint256 score) {
        score = 10;
        
        if (blacklistedAddresses[sender]) {
            return MAX_RISK_SCORE;
        }
        
        if (amount > 100 ether) {
            score += 30;
        } else if (amount > 10 ether) {
            score += 15;
        } else if (amount > 1 ether) {
            score += 5;
        }
        
        if (gasPrice > 100 gwei) {
            score += 25;
        } else if (gasPrice > 50 gwei) {
            score += 15;
        } else if (gasPrice > 20 gwei) {
            score += 5;
        }
        
        uint256 previousRisk = userRiskScores[sender];
        if (previousRisk > 70) {
            score += 20;
        } else if (previousRisk > 50) {
            score += 10;
        }
        
        if (isContract(sender)) {
            score += 10;
        }
        
        if (score > MAX_RISK_SCORE) {
            score = MAX_RISK_SCORE;
        }
        
        return score;
    }
    
    function isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }
    
    function isTransactionProcessed(bytes32 txHash) external view returns (bool) {
        return processedTransactions[txHash];
    }
    
    function getUserRiskScore(address user) external view returns (uint256) {
        return userRiskScores[user];
    }
    
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklistedAddresses[addr];
    }
    
    function getStats() external view returns (uint256 total, uint256 highRisk, uint256 threshold) {
        return (totalTransactions, highRiskTransactions, riskThreshold);
    }
    
    function isAdmin(address addr) external view returns (bool) {
        return admins[addr] || addr == owner;
    }
    
    function isGuardian(address addr) external view returns (bool) {
        return guardians[addr] || admins[addr] || addr == owner;
    }
    
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner).transfer(amount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner validAddress(newOwner) {
        require(newOwner != owner, "Same owner");
        owner = newOwner;
        admins[newOwner] = true;
        emit AdminAdded(newOwner);
    }
    
    receive() external payable {}
    
    fallback() external payable {
        revert("Function not found");
    }
}