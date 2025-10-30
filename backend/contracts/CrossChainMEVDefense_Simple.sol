// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CrossChainMEVDefense {
    
    address public owner;
    bool public paused;
    bool private _locked;
    
    uint256 public constant MAX_RISK = 100;
    uint256 public riskThreshold = 85;
    uint256 public totalTx;
    uint256 public highRiskTx;
    
    mapping(address => bool) public admins;
    mapping(address => bool) public guardians;
    mapping(bytes32 => bool) public processed;
    mapping(address => uint256) public riskScores;
    mapping(address => bool) public blacklisted;
    mapping(address => uint256) public lastTx;
    mapping(address => uint256) public txCount;
    
    event TxProcessed(bytes32 indexed hash, address indexed sender, uint256 risk, bool shouldBlock);
    event Blacklisted(address indexed addr);
    event Whitelisted(address indexed addr);
    event OwnerChanged(address indexed old, address indexed newOwner);
    
    error NotOwner();
    error NotAdmin();
    error NotGuardian();
    error Paused();
    error ZeroAddress();
    error Processed();
    error NoAuth();
    error Locked();
    error NoAmount();
    error Failed();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyAdmin() {
        if (!admins[msg.sender] && msg.sender != owner) revert NotAdmin();
        _;
    }
    
    modifier onlyGuardian() {
        if (!guardians[msg.sender] && !admins[msg.sender] && msg.sender != owner) revert NotGuardian();
        _;
    }
    
    modifier notPaused() {
        if (paused) revert Paused();
        _;
    }
    
    modifier noReentry() {
        if (_locked) revert Locked();
        _locked = true;
        _;
        _locked = false;
    }
    
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
        guardians[msg.sender] = true;
    }
    
    function addAdmin(address admin) external onlyOwner {
        if (admin == address(0)) revert ZeroAddress();
        admins[admin] = true;
    }
    
    function addGuardian(address guardian) external onlyAdmin {
        if (guardian == address(0)) revert ZeroAddress();
        guardians[guardian] = true;
    }
    
    function setThreshold(uint256 threshold) external onlyAdmin {
        require(threshold > 0 && threshold <= 100, "Bad threshold");
        riskThreshold = threshold;
    }
    
    function pause() external onlyAdmin {
        paused = true;
    }
    
    function unpause() external onlyAdmin {
        paused = false;
    }
    
    function blacklist(address addr) external onlyGuardian {
        if (addr == address(0)) revert ZeroAddress();
        if (addr == owner || admins[addr] || guardians[addr]) revert NoAuth();
        
        blacklisted[addr] = true;
        emit Blacklisted(addr);
    }
    
    function whitelist(address addr) external onlyGuardian {
        blacklisted[addr] = false;
        emit Whitelisted(addr);
    }
    
    function processTx(
        bytes32 hash,
        address sender,
        uint256 amount,
        uint256 gasPrice
    ) external onlyGuardian notPaused noReentry returns (uint256 risk, bool shouldBlock) {
        
        if (processed[hash]) revert Processed();
        if (sender == address(0)) revert ZeroAddress();
        if (amount == 0) revert NoAmount();
        
        processed[hash] = true;
        lastTx[sender] = block.timestamp;
        totalTx++;
        txCount[sender]++;
        
        risk = calcRisk(sender, amount, gasPrice);
        shouldBlock = (risk >= riskThreshold) || blacklisted[sender];
        
        if (shouldBlock) {
            highRiskTx++;
        }
        
        riskScores[sender] = risk;
        emit TxProcessed(hash, sender, risk, shouldBlock);
        
        return (risk, shouldBlock);
    }
    
    function calcRisk(
        address sender,
        uint256 amount,
        uint256 gasPrice
    ) public view returns (uint256 risk) {
        risk = 10;
        
        if (blacklisted[sender]) {
            return MAX_RISK;
        }
        
        // Amount risk
        if (amount > 100 ether) {
            risk += 30;
        } else if (amount > 10 ether) {
            risk += 15;
        } else if (amount > 1 ether) {
            risk += 5;
        }
        
        // Gas risk
        if (gasPrice > 100 gwei) {
            risk += 25;
        } else if (gasPrice > 50 gwei) {
            risk += 15;
        } else if (gasPrice > 20 gwei) {
            risk += 5;
        }
        
        // History risk
        uint256 oldRisk = riskScores[sender];
        if (oldRisk > 70) {
            risk += 20;
        } else if (oldRisk > 50) {
            risk += 10;
        }
        
        // Contract risk
        if (_isContract(sender)) {
            risk += 10;
        }
        
        // Frequency risk
        uint256 count = txCount[sender];
        if (count > 100) {
            risk += 15;
        } else if (count > 50) {
            risk += 10;
        }
        
        // Time risk
        if (block.timestamp < lastTx[sender] + 10) {
            risk += 20;
        }
        
        if (risk > MAX_RISK) {
            risk = MAX_RISK;
        }
        
        return risk;
    }
    
    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }
    
    function withdraw(uint256 amount) external onlyOwner noReentry {
        if (amount == 0) revert NoAmount();
        require(amount <= address(this).balance, "Not enough");
        
        (bool ok, ) = payable(owner).call{value: amount}("");
        if (!ok) revert Failed();
    }
    
    function changeOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        require(newOwner != owner, "Same owner");
        
        address old = owner;
        owner = newOwner;
        admins[newOwner] = true;
        
        emit OwnerChanged(old, newOwner);
    }
    
    // View functions
    function isProcessed(bytes32 hash) external view returns (bool) {
        return processed[hash];
    }
    
    function getRisk(address user) external view returns (uint256) {
        return riskScores[user];
    }
    
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklisted[addr];
    }
    
    function getStats() external view returns (uint256, uint256, uint256) {
        return (totalTx, highRiskTx, riskThreshold);
    }
    
    function isAdmin(address addr) external view returns (bool) {
        return admins[addr] || addr == owner;
    }
    
    function isGuardian(address addr) external view returns (bool) {
        return guardians[addr] || admins[addr] || addr == owner;
    }
    
    function version() external pure returns (string memory) {
        return "1.0";
    }
    
    receive() external payable {}
}
