// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CrossChainMEVDefense {
    address public owner;
    bool public paused;
    uint256 public constant MAX_RISK_SCORE = 100;
    uint8 public riskThreshold = 85;
    uint128 public totalTransactions;
    uint128 public highRiskTransactions;
    
    mapping(address => uint8) private _roles; // 0: none, 1: guardian, 2: admin, 3: owner
    mapping(bytes32 => bool) public processedTransactions;
    mapping(address => uint8) public userRiskScores;
    mapping(address => bool) public blacklistedAddresses;
    
    event TransactionProcessed(bytes32 indexed txHash, uint8 riskScore, bool blocked);
    event RiskThresholdUpdated(uint8 oldThreshold, uint8 newThreshold);
    event AddressBlacklisted(address indexed addr, string reason);
    event AddressWhitelisted(address indexed addr);
    event AdminAdded(address indexed admin);
    event ContractPaused();
    event ContractUnpaused();
    
    error NotOwner();
    error NotAdmin();
    error NotGuardian();
    error ContractIsPaused();
    error InvalidAddress();
    error ThresholdTooHigh();
    error AlreadyProcessed();
    error InsufficientBalance();
    error SameOwner();
    error FunctionNotFound();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyAdmin() {
        if (_roles[msg.sender] < 2 && msg.sender != owner) revert NotAdmin();
        _;
    }
    
    modifier onlyGuardian() {
        if (_roles[msg.sender] < 1 && msg.sender != owner) revert NotGuardian();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractIsPaused();
        _;
    }
    
    constructor() {
        owner = msg.sender;
        _roles[msg.sender] = 3;
        emit AdminAdded(msg.sender);
    }
    
    function addAdmin(address admin) external onlyOwner {
        if (admin == address(0)) revert InvalidAddress();
        _roles[admin] = 2;
        emit AdminAdded(admin);
    }
    
    function addGuardian(address guardian) external onlyAdmin {
        if (guardian == address(0)) revert InvalidAddress();
        if (_roles[guardian] == 0) _roles[guardian] = 1;
    }
    
    function setRiskThreshold(uint8 newThreshold) external onlyAdmin {
        if (newThreshold > MAX_RISK_SCORE) revert ThresholdTooHigh();
        uint8 oldThreshold = riskThreshold;
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
    
    function blacklistAddress(address addr, string calldata reason) external onlyGuardian {
        if (addr == address(0)) revert InvalidAddress();
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
    ) external onlyGuardian whenNotPaused returns (uint8 riskScore, bool shouldBlock) {
        if (processedTransactions[txHash]) revert AlreadyProcessed();
        if (sender == address(0)) revert InvalidAddress();
        
        processedTransactions[txHash] = true;
        
        unchecked {
            totalTransactions++;
        }
        
        riskScore = _calculateRiskScore(sender, amount, gasPrice);
        shouldBlock = (riskScore >= riskThreshold) || blacklistedAddresses[sender];
        
        if (shouldBlock) {
            unchecked {
                highRiskTransactions++;
            }
        }
        
        userRiskScores[sender] = riskScore;
        emit TransactionProcessed(txHash, riskScore, shouldBlock);
        
        return (riskScore, shouldBlock);
    }
    
    function _calculateRiskScore(
        address sender,
        uint256 amount,
        uint256 gasPrice
    ) private view returns (uint8 score) {
        if (blacklistedAddresses[sender]) return uint8(MAX_RISK_SCORE);
        
        score = 10;
        
        // Amount-based risk (optimized conditions)
        if (amount > 100 ether) {
            score += 30;
        } else if (amount > 10 ether) {
            score += 15;
        } else if (amount > 1 ether) {
            score += 5;
        }
        
        // Gas price-based risk
        if (gasPrice > 100 gwei) {
            score += 25;
        } else if (gasPrice > 50 gwei) {
            score += 15;
        } else if (gasPrice > 20 gwei) {
            score += 5;
        }
        
        // Previous risk history
        uint8 previousRisk = userRiskScores[sender];
        if (previousRisk > 70) {
            score += 20;
        } else if (previousRisk > 50) {
            score += 10;
        }
        
        // Contract check
        if (_isContract(sender)) {
            score += 10;
        }
        
        // Cap at max score
        if (score > MAX_RISK_SCORE) {
            score = uint8(MAX_RISK_SCORE);
        }
        
        return score;
    }
    
    function _isContract(address addr) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }
    
    function calculateRiskScore(
        address sender,
        uint256 amount,
        uint256 gasPrice
    ) external view returns (uint8) {
        return _calculateRiskScore(sender, amount, gasPrice);
    }
    
    function isTransactionProcessed(bytes32 txHash) external view returns (bool) {
        return processedTransactions[txHash];
    }
    
    function getUserRiskScore(address user) external view returns (uint8) {
        return userRiskScores[user];
    }
    
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklistedAddresses[addr];
    }
    
    function getStats() external view returns (uint128 total, uint128 highRisk, uint8 threshold) {
        return (totalTransactions, highRiskTransactions, riskThreshold);
    }
    
    function isAdmin(address addr) external view returns (bool) {
        return _roles[addr] >= 2 || addr == owner;
    }
    
    function isGuardian(address addr) external view returns (bool) {
        return _roles[addr] >= 1 || addr == owner;
    }
    
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        if (amount > address(this).balance) revert InsufficientBalance();
        payable(owner).transfer(amount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        if (newOwner == owner) revert SameOwner();
        owner = newOwner;
        _roles[newOwner] = 3;
        emit AdminAdded(newOwner);
    }
    
    receive() external payable {}
    
    fallback() external payable {
        revert FunctionNotFound();
    }
}