import express from 'express';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// POST /api/simulate - Simulate attack to test dashboard
router.post('/', async (req, res) => {
  try {
    const { 
      attackType = 'frontrunning', 
      parameters = {},
      count = 1,
      delay = 1000 // milliseconds between simulations
    } = req.body;

    // Validate attack type
    const validAttackTypes = ['frontrunning', 'sandwich', 'mev_bot', 'arbitrage', 'high_risk'];
    if (!validAttackTypes.includes(attackType)) {
      return res.status(400).json({
        error: 'Invalid attack type',
        message: `Attack type must be one of: ${validAttackTypes.join(', ')}`,
        validTypes: validAttackTypes
      });
    }

    // Validate parameters
    if (count < 1 || count > 10) {
      return res.status(400).json({
        error: 'Invalid count',
        message: 'Count must be between 1 and 10'
      });
    }

    if (delay < 100 || delay > 10000) {
      return res.status(400).json({
        error: 'Invalid delay',
        message: 'Delay must be between 100ms and 10000ms'
      });
    }

    const aiService = global.aiService || req.app.locals.aiService;
    
    if (!aiService) {
      return res.status(503).json({
        error: 'AI service not available',
        message: 'AI service is not initialized'
      });
    }

    logger.info(`Simulating ${count} ${attackType} attack(s)`);

    const simulations = [];
    
    // Run simulations
    for (let i = 0; i < count; i++) {
      try {
        // Add variation to parameters for each simulation
        const variedParameters = {
          ...parameters,
          value: parameters.value || (Math.random() * 10 + 1).toFixed(4), // 1-11 ETH
          gasMultiplier: parameters.gasMultiplier || (1.5 + Math.random() * 2), // 1.5-3.5x
          simulationIndex: i + 1
        };

        const simulation = await aiService.simulateAttack(attackType, variedParameters);
        
        simulations.push({
          index: i + 1,
          ...simulation,
          timestamp: new Date().toISOString()
        });

        // Process simulation through the normal detection pipeline
        await processSimulationThroughPipeline(simulation, req.app.locals);

        // Add delay between simulations (except for the last one)
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        logger.error(`Error in simulation ${i + 1}:`, error);
        simulations.push({
          index: i + 1,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Calculate simulation summary
    const successfulSimulations = simulations.filter(sim => !sim.error);
    const averageRiskScore = successfulSimulations.length > 0 
      ? successfulSimulations.reduce((sum, sim) => sum + sim.riskScore, 0) / successfulSimulations.length 
      : 0;

    res.json({
      message: `Simulation completed: ${successfulSimulations.length}/${count} successful`,
      attackType,
      parameters,
      simulations,
      summary: {
        total: count,
        successful: successfulSimulations.length,
        failed: simulations.length - successfulSimulations.length,
        averageRiskScore: Math.round(averageRiskScore * 100) / 100,
        highRiskCount: successfulSimulations.filter(sim => sim.riskScore >= 75).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in simulation endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to run simulation'
    });
  }
});

// POST /api/simulate/custom - Custom simulation with specific transaction data
router.post('/custom', async (req, res) => {
  try {
    const { transactionData } = req.body;

    if (!transactionData) {
      return res.status(400).json({
        error: 'Missing transaction data',
        message: 'transactionData is required'
      });
    }

    // Validate required fields
    const requiredFields = ['txHash', 'from', 'to', 'value'];
    const missingFields = requiredFields.filter(field => !transactionData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: `Missing fields: ${missingFields.join(', ')}`,
        requiredFields
      });
    }

    const aiService = global.aiService || req.app.locals.aiService;
    
    if (!aiService) {
      return res.status(503).json({
        error: 'AI service not available',
        message: 'AI service is not initialized'
      });
    }

    logger.info(`Running custom simulation for transaction: ${transactionData.txHash}`);

    // Add simulation metadata
    const enhancedTransactionData = {
      ...transactionData,
      timestamp: transactionData.timestamp || new Date().toISOString(),
      simulated: true,
      simulationType: 'custom'
    };

    // Analyze the transaction
    const analysis = await aiService.analyzeTransaction(enhancedTransactionData);

    // Process through pipeline
    await processSimulationThroughPipeline(
      { ...analysis, syntheticTransaction: enhancedTransactionData },
      req.app.locals
    );

    res.json({
      message: 'Custom simulation completed',
      transactionData: enhancedTransactionData,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in custom simulation:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to run custom simulation'
    });
  }
});

// GET /api/simulate/presets - Get available simulation presets
router.get('/presets', (req, res) => {
  try {
    const presets = {
      frontrunning: {
        name: 'Frontrunning Attack',
        description: 'Simulates a transaction that tries to frontrun another transaction with higher gas',
        defaultParameters: {
          value: '2.5',
          gasMultiplier: 2.0,
          targetFunction: 'swapExactTokensForTokens'
        }
      },
      sandwich: {
        name: 'Sandwich Attack',
        description: 'Simulates a sandwich attack with front and back transactions',
        defaultParameters: {
          value: '5.0',
          gasMultiplier: 3.0,
          targetFunction: 'swapExactETHForTokens'
        }
      },
      mev_bot: {
        name: 'MEV Bot Transaction',
        description: 'Simulates a transaction from a known MEV bot address',
        defaultParameters: {
          value: '1.0',
          gasMultiplier: 1.8,
          botType: 'arbitrage'
        }
      },
      arbitrage: {
        name: 'Arbitrage Opportunity',
        description: 'Simulates an arbitrage transaction across multiple DEXs',
        defaultParameters: {
          value: '10.0',
          gasMultiplier: 1.5,
          profit: '0.5'
        }
      },
      high_risk: {
        name: 'High Risk Transaction',
        description: 'Simulates a transaction with multiple risk factors',
        defaultParameters: {
          value: '25.0',
          gasMultiplier: 4.0,
          complexData: true
        }
      }
    };

    res.json({
      presets,
      usage: {
        endpoint: '/api/simulate',
        method: 'POST',
        parameters: {
          attackType: 'One of the preset keys',
          parameters: 'Optional parameters to override defaults',
          count: 'Number of simulations (1-10)',
          delay: 'Delay between simulations in ms (100-10000)'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting simulation presets:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get simulation presets'
    });
  }
});

// POST /api/simulate/stress-test - Run stress test with multiple attack types
router.post('/stress-test', async (req, res) => {
  try {
    const { 
      duration = 60, // seconds
      attacksPerMinute = 10,
      attackTypes = ['frontrunning', 'sandwich', 'mev_bot'],
      randomize = true
    } = req.body;

    // Validate parameters
    if (duration < 10 || duration > 600) { // 10 seconds to 10 minutes
      return res.status(400).json({
        error: 'Invalid duration',
        message: 'Duration must be between 10 and 600 seconds'
      });
    }

    if (attacksPerMinute < 1 || attacksPerMinute > 60) {
      return res.status(400).json({
        error: 'Invalid attacks per minute',
        message: 'Attacks per minute must be between 1 and 60'
      });
    }

    const aiService = global.aiService || req.app.locals.aiService;
    
    if (!aiService) {
      return res.status(503).json({
        error: 'AI service not available',
        message: 'AI service is not initialized'
      });
    }

    logger.info(`Starting stress test: ${duration}s duration, ${attacksPerMinute} attacks/min`);

    const testStartTime = Date.now();
    const testResults = [];
    const intervalMs = (60 * 1000) / attacksPerMinute; // Interval between attacks

    // Start stress test
    const stressTestPromise = new Promise(async (resolve) => {
      const interval = setInterval(async () => {
        try {
          // Check if test duration has elapsed
          if (Date.now() - testStartTime >= duration * 1000) {
            clearInterval(interval);
            resolve(testResults);
            return;
          }

          // Select random attack type
          const attackType = randomize 
            ? attackTypes[Math.floor(Math.random() * attackTypes.length)]
            : attackTypes[testResults.length % attackTypes.length];

          // Generate random parameters
          const parameters = {
            value: (Math.random() * 20 + 1).toFixed(4),
            gasMultiplier: 1.5 + Math.random() * 2.5,
            stressTest: true,
            testIndex: testResults.length + 1
          };

          const simulation = await aiService.simulateAttack(attackType, parameters);
          
          testResults.push({
            index: testResults.length + 1,
            attackType,
            riskScore: simulation.riskScore,
            timestamp: new Date().toISOString(),
            elapsedTime: Math.round((Date.now() - testStartTime) / 1000)
          });

          // Process through pipeline
          await processSimulationThroughPipeline(simulation, req.app.locals);

        } catch (error) {
          logger.error('Stress test simulation error:', error);
          testResults.push({
            index: testResults.length + 1,
            error: error.message,
            timestamp: new Date().toISOString(),
            elapsedTime: Math.round((Date.now() - testStartTime) / 1000)
          });
        }
      }, intervalMs);
    });

    // Wait for stress test to complete
    const results = await stressTestPromise;

    // Calculate statistics
    const successfulTests = results.filter(r => !r.error);
    const averageRiskScore = successfulTests.length > 0
      ? successfulTests.reduce((sum, r) => sum + r.riskScore, 0) / successfulTests.length
      : 0;

    const actualDuration = Math.round((Date.now() - testStartTime) / 1000);

    logger.info(`Stress test completed: ${successfulTests.length}/${results.length} successful attacks`);

    res.json({
      message: 'Stress test completed',
      configuration: {
        duration,
        attacksPerMinute,
        attackTypes,
        randomize
      },
      results: {
        totalAttacks: results.length,
        successfulAttacks: successfulTests.length,
        failedAttacks: results.length - successfulTests.length,
        averageRiskScore: Math.round(averageRiskScore * 100) / 100,
        highRiskAttacks: successfulTests.filter(r => r.riskScore >= 75).length,
        actualDuration: actualDuration,
        attackRate: Math.round((results.length / actualDuration) * 60 * 100) / 100 // attacks per minute
      },
      timeline: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in stress test:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to run stress test'
    });
  }
});

// Helper function to process simulation through the detection pipeline
async function processSimulationThroughPipeline(simulation, services) {
  try {
    const { contractService, safeModeService } = services;
    const transactionData = simulation.syntheticTransaction;

    // Store in database
    const { default: Detection } = await import('../models/Detection.js');
    
    const detection = new Detection({
      txHash: transactionData.txHash,
      from: transactionData.from,
      to: transactionData.to,
      value: transactionData.value,
      gasPrice: transactionData.gasPrice || '0',
      nonce: transactionData.nonce || 0,
      timestamp: new Date(transactionData.timestamp),
      riskScore: simulation.riskScore,
      category: simulation.category,
      riskFactors: simulation.riskFactors || [],
      mitigated: false,
      blockNumber: transactionData.blockNumber,
      simulated: true,
      simulationType: simulation.attackType || 'unknown'
    });

    await detection.save();

    // Log to contract if high risk
    if (simulation.riskScore > 75 && contractService) {
      await contractService.logDetection(transactionData, simulation);
    }

    // Check safe mode
    if (safeModeService) {
      safeModeService.recordDetection(simulation.riskScore);
    }

    // Broadcast via WebSocket
    if (global.io) {
      global.io.emit('simulation_result', {
        type: 'simulation',
        simulation,
        detection: detection.toObject(),
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Error processing simulation through pipeline:', error);
  }
}

export default router;