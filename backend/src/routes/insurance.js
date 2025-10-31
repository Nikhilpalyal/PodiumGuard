import express from 'express';
import InsuranceService from '../services/insuranceService.js';

const router = express.Router();

// Initialize insurance service (will be injected by server)
let insuranceService = null;

export const setInsuranceService = (service) => {
  insuranceService = service;
};

// GET /api/insurance/stats - Get current insurance pool statistics
router.get('/stats', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const stats = insuranceService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching insurance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insurance statistics'
    });
  }
});

// POST /api/insurance/claim - Submit a claim for compensation
router.post('/claim', async (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const { certificateHash, claimantAddress } = req.body;

    if (!certificateHash) {
      return res.status(400).json({
        success: false,
        error: 'Certificate hash is required'
      });
    }

    // Use a default claimant address if not provided (for demo purposes)
    const claimant = claimantAddress || '0x' + Math.random().toString(16).substr(2, 40);

    const result = await insuranceService.submitClaim(certificateHash, claimant);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error submitting claim:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit claim'
    });
  }
});

// GET /api/insurance/claim/:id - Get claim status by ID
router.get('/claim/:id', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const claimId = parseInt(req.params.id);
    const claim = insuranceService.getClaimStatus(claimId);

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Error fetching claim status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch claim status'
    });
  }
});

// POST /api/insurance/join - Add a new premium member with payment processing
router.post('/join', async (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const {
      address,
      premiumAmount,
      name,
      tier,
      paymentMethod,
      transactionHash,
      paymentId
    } = req.body;

    if (!address || !premiumAmount) {
      return res.status(400).json({
        success: false,
        error: 'Address and premium amount are required'
      });
    }

    // Process payment through payment gateway simulation
    const paymentResult = await processPaymentGateway({
      amount: parseFloat(premiumAmount),
      paymentMethod: paymentMethod || 'crypto',
      paymentId: paymentId || `PAY_${Date.now()}`,
      customerAddress: address
    });

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: `Payment failed: ${paymentResult.error}`
      });
    }

    // Add premium member to insurance pool
    const success = insuranceService.addPremiumMember(
      address,
      parseFloat(premiumAmount),
      name || 'Anonymous',
      tier || 'basic'
    );

    if (!success) {
      return res.status(409).json({
        success: false,
        error: 'Address is already a premium member'
      });
    }

    // Record transaction details
    const transactionRecord = {
      id: paymentResult.transactionId,
      paymentId: paymentResult.paymentId,
      amount: parseFloat(premiumAmount),
      paymentMethod: paymentMethod || 'crypto',
      blockchainTx: transactionHash,
      timestamp: new Date(),
      status: 'completed',
      customerAddress: address,
      tier: tier || 'basic'
    };

    // Store transaction (in a real system, this would go to a database)
    console.log('Transaction recorded:', transactionRecord);

    res.json({
      success: true,
      message: 'Successfully joined insurance pool',
      data: {
        transactionId: paymentResult.transactionId,
        paymentId: paymentResult.paymentId,
        memberAddress: address,
        premiumAmount: parseFloat(premiumAmount),
        tier: tier || 'basic',
        poolContribution: parseFloat(premiumAmount) * 0.5
      }
    });
  } catch (error) {
    console.error('Error processing membership:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process membership'
    });
  }
});

// Simulate payment gateway processing
async function processPaymentGateway(paymentData) {
  try {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { amount, paymentMethod, paymentId, customerAddress } = paymentData;

    // Simulate payment success rate (95% success)
    const paymentSuccess = Math.random() > 0.05;

    if (!paymentSuccess) {
      return {
        success: false,
        error: 'Payment declined by gateway'
      };
    }

    // Generate transaction details based on payment method
    let transactionId;
    let gatewayResponse;

    switch (paymentMethod) {
      case 'card':
        transactionId = `CARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        gatewayResponse = {
          gateway: 'Stripe',
          last4: '4242',
          brand: 'Visa'
        };
        break;

      case 'upi':
        transactionId = `UPI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        gatewayResponse = {
          gateway: 'Razorpay',
          upiId: 'user@paytm',
          refNumber: Math.random().toString(36).substr(2, 12).toUpperCase()
        };
        break;

      case 'gpay':
        transactionId = `GPAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        gatewayResponse = {
          gateway: 'Google Pay',
          phone: '+91xxxxxxxxxx',
          transactionRef: `GPAY${Date.now()}`
        };
        break;

      case 'crypto':
      default:
        transactionId = `CRYPTO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        gatewayResponse = {
          gateway: 'MetaMask',
          network: 'Ethereum',
          gasUsed: Math.floor(Math.random() * 100000) + 21000
        };
        break;
    }

    return {
      success: true,
      transactionId,
      paymentId,
      amount,
      paymentMethod,
      gatewayResponse,
      processedAt: new Date(),
      status: 'completed'
    };

  } catch (error) {
    console.error('Payment gateway error:', error);
    return {
      success: false,
      error: 'Payment gateway error'
    };
  }
}

// GET /api/insurance/members - Get all premium members (admin endpoint)
router.get('/members', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const members = insuranceService.getPremiumMembers();
    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Error fetching premium members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch premium members'
    });
  }
});

// GET /api/insurance/claims - Get all claims (admin endpoint)
router.get('/claims', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const claims = insuranceService.getClaims();
    res.json({
      success: true,
      data: claims
    });
  } catch (error) {
    console.error('Error fetching claims:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch claims'
    });
  }
});

// POST /api/insurance/verify-certificate - Verify a blockchain certificate
router.post('/verify-certificate', async (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const { certificateHash, userAddress } = req.body;

    if (!certificateHash) {
      return res.status(400).json({
        success: false,
        error: 'Certificate hash is required'
      });
    }

    const result = await insuranceService.submitCertificate(certificateHash, userAddress || 'anonymous');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify certificate'
    });
  }
});

// GET /api/insurance/pool-data - Get current pool statistics
router.get('/pool-data', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const poolData = insuranceService.getPoolData();
    res.json({
      success: true,
      data: poolData
    });
  } catch (error) {
    console.error('Error fetching pool data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pool data'
    });
  }
});

// POST /api/insurance/update-pool - Recalculate and update pool data
router.post('/update-pool', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const updatedData = insuranceService.updatePool();
    res.json({
      success: true,
      data: updatedData
    });
  } catch (error) {
    console.error('Error updating pool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pool'
    });
  }
});

// GET /api/insurance/certificates - Get all certificates (admin endpoint)
router.get('/certificates', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const certificates = insuranceService.getCertificates();
    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch certificates'
    });
  }
});

// POST /api/insurance/train-model - Train AI model with new data (admin endpoint)
router.post('/train-model', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const { trainingData } = req.body;

    if (!trainingData || !Array.isArray(trainingData)) {
      return res.status(400).json({
        success: false,
        error: 'Training data must be an array'
      });
    }

    // Update AI model with new training data
    trainingData.forEach(sample => {
      insuranceService.fraudDetectionModel.updateModel(sample);
    });

    // Retrain model with new data
    insuranceService.fraudDetectionModel.trainModel();

    res.json({
      success: true,
      message: `AI model updated with ${trainingData.length} new samples`
    });
  } catch (error) {
    console.error('Error training AI model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to train AI model'
    });
  }
});

// GET /api/insurance/model-stats - Get AI model statistics
router.get('/model-stats', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const model = insuranceService.fraudDetectionModel;
    const stats = {
      trainingSamples: model.trainingData.legitimate.length + model.trainingData.fraudulent.length,
      legitimateSamples: model.trainingData.legitimate.length,
      fraudulentSamples: model.trainingData.fraudulent.length,
      confidenceThreshold: model.confidenceThreshold,
      features: Object.keys(model.weights),
      lastTrained: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching model stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch model statistics'
    });
  }
});

// GET /api/insurance/users - Get all users (admin endpoint)
router.get('/users', (req, res) => {
  try {
    if (!insuranceService) {
      return res.status(503).json({
        success: false,
        error: 'Insurance service not available'
      });
    }

    const users = insuranceService.getAllUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

export default router;