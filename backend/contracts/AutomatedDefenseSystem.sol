// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PodiumGuardCore.sol";
import "./AIOracle.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title AutomatedDefenseSystem
 * @dev Automated on-chain protection mechanisms that execute based on AI risk analysis
 * @notice Implements real-time MEV protection with configurable response strategies
 */
contract AutomatedDefenseSystem is ReentrancyGuard, AccessControl {
    using Address for address;

    PodiumGuardCore public immutable coreContract;
    AIOracle public immutable aiOracle;

    // Defense strategy types
    enum DefenseStrategy {
        PASSIVE_MONITOR,      // Just monitor and log
        TRANSACTION_DELAY,    // Delay transaction execution
        GAS_PRICE_PROTECTION, // Adjust gas pricing
        SANDWICH_PROTECTION,  // Anti-sandwich mechanisms
        CIRCUIT_BREAKER,      // Emergency transaction halt
        LIQUIDITY_PROTECTION  // Protect against large trades
    }

    // Protection mechanism states
    struct ProtectionMechanism {
        DefenseStrategy strategy;
        bool active;
        uint256 triggerThreshold;
        uint256 maxDelay;
        uint256 gasPremium;
        bytes parameters;
    }

    struct DelayedTransaction {
        bytes32 txId;
        address from;
        address to;
        uint256 value;
        bytes data;
        uint256 delayUntil;
        bool executed;
        DefenseStrategy strategy;
    }

    struct CircuitBreaker {
        bool active;
        uint256 triggeredAt;
        uint256 duration;
        string reason;
        address triggeredBy;
    }

    // State variables
    mapping(PodiumGuardCore.AttackType => ProtectionMechanism) public protectionMechanisms;
    mapping(bytes32 => DelayedTransaction) public delayedTransactions;
    mapping(address => CircuitBreaker) public circuitBreakers;
    mapping(address => uint256) public lastTransactionTime;
    mapping(address => uint256) public transactionCount;
    
    uint256 public totalProtectedTransactions;
    uint256 public totalDelayedTransactions;
    uint256 public emergencyDelay = 60; // seconds

    // Events
    event ProtectionTriggered(
        bytes32 indexed txId,
        address indexed user,
        DefenseStrategy strategy,
        uint256 delay,
        string reason
    );

    event TransactionDelayed(
        bytes32 indexed txId,
        address indexed from,
        address indexed to,
        uint256 delay,
        DefenseStrategy strategy
    );

    event TransactionExecuted(bytes32 indexed txId, bool success);
    
    event CircuitBreakerActivated(
        address indexed target,
        uint256 duration,
        string reason,
        address triggeredBy
    );

    event EmergencyProtectionActivated(
        address indexed user,
        string mechanism,
        uint256 timestamp
    );

    constructor(address _coreContract, address _aiOracle) {
        coreContract = PodiumGuardCore(_coreContract);
        aiOracle = AIOracle(_aiOracle);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        _initializeProtectionMechanisms();
    }

    /**
     * @dev Initialize default protection mechanisms
     */
    function _initializeProtectionMechanisms() internal {
        // Frontrunning protection
        protectionMechanisms[PodiumGuardCore.AttackType.FRONTRUN] = ProtectionMechanism({
            strategy: DefenseStrategy.TRANSACTION_DELAY,
            active: true,
            triggerThreshold: 70,
            maxDelay: 60,
            gasPremium: 110, // 10% gas premium
            parameters: abi.encode("frontrun_protection_v1")
        });

        // Sandwich attack protection
        protectionMechanisms[PodiumGuardCore.AttackType.SANDWICH] = ProtectionMechanism({
            strategy: DefenseStrategy.SANDWICH_PROTECTION,
            active: true,
            triggerThreshold: 80,
            maxDelay: 120,
            gasPremium: 150, // 50% gas premium
            parameters: abi.encode("sandwich_protection_v1")
        });

        // Flash loan protection
        protectionMechanisms[PodiumGuardCore.AttackType.FLASHLOAN] = ProtectionMechanism({
            strategy: DefenseStrategy.CIRCUIT_BREAKER,
            active: true,
            triggerThreshold: 90,
            maxDelay: 300,
            gasPremium: 0,
            parameters: abi.encode("flashloan_protection_v1")
        });

        // Liquidation protection
        protectionMechanisms[PodiumGuardCore.AttackType.LIQUIDATION] = ProtectionMechanism({
            strategy: DefenseStrategy.LIQUIDITY_PROTECTION,
            active: true,
            triggerThreshold: 85,
            maxDelay: 180,
            gasPremium: 120,
            parameters: abi.encode("liquidation_protection_v1")
        });
    }

    /**
     * @dev Analyze and potentially protect a transaction
     * @param txId Unique transaction identifier
     * @param from Transaction sender
     * @param to Transaction recipient
     * @param value Transaction value
     * @param data Transaction data
     * @param gasPrice Proposed gas price
     */
    function analyzeAndProtect(
        bytes32 txId,
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        uint256 gasPrice
    ) external nonReentrant returns (bool shouldDelay, uint256 delaySeconds) {
        // Check if user has protection enabled
        (bool isProtected,,,) = coreContract.getProtectionStatus(from);
        if (!isProtected) {
            return (false, 0);
        }

        // Check circuit breaker
        if (circuitBreakers[to].active) {
            if (block.timestamp < circuitBreakers[to].triggeredAt + circuitBreakers[to].duration) {
                return (true, circuitBreakers[to].triggeredAt + circuitBreakers[to].duration - block.timestamp);
            } else {
                circuitBreakers[to].active = false;
            }
        }

        // Analyze transaction patterns
        DefenseStrategy strategy = _analyzeTransactionPattern(from, to, value, data, gasPrice);
        
        if (strategy == DefenseStrategy.PASSIVE_MONITOR) {
            return (false, 0);
        }

        // Calculate delay based on strategy
        uint256 delay = _calculateDelay(strategy, from, to, value);
        
        if (delay > 0) {
            _delayTransaction(txId, from, to, value, data, delay, strategy);
            return (true, delay);
        }

        return (false, 0);
    }

    /**
     * @dev Analyze transaction pattern to determine protection strategy
     */
    function _analyzeTransactionPattern(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        uint256 gasPrice
    ) internal returns (DefenseStrategy) {
        // Check for rapid transaction patterns (potential MEV)
        uint256 timeSinceLastTx = block.timestamp - lastTransactionTime[from];
        lastTransactionTime[from] = block.timestamp;
        transactionCount[from]++;

        // Rapid transactions (< 5 seconds apart)
        if (timeSinceLastTx < 5) {
            return DefenseStrategy.TRANSACTION_DELAY;
        }

        // High gas price (potential frontrunning)
        uint256 averageGasPrice = _getAverageGasPrice();
        if (gasPrice > averageGasPrice * 150 / 100) { // 50% above average
            return DefenseStrategy.GAS_PRICE_PROTECTION;
        }

        // Large value transactions
        if (value > 10 ether) {
            return DefenseStrategy.LIQUIDITY_PROTECTION;
        }

        // Complex contract interactions
        if (data.length > 100 && to.isContract()) {
            return DefenseStrategy.SANDWICH_PROTECTION;
        }

        return DefenseStrategy.PASSIVE_MONITOR;
    }

    /**
     * @dev Calculate delay based on strategy and transaction characteristics
     */
    function _calculateDelay(
        DefenseStrategy strategy,
        address from,
        address to,
        uint256 value
    ) internal view returns (uint256) {
        if (strategy == DefenseStrategy.PASSIVE_MONITOR) {
            return 0;
        }

        if (strategy == DefenseStrategy.TRANSACTION_DELAY) {
            return 30; // Base delay of 30 seconds
        }

        if (strategy == DefenseStrategy.GAS_PRICE_PROTECTION) {
            return 45; // 45 second delay for gas price protection
        }

        if (strategy == DefenseStrategy.SANDWICH_PROTECTION) {
            return 60; // 1 minute delay for sandwich protection
        }

        if (strategy == DefenseStrategy.LIQUIDITY_PROTECTION) {
            // Longer delay for larger transactions
            if (value > 100 ether) return 300; // 5 minutes
            if (value > 50 ether) return 180;  // 3 minutes
            return 120; // 2 minutes
        }

        if (strategy == DefenseStrategy.CIRCUIT_BREAKER) {
            _activateCircuitBreaker(to, "High-risk transaction detected");
            return 600; // 10 minutes
        }

        return emergencyDelay;
    }

    /**
     * @dev Delay a transaction for protection
     */
    function _delayTransaction(
        bytes32 txId,
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        uint256 delay,
        DefenseStrategy strategy
    ) internal {
        delayedTransactions[txId] = DelayedTransaction({
            txId: txId,
            from: from,
            to: to,
            value: value,
            data: data,
            delayUntil: block.timestamp + delay,
            executed: false,
            strategy: strategy
        });

        totalDelayedTransactions++;

        emit TransactionDelayed(txId, from, to, delay, strategy);
        emit ProtectionTriggered(
            txId,
            from,
            strategy,
            delay,
            "Automated protection activated"
        );
    }

    /**
     * @dev Execute a delayed transaction
     */
    function executeDelayedTransaction(bytes32 txId) external nonReentrant {
        DelayedTransaction storage delayed = delayedTransactions[txId];
        require(delayed.txId != bytes32(0), "Transaction not found");
        require(!delayed.executed, "Transaction already executed");
        require(block.timestamp >= delayed.delayUntil, "Delay period not complete");

        delayed.executed = true;

        // Execute the transaction
        bool success = _executeTransaction(delayed.from, delayed.to, delayed.value, delayed.data);
        
        emit TransactionExecuted(txId, success);
        
        if (success) {
            totalProtectedTransactions++;
        }
    }

    /**
     * @dev Execute transaction with proper error handling
     */
    function _executeTransaction(
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal returns (bool) {
        // In a real implementation, this would require proper authorization
        // This is a simplified version for demonstration
        if (to.isContract()) {
            (bool success,) = to.call{value: value}(data);
            return success;
        } else {
            (bool success,) = to.call{value: value}("");
            return success;
        }
    }

    /**
     * @dev Activate circuit breaker for an address
     */
    function _activateCircuitBreaker(address target, string memory reason) internal {
        circuitBreakers[target] = CircuitBreaker({
            active: true,
            triggeredAt: block.timestamp,
            duration: 3600, // 1 hour default
            reason: reason,
            triggeredBy: msg.sender
        });

        emit CircuitBreakerActivated(target, 3600, reason, msg.sender);
    }

    /**
     * @dev Manual circuit breaker activation (admin only)
     */
    function activateCircuitBreaker(
        address target,
        uint256 duration,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        circuitBreakers[target] = CircuitBreaker({
            active: true,
            triggeredAt: block.timestamp,
            duration: duration,
            reason: reason,
            triggeredBy: msg.sender
        });

        emit CircuitBreakerActivated(target, duration, reason, msg.sender);
    }

    /**
     * @dev Emergency protection for immediate threats
     */
    function emergencyProtection(address user, string calldata mechanism) external {
        require(
            hasRole(coreContract.EMERGENCY_ROLE(), msg.sender) ||
            hasRole(coreContract.GUARDIAN_ROLE(), msg.sender),
            "Not authorized for emergency protection"
        );

        // Implement emergency protection logic
        _activateCircuitBreaker(user, string(abi.encodePacked("Emergency: ", mechanism)));
        
        emit EmergencyProtectionActivated(user, mechanism, block.timestamp);
    }

    /**
     * @dev Update protection mechanism configuration
     */
    function updateProtectionMechanism(
        PodiumGuardCore.AttackType attackType,
        DefenseStrategy strategy,
        bool active,
        uint256 triggerThreshold,
        uint256 maxDelay,
        uint256 gasPremium,
        bytes calldata parameters
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        protectionMechanisms[attackType] = ProtectionMechanism({
            strategy: strategy,
            active: active,
            triggerThreshold: triggerThreshold,
            maxDelay: maxDelay,
            gasPremium: gasPremium,
            parameters: parameters
        });
    }

    /**
     * @dev Get average gas price (simplified implementation)
     */
    function _getAverageGasPrice() internal view returns (uint256) {
        // In a real implementation, this would calculate from recent blocks
        return 20 gwei; // Placeholder
    }

    /**
     * @dev Get delayed transaction details
     */
    function getDelayedTransaction(bytes32 txId) external view returns (DelayedTransaction memory) {
        return delayedTransactions[txId];
    }

    /**
     * @dev Get protection statistics
     */
    function getProtectionStats() external view returns (
        uint256 totalProtected,
        uint256 totalDelayed,
        uint256 activeCircuitBreakers
    ) {
        return (totalProtectedTransactions, totalDelayedTransactions, 0); // Simplified
    }

    /**
     * @dev Check if address has active circuit breaker
     */
    function hasActiveCircuitBreaker(address target) external view returns (bool, uint256) {
        CircuitBreaker memory breaker = circuitBreakers[target];
        if (!breaker.active) return (false, 0);
        
        uint256 remainingTime = 0;
        if (block.timestamp < breaker.triggeredAt + breaker.duration) {
            remainingTime = breaker.triggeredAt + breaker.duration - block.timestamp;
            return (true, remainingTime);
        }
        return (false, 0);
    }
}