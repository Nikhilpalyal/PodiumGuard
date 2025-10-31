import winston from 'winston';

// Logger setup for insurance service
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'insurance-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/insurance.log', level: 'info' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class InsuranceService {
  constructor(io) {
    this.io = io;
    this.premiumMembers = new Map(); // address -> { premiumAmount, joinDate }
    this.poolBalance = 42.5; // Initial pool balance in ETH
    this.claims = new Map(); // claimId -> claim data
    this.nextClaimId = 1;
  }

  // Initialize service
  async initialize() {
    logger.info('Insurance Service initialized');
    // Load initial data if needed
    this.premiumMembers.set('0x742d35Cc6634C0532925a3b844Bc454e4438f44e', { premiumAmount: 0.1, joinDate: new Date() });
    this.premiumMembers.set('0x742d35Cc6634C0532925a3b844Bc454e4438f44f', { premiumAmount: 0.15, joinDate: new Date() });
    // Add more initial members to reach 128
    for (let i = 2; i < 128; i++) {
      const address = `0x${Math.random().toString(16).substr(2, 40)}`;
      this.premiumMembers.set(address, {
        premiumAmount: Math.random() * 0.5 + 0.05,
        joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      });
    }
  }

  // Get current insurance statistics
  getStats() {
    return {
      premiumMembers: this.premiumMembers.size,
      poolBalance: this.poolBalance,
      totalPremiums: Array.from(this.premiumMembers.values()).reduce((sum, member) => sum + member.premiumAmount, 0),
      activeClaims: Array.from(this.claims.values()).filter(claim => claim.status === 'verifying').length
    };
  }

  // Get pool data for frontend display
  getPoolData() {
    return {
      activeMembers: this.premiumMembers.size,
      poolBalance: this.poolBalance,
      totalPremiums: Array.from(this.premiumMembers.values()).reduce((sum, member) => sum + member.premiumAmount, 0),
      activeClaims: Array.from(this.claims.values()).filter(claim => claim.status === 'verifying').length,
      totalClaims: this.claims.size,
      approvedClaims: Array.from(this.claims.values()).filter(claim => claim.status === 'approved').length,
      rejectedClaims: Array.from(this.claims.values()).filter(claim => claim.status === 'rejected').length
    };
  }

  // Update pool data (recalculate)
  updatePool() {
    const totalPremiums = Array.from(this.premiumMembers.values()).reduce((sum, member) => sum + member.premiumAmount, 0);
    // Pool balance is 50% of total premiums
    this.poolBalance = totalPremiums * 0.5;

    logger.info(`Pool updated: ${this.premiumMembers.size} members, balance: ${this.poolBalance} ETH`);

    // Emit real-time update
    this.emitUpdate();

    return this.getPoolData();
  }

  // Add a new premium member
  addPremiumMember(address, premiumAmount) {
    if (this.premiumMembers.has(address)) {
      logger.warn(`Address ${address} is already a premium member`);
      return false;
    }

    this.premiumMembers.set(address, {
      premiumAmount: premiumAmount,
      joinDate: new Date()
    });

    // Add 5% of premium to pool balance
    const poolContribution = premiumAmount * 0.05;
    this.poolBalance += poolContribution;

    logger.info(`New premium member added: ${address}, premium: ${premiumAmount} ETH, pool contribution: ${poolContribution} ETH`);

    // Emit real-time update
    this.emitUpdate();

    return true;
  }

  // Verify blockchain certificate (simulated)
  async verifyCertificate(certificateHash) {
    logger.info(`Verifying certificate: ${certificateHash}`);

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate 80% success rate for demo
    const isValid = Math.random() < 0.8;

    logger.info(`Certificate ${certificateHash} verification result: ${isValid ? 'VALID' : 'INVALID'}`);

    return isValid;
  }

  // Submit a claim
  async submitClaim(certificateHash, claimantAddress) {
    const claimId = this.nextClaimId++;
    const claim = {
      id: claimId,
      certificateHash,
      claimantAddress,
      status: 'verifying',
      submittedAt: new Date(),
      compensation: 0
    };

    this.claims.set(claimId, claim);
    logger.info(`Claim submitted: ${claimId} for certificate ${certificateHash}`);

    // Start verification process
    const isValid = await this.verifyCertificate(certificateHash);

    if (isValid) {
      // Calculate compensation (fixed amount for demo)
      const compensation = 1.0; // 1 ETH compensation

      if (this.poolBalance >= compensation) {
        this.poolBalance -= compensation;
        claim.status = 'approved';
        claim.compensation = compensation;
        claim.processedAt = new Date();

        logger.info(`Claim ${claimId} approved, compensation: ${compensation} ETH, new pool balance: ${this.poolBalance} ETH`);

        // Emit real-time update
        this.emitUpdate();

        return {
          success: true,
          claimId,
          compensation,
          newPoolBalance: this.poolBalance
        };
      } else {
        claim.status = 'rejected';
        claim.rejectionReason = 'Insufficient pool funds';
        logger.warn(`Claim ${claimId} rejected: insufficient pool funds`);
      }
    } else {
      claim.status = 'rejected';
      claim.rejectionReason = 'Invalid certificate';
      logger.warn(`Claim ${claimId} rejected: invalid certificate`);
    }

    claim.processedAt = new Date();

    // Emit real-time update
    this.emitUpdate();

    return {
      success: false,
      claimId,
      reason: claim.rejectionReason
    };
  }

  // Get claim status
  getClaimStatus(claimId) {
    return this.claims.get(claimId) || null;
  }

  // Emit real-time updates to frontend
  emitUpdate() {
    if (this.io) {
      this.io.emit('insurance-update', this.getStats());
    }
  }

  // Get all premium members (for admin purposes)
  getPremiumMembers() {
    return Array.from(this.premiumMembers.entries()).map(([address, data]) => ({
      address,
      ...data
    }));
  }

  // Get all claims (for admin purposes)
  getClaims() {
    return Array.from(this.claims.values());
  }
}

export default InsuranceService;