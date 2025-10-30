// Blockchain Service for MEV Defense Integration
// This service handles wallet connections and smart contract interactions

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isConnected = false;
    this.networkId = null;
    this.userAddress = null;
  }

  // Connect to MetaMask or other Web3 wallet
  async connectWallet() {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask not installed. Please install MetaMask to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      // Setup provider and signer (using ethers.js when available)
      if (window.ethers) {
        this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        this.networkId = (await this.provider.getNetwork()).chainId;
      }

      this.userAddress = accounts[0];
      this.isConnected = true;

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.userAddress = accounts[0];
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', (chainId) => {
        this.networkId = parseInt(chainId, 16);
        window.location.reload(); // Reload on network change
      });

      return this.userAddress;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  // Disconnect wallet
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isConnected = false;
    this.userAddress = null;
    this.networkId = null;
  }

  // Initialize smart contracts
  async initializeContracts() {
    if (!this.isConnected || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      // Contract addresses (these should be set after deployment)
      const contractAddresses = {
        PodiumGuardCore: process.env.REACT_APP_PODIUM_GUARD_ADDRESS || '0x742d35Cc6634C0532925a3b8D39b4b6C5bC947C7',
        AIOracle: process.env.REACT_APP_AI_ORACLE_ADDRESS || '0x8ba1f109551bD432803012645Hac136c776c4b4f',
        AutomatedDefenseSystem: process.env.REACT_APP_DEFENSE_SYSTEM_ADDRESS || '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
      };

      // Load contract ABIs and create contract instances
      for (const [name, address] of Object.entries(contractAddresses)) {
        if (address && address !== '0x' && window.ethers) {
          try {
            // In a real implementation, you'd load the actual ABI
            const mockABI = [
              "function enableProtection() external",
              "function disableProtection() external", 
              "function isProtected(address user) external view returns (bool)",
              "function submitMEVDetection(address target, uint8 attackType, uint256 riskScore) external",
              "event ProtectionEnabled(address indexed user)",
              "event MEVDetected(address indexed target, uint8 attackType, uint256 riskScore)"
            ];
            
            this.contracts[name] = new window.ethers.Contract(address, mockABI, this.signer);
          } catch (error) {
            console.warn(`Failed to initialize contract ${name}:`, error);
          }
        }
      }

      console.log('Smart contracts initialized:', Object.keys(this.contracts));
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  // Enable MEV protection for the user
  async enableProtection() {
    if (!this.contracts.PodiumGuardCore) {
      throw new Error('PodiumGuardCore contract not initialized');
    }

    try {
      const tx = await this.contracts.PodiumGuardCore.enableProtection({
        gasLimit: 100000 // Adjust gas limit as needed
      });
      
      console.log('Protection enabling transaction:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Protection enabled successfully:', receipt);
      
      return receipt;
    } catch (error) {
      console.error('Failed to enable protection:', error);
      throw error;
    }
  }

  // Disable MEV protection for the user
  async disableProtection() {
    if (!this.contracts.PodiumGuardCore) {
      throw new Error('PodiumGuardCore contract not initialized');
    }

    try {
      const tx = await this.contracts.PodiumGuardCore.disableProtection({
        gasLimit: 80000
      });
      
      const receipt = await tx.wait();
      console.log('Protection disabled successfully:', receipt);
      
      return receipt;
    } catch (error) {
      console.error('Failed to disable protection:', error);
      throw error;
    }
  }

  // Check if user has protection enabled
  async getProtectionStatus(address = null) {
    const targetAddress = address || this.userAddress;
    
    if (!targetAddress) {
      return false;
    }

    if (!this.contracts.PodiumGuardCore) {
      // Return mock data when contract not available
      return Math.random() > 0.5;
    }

    try {
      const isProtected = await this.contracts.PodiumGuardCore.isProtected(targetAddress);
      return isProtected;
    } catch (error) {
      console.error('Failed to get protection status:', error);
      return false;
    }
  }

  // Submit MEV detection to the blockchain
  async submitMEVDetection(targetAddress, attackType, riskScore) {
    if (!this.contracts.AIOracle) {
      throw new Error('AIOracle contract not initialized');
    }

    try {
      // Attack types mapping
      const attackTypes = {
        'SANDWICH': 0,
        'FRONTRUNNING': 1,
        'BACKRUNNING': 2,
        'ARBITRAGE': 3,
        'LIQUIDATION': 4
      };

      const attackTypeId = attackTypes[attackType] || 0;
      
      const tx = await this.contracts.AIOracle.submitMEVDetection(
        targetAddress,
        attackTypeId,
        riskScore,
        {
          gasLimit: 150000
        }
      );
      
      const receipt = await tx.wait();
      console.log('MEV detection submitted:', receipt);
      
      return receipt;
    } catch (error) {
      console.error('Failed to submit MEV detection:', error);
      throw error;
    }
  }

  // Listen for blockchain events
  setupEventListeners(callback) {
    if (!this.contracts.PodiumGuardCore) {
      console.warn('Cannot setup event listeners: PodiumGuardCore not initialized');
      return;
    }

    try {
      // Listen for protection events
      this.contracts.PodiumGuardCore.on('ProtectionEnabled', (user, event) => {
        callback({
          type: 'PROTECTION_ENABLED',
          user,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      // Listen for MEV detection events
      if (this.contracts.AIOracle) {
        this.contracts.AIOracle.on('MEVDetected', (target, attackType, riskScore, event) => {
          callback({
            type: 'MEV_DETECTED',
            target,
            attackType,
            riskScore: riskScore.toString(),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        });
      }

      console.log('Blockchain event listeners setup successfully');
    } catch (error) {
      console.error('Failed to setup event listeners:', error);
    }
  }

  // Get user's transaction history
  async getTransactionHistory(limit = 10) {
    if (!this.provider || !this.userAddress) {
      return [];
    }

    try {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 1000); // Last 1000 blocks
      
      // Get events related to user
      const events = [];
      
      if (this.contracts.PodiumGuardCore) {
        const protectionEvents = await this.contracts.PodiumGuardCore.queryFilter(
          this.contracts.PodiumGuardCore.filters.ProtectionEnabled(this.userAddress),
          fromBlock,
          latestBlock
        );
        
        events.push(...protectionEvents.map(event => ({
          type: 'PROTECTION_ENABLED',
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: null // Would need to fetch block to get timestamp
        })));
      }
      
      return events.slice(0, limit);
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  // Get network information
  getNetworkInfo() {
    const networks = {
      1: { name: 'Ethereum Mainnet', currency: 'ETH' },
      5: { name: 'Goerli Testnet', currency: 'ETH' },
      137: { name: 'Polygon Mainnet', currency: 'MATIC' },
      80001: { name: 'Mumbai Testnet', currency: 'MATIC' }
    };

    return {
      chainId: this.networkId,
      network: networks[this.networkId] || { name: 'Unknown Network', currency: 'ETH' },
      isConnected: this.isConnected,
      userAddress: this.userAddress
    };
  }

  // Format address for display
  static formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Check if on supported network
  isSupportedNetwork() {
    const supportedNetworks = [1, 5, 137, 80001]; // Mainnet, Goerli, Polygon, Mumbai
    return supportedNetworks.includes(this.networkId);
  }
}

// Export singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;

// Also export the class for custom instances
export { BlockchainService };