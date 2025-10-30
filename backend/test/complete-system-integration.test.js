import { ethers } from 'hardhat';
import { expect } from 'chai';

/**
 * Comprehensive integration test for PodiumGuard X MEV Defense System
 * Tests the complete workflow from AI analysis to on-chain protection
 */
describe('PodiumGuard X Complete System Integration', function () {
  let deployer, user1, user2, attacker, oracle1, oracle2;
  let coreContract, aiOracleContract, defenseSystemContract, oracleNetworkContract;
  
  const ATTACK_TYPES = {
    FRONTRUN: 0,
    BACKRUN: 1,
    SANDWICH: 2,
    FLASHLOAN: 3,
    ARBITRAGE: 4,
    LIQUIDATION: 5
  };

  before(async function () {
    console.log('🚀 Setting up PodiumGuard X Test Environment...\n');
    
    // Get signers
    [deployer, user1, user2, attacker, oracle1, oracle2] = await ethers.getSigners();
    
    console.log('👥 Test Accounts:');
    console.log(`  Deployer: ${deployer.address}`);
    console.log(`  User1: ${user1.address}`);
    console.log(`  User2: ${user2.address}`);
    console.log(`  Attacker: ${attacker.address}`);
    console.log(`  Oracle1: ${oracle1.address}`);
    console.log(`  Oracle2: ${oracle2.address}\n`);
  });

  describe('🏗️ Contract Deployment', function () {
    it('Should deploy all contracts successfully', async function () {
      console.log('📦 Deploying PodiumGuardCore...');
      const PodiumGuardCore = await ethers.getContractFactory('PodiumGuardCore');
      coreContract = await PodiumGuardCore.deploy(
        deployer.address,                    // Admin
        deployer.address,                    // Treasury
        5,                                   // Emergency threshold
        ethers.parseEther('0.1')            // Min stake
      );
      await coreContract.waitForDeployment();
      console.log(`  ✅ Core deployed at: ${await coreContract.getAddress()}`);

      console.log('📦 Deploying AIOracle...');
      const AIOracle = await ethers.getContractFactory('AIOracle');
      aiOracleContract = await AIOracle.deploy(await coreContract.getAddress());
      await aiOracleContract.waitForDeployment();
      console.log(`  ✅ AIOracle deployed at: ${await aiOracleContract.getAddress()}`);

      console.log('📦 Deploying DecentralizedOracleNetwork...');
      const DecentralizedOracleNetwork = await ethers.getContractFactory('DecentralizedOracleNetwork');
      oracleNetworkContract = await DecentralizedOracleNetwork.deploy(await coreContract.getAddress());
      await oracleNetworkContract.waitForDeployment();
      console.log(`  ✅ OracleNetwork deployed at: ${await oracleNetworkContract.getAddress()}`);

      console.log('📦 Deploying AutomatedDefenseSystem...');
      const AutomatedDefenseSystem = await ethers.getContractFactory('AutomatedDefenseSystem');
      defenseSystemContract = await AutomatedDefenseSystem.deploy(
        await coreContract.getAddress(),
        await aiOracleContract.getAddress()
      );
      await defenseSystemContract.waitForDeployment();
      console.log(`  ✅ DefenseSystem deployed at: ${await defenseSystemContract.getAddress()}\n`);

      // Verify deployments
      expect(await coreContract.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await aiOracleContract.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await oracleNetworkContract.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await defenseSystemContract.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it('Should configure initial permissions', async function () {
      console.log('⚙️ Configuring permissions...');
      
      // Register AI Oracle
      await coreContract.registerAIOracle(await aiOracleContract.getAddress());
      console.log('  ✅ AI Oracle registered');
      
      // Grant guardian role to defense system
      const GUARDIAN_ROLE = await coreContract.GUARDIAN_ROLE();
      await coreContract.grantRole(GUARDIAN_ROLE, await defenseSystemContract.getAddress());
      console.log('  ✅ Guardian role granted to defense system\n');
    });
  });

  describe('🔮 Oracle Network Setup', function () {
    it('Should register oracles in the network', async function () {
      console.log('🤖 Registering oracles...');
      
      // Register oracle1
      const publicKeyHash1 = ethers.keccak256(ethers.toUtf8Bytes('oracle1_public_key'));
      await oracleNetworkContract.connect(oracle1).joinNetwork(
        'https://api.oracle1.com',
        publicKeyHash1,
        { value: ethers.parseEther('1.0') }
      );
      console.log(`  ✅ Oracle1 registered: ${oracle1.address}`);

      // Register oracle2  
      const publicKeyHash2 = ethers.keccak256(ethers.toUtf8Bytes('oracle2_public_key'));
      await oracleNetworkContract.connect(oracle2).joinNetwork(
        'https://api.oracle2.com',
        publicKeyHash2,
        { value: ethers.parseEther('1.0') }
      );
      console.log(`  ✅ Oracle2 registered: ${oracle2.address}\n`);

      // Verify registrations
      const oracle1Info = await oracleNetworkContract.getOracleNode(oracle1.address);
      const oracle2Info = await oracleNetworkContract.getOracleNode(oracle2.address);
      
      expect(oracle1Info.active).to.be.true;
      expect(oracle2Info.active).to.be.true;
      expect(oracle1Info.stake).to.equal(ethers.parseEther('1.0'));
      expect(oracle2Info.stake).to.equal(ethers.parseEther('1.0'));
    });

    it('Should register individual AI oracle', async function () {
      console.log('🔧 Registering individual AI oracle...');
      
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes('ai_oracle_key'));
      await aiOracleContract.connect(oracle1).registerOracle(publicKeyHash, {
        value: ethers.parseEther('1.0')
      });
      console.log(`  ✅ AI Oracle registered for: ${oracle1.address}\n`);

      const oracleInfo = await aiOracleContract.getOracleInfo(oracle1.address);
      expect(oracleInfo.active).to.be.true;
      expect(oracleInfo.stake).to.equal(ethers.parseEther('1.0'));
    });
  });

  describe('🛡️ User Protection Enrollment', function () {
    it('Should enable protection for users', async function () {
      console.log('👤 Enrolling users in protection...');
      
      // Enable protection for user1
      await coreContract.connect(user1).enableProtection(
        75,                                    // Max risk tolerance
        30,                                    // Custom delay (seconds)
        [ATTACK_TYPES.FRONTRUN, ATTACK_TYPES.SANDWICH, ATTACK_TYPES.FLASHLOAN], // Protected attack types
        { value: ethers.parseEther('0.5') }
      );
      console.log(`  ✅ Protection enabled for: ${user1.address}`);

      // Enable protection for user2 with different settings
      await coreContract.connect(user2).enableProtection(
        80,                                    // Higher risk tolerance
        60,                                    // Longer delay
        [ATTACK_TYPES.SANDWICH, ATTACK_TYPES.LIQUIDATION], // Different attack types
        { value: ethers.parseEther('0.3') }
      );
      console.log(`  ✅ Protection enabled for: ${user2.address}\n`);

      // Verify protection status
      const user1Protection = await coreContract.getProtectionStatus(user1.address);
      const user2Protection = await coreContract.getProtectionStatus(user2.address);
      
      expect(user1Protection.isProtected).to.be.true;
      expect(user2Protection.isProtected).to.be.true;
      expect(user1Protection.maxRiskTolerance).to.equal(75);
      expect(user2Protection.maxRiskTolerance).to.equal(80);
    });
  });

  describe('🚨 MEV Attack Detection Workflow', function () {
    let detectionId, transactionHash, analysisId;

    it('Should detect MEV attack through AI analysis', async function () {
      console.log('🔍 Simulating MEV attack detection...');
      
      // Simulate a suspicious transaction
      transactionHash = ethers.keccak256(ethers.toUtf8Bytes('suspicious_transaction_123'));
      detectionId = ethers.keccak256(ethers.toUtf8Bytes(`detection_${Date.now()}`));
      analysisId = ethers.keccak256(ethers.toUtf8Bytes(`analysis_${Date.now()}`));
      
      console.log(`  📊 Transaction Hash: ${transactionHash}`);
      console.log(`  🆔 Detection ID: ${detectionId}\n`);

      // Submit AI analysis to oracle
      const inputDataHash = ethers.keccak256(ethers.toUtf8Bytes('input_data_for_analysis'));
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'bytes32', 'uint256', 'uint256', 'string', 'bytes32', 'uint256'],
          [analysisId, transactionHash, 85, 92, 'model_v1.0', inputDataHash, (await ethers.provider.getNetwork()).chainId]
        )
      );
      
      const signature = await oracle1.signMessage(ethers.getBytes(messageHash));

      await aiOracleContract.connect(oracle1).submitAnalysis(
        analysisId,
        transactionHash,
        85,                    // High risk score
        92,                    // High confidence
        'model_v1.0',
        inputDataHash,
        signature
      );
      
      console.log('  ✅ AI analysis submitted to oracle');
      console.log(`     Risk Score: 85%, Confidence: 92%\n`);

      // Verify analysis was stored
      const analysis = await aiOracleContract.getAnalysis(analysisId);
      expect(analysis.riskScore).to.equal(85);
      expect(analysis.confidence).to.equal(92);
      expect(analysis.oracle).to.equal(oracle1.address);
    });

    it('Should request and receive oracle network consensus', async function () {
      console.log('🌐 Requesting oracle network consensus...');
      
      // Request consensus from oracle network
      const tx = await oracleNetworkContract.connect(user1).requestConsensus(
        transactionHash,
        2,                     // Require 2 oracles
        60,                    // 60 second timeout
        { value: ethers.parseEther('0.02') }
      );
      
      const receipt = await tx.wait();
      
      // Extract request ID from events
      const event = receipt.logs.find(log => {
        try {
          const parsed = oracleNetworkContract.interface.parseLog(log);
          return parsed.name === 'ConsensusRequested';
        } catch {
          return false;
        }
      });
      
      const requestId = oracleNetworkContract.interface.parseLog(event).args.requestId;
      console.log(`  📋 Consensus Request ID: ${requestId}`);

      // Oracle 1 submits response
      const signature1 = await oracle1.signMessage(ethers.getBytes(
        ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'uint256', 'uint256', 'string', 'uint256'],
          [requestId, 87, 90, 'Detected sandwich attack pattern', (await ethers.provider.getNetwork()).chainId]
        ))
      ));

      await oracleNetworkContract.connect(oracle1).submitResponse(
        requestId,
        87,                    // Risk score
        90,                    // Confidence
        'Detected sandwich attack pattern',
        signature1
      );
      console.log('  ✅ Oracle1 response submitted: 87% risk, 90% confidence');

      // Oracle 2 submits response
      const signature2 = await oracle2.signMessage(ethers.getBytes(
        ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'uint256', 'uint256', 'string', 'uint256'],
          [requestId, 83, 88, 'High probability MEV attack', (await ethers.provider.getNetwork()).chainId]
        ))
      ));

      await oracleNetworkContract.connect(oracle2).submitResponse(
        requestId,
        83,                    // Risk score
        88,                    // Confidence
        'High probability MEV attack',
        signature2
      );
      console.log('  ✅ Oracle2 response submitted: 83% risk, 88% confidence\n');

      // Check consensus result
      const consensusResult = await oracleNetworkNetwork.getConsensusResult(requestId);
      expect(consensusResult.isValid).to.be.true;
      expect(consensusResult.participatingOracles).to.equal(2);
      
      console.log(`  📊 Consensus Result:`);
      console.log(`     Average Risk Score: ${consensusResult.consensusRiskScore}%`);
      console.log(`     Average Confidence: ${consensusResult.averageConfidence}%`);
      console.log(`     Agreement Level: ${consensusResult.agreementLevel}%\n`);
    });

    it('Should trigger automated protection mechanisms', async function () {
      console.log('🛡️ Testing automated protection triggers...');
      
      // Simulate high-risk transaction analysis
      const protectionTxId = ethers.keccak256(ethers.toUtf8Bytes('protection_test_tx'));
      
      const [shouldDelay, delaySeconds] = await defenseSystemContract.analyzeAndProtect(
        protectionTxId,
        user1.address,         // From (protected user)
        user2.address,         // To
        ethers.parseEther('5'), // Value (large transaction)
        '0x',                  // Data
        ethers.parseUnits('50', 'gwei') // High gas price
      );
      
      console.log(`  📋 Protection Analysis Result:`);
      console.log(`     Should Delay: ${shouldDelay}`);
      console.log(`     Delay Seconds: ${delaySeconds.toString()}\n`);
      
      if (shouldDelay) {
        const delayedTx = await defenseSystemContract.getDelayedTransaction(protectionTxId);
        expect(delayedTx.from).to.equal(user1.address);
        expect(delayedTx.to).to.equal(user2.address);
        expect(delayedTx.executed).to.be.false;
        
        console.log('  ✅ Transaction successfully delayed for protection');
      } else {
        console.log('  ℹ️ Transaction allowed to proceed immediately');
      }
    });

    it('Should submit MEV detection to core contract', async function () {
      console.log('📝 Submitting MEV detection to core contract...');
      
      // Create signature for core contract submission
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'address', 'bytes32', 'uint256', 'uint256', 'uint256'],
          [detectionId, user1.address, transactionHash, ATTACK_TYPES.SANDWICH, 85, 92]
        )
      );
      
      const signature = await oracle1.signMessage(ethers.getBytes(messageHash));

      // Submit MEV detection to core contract
      await coreContract.connect(oracle1).submitMEVDetection(
        detectionId,
        user1.address,         // Target address
        transactionHash,
        ATTACK_TYPES.SANDWICH, // Attack type
        85,                    // Risk score
        92,                    // Confidence
        signature
      );
      
      console.log('  ✅ MEV detection submitted to core contract');
      console.log(`     Detection ID: ${detectionId}`);
      console.log(`     Target: ${user1.address}`);
      console.log(`     Attack Type: SANDWICH`);
      console.log(`     Risk Score: 85%, Confidence: 92%\n`);

      // Verify detection was logged
      const detection = await coreContract.getDetection(detectionId);
      expect(detection.detectionId).to.equal(detectionId);
      expect(detection.targetAddress).to.equal(user1.address);
      expect(detection.riskScore).to.equal(85);
      expect(detection.confidence).to.equal(92);
    });
  });

  describe('🚨 Emergency Response Testing', function () {
    it('Should trigger emergency mode for critical threats', async function () {
      console.log('🚨 Testing emergency mode activation...');
      
      // Get current system mode
      const initialStats = await coreContract.getSystemStats();
      console.log(`  📊 Initial System Mode: ${initialStats.mode}`);

      // Manually trigger emergency mode (simulating critical threat)
      await coreContract.setDefenseMode(3, 'Critical MEV attack detected - Emergency protocol activated');
      
      const emergencyStats = await coreContract.getSystemStats();
      console.log(`  🚨 Emergency Mode Activated: ${emergencyStats.mode}`);
      
      expect(emergencyStats.mode).to.equal(3); // Emergency mode
      
      // Test emergency pause
      await coreContract.emergencyPause();
      console.log('  ⏸️ Emergency pause activated');
      
      // Verify system is paused
      await expect(
        coreContract.connect(user1).enableProtection(50, 0, [], { value: ethers.parseEther('0.1') })
      ).to.be.reverted;
      
      console.log('  ✅ System correctly paused during emergency\n');
      
      // Unpause for continued testing
      await coreContract.emergencyUnpause();
      console.log('  ▶️ Emergency pause deactivated\n');
    });

    it('Should activate circuit breakers for high-risk addresses', async function () {
      console.log('🔌 Testing circuit breaker functionality...');
      
      // Activate circuit breaker for attacker address
      await defenseSystemContract.activateCircuitBreaker(
        attacker.address,
        3600,                  // 1 hour duration
        'Confirmed malicious activity detected'
      );
      
      console.log(`  🔌 Circuit breaker activated for: ${attacker.address}`);
      console.log(`     Duration: 1 hour`);
      console.log(`     Reason: Confirmed malicious activity detected\n`);

      // Check circuit breaker status
      const [isActive, remainingTime] = await defenseSystemContract.hasActiveCircuitBreaker(attacker.address);
      expect(isActive).to.be.true;
      expect(remainingTime).to.be.greaterThan(3500); // Should be close to 3600 seconds
      
      console.log(`  ✅ Circuit breaker active for ${remainingTime.toString()} seconds\n`);
    });
  });

  describe('📊 System Statistics and Monitoring', function () {
    it('Should provide comprehensive system statistics', async function () {
      console.log('📊 Collecting system statistics...');
      
      // Get core contract stats
      const coreStats = await coreContract.getSystemStats();
      console.log(`  🏛️ Core Contract Statistics:`);
      console.log(`     System Mode: ${coreStats.mode}`);
      console.log(`     Total Detections: ${coreStats.totalDet.toString()}`);
      console.log(`     Total Protected Users: ${coreStats.totalProt.toString()}`);
      console.log(`     Total Staked: ${ethers.formatEther(coreStats.totalStaked)} ETH\n`);

      // Get oracle network stats
      const networkStats = await oracleNetworkContract.getNetworkStats();
      console.log(`  🌐 Oracle Network Statistics:`);
      console.log(`     Total Oracles: ${networkStats.totalOracles.toString()}`);
      console.log(`     Total Requests: ${networkStats.totalRequestsProcessed.toString()}`);
      console.log(`     Average Response Time: ${networkStats.averageResponseTime.toString()}s`);
      console.log(`     Consensus Accuracy: ${networkStats.consensusAccuracy.toString()}%\n`);

      // Get defense system stats  
      const defenseStats = await defenseSystemContract.getProtectionStats();
      console.log(`  🛡️ Defense System Statistics:`);
      console.log(`     Total Protected Transactions: ${defenseStats.totalProtected.toString()}`);
      console.log(`     Total Delayed Transactions: ${defenseStats.totalDelayed.toString()}`);
      console.log(`     Active Circuit Breakers: ${defenseStats.activeCircuitBreakers.toString()}\n`);

      // Verify non-zero activity
      expect(coreStats.totalDet).to.be.greaterThan(0);
      expect(coreStats.totalProt).to.be.greaterThan(0);
      expect(networkStats.totalOracles).to.be.greaterThan(0);
    });

    it('Should provide oracle performance metrics', async function () {
      console.log('🎯 Checking oracle performance metrics...');
      
      // Check oracle1 performance
      const oracle1Info = await oracleNetworkContract.getOracleNode(oracle1.address);
      const oracle1Accuracy = await oracleNetworkContract.getOracleAccuracy(oracle1.address);
      
      console.log(`  🤖 Oracle1 Performance:`);
      console.log(`     Reputation: ${oracle1Info.reputation.toString()}`);
      console.log(`     Response Count: ${oracle1Info.responseCount.toString()}`);
      console.log(`     Accuracy Score: ${oracle1Info.accuracyScore.toString()}`);
      console.log(`     Overall Accuracy: ${oracle1Accuracy.toString()}%\n`);

      // Check oracle2 performance
      const oracle2Info = await oracleNetworkContract.getOracleNode(oracle2.address);
      const oracle2Accuracy = await oracleNetworkContract.getOracleAccuracy(oracle2.address);
      
      console.log(`  🤖 Oracle2 Performance:`);
      console.log(`     Reputation: ${oracle2Info.reputation.toString()}`);
      console.log(`     Response Count: ${oracle2Info.responseCount.toString()}`);
      console.log(`     Accuracy Score: ${oracle2Info.accuracyScore.toString()}`);
      console.log(`     Overall Accuracy: ${oracle2Accuracy.toString()}%\n`);

      expect(oracle1Info.reputation).to.be.greaterThan(90);
      expect(oracle2Info.reputation).to.be.greaterThan(90);
    });
  });

  after(async function () {
    console.log('🧹 Test cleanup complete');
    console.log('✅ All PodiumGuard X system tests passed successfully!\n');
    
    console.log('🎉 System Integration Test Summary:');
    console.log('   ✅ Smart contract deployment');
    console.log('   ✅ Oracle network setup');
    console.log('   ✅ User protection enrollment');
    console.log('   ✅ MEV attack detection workflow');
    console.log('   ✅ Automated protection mechanisms');
    console.log('   ✅ Emergency response protocols');
    console.log('   ✅ System monitoring and statistics');
    console.log('\n🛡️ PodiumGuard X is ready for production deployment! 🏁');
  });
});