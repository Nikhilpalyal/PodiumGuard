# Frontend Integration Guide for Blockchain MEV Defense System

## Overview
This guide explains how to integrate the blockchain-powered MEV defense system with your existing React frontend to create a real-time, interactive dashboard for MEV protection.

## Architecture Overview

```
Frontend (React) ↔ Backend API ↔ Blockchain Smart Contracts
      ↓                ↓               ↓
   User Interface → Real-time Data → On-chain Protection
```

## Core Integration Components

### 1. Blockchain Connection Service

Create a service to connect your frontend to the blockchain:

```javascript
// src/services/blockchainService.js
import { ethers } from 'ethers';

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isConnected = false;
  }

  async connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        this.isConnected = true;
        return await this.signer.getAddress();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        throw error;
      }
    } else {
      throw new Error('MetaMask not installed');
    }
  }

  async initializeContracts() {
    const contractAddresses = {
      PodiumGuardCore: process.env.REACT_APP_PODIUM_GUARD_ADDRESS,
      AIOracle: process.env.REACT_APP_AI_ORACLE_ADDRESS,
      AutomatedDefenseSystem: process.env.REACT_APP_DEFENSE_SYSTEM_ADDRESS
    };

    // Load contract ABIs and create contract instances
    for (const [name, address] of Object.entries(contractAddresses)) {
      if (address) {
        const abi = await import(`../contracts/abi/${name}.json`);
        this.contracts[name] = new ethers.Contract(address, abi.default, this.signer);
      }
    }
  }

  async enableProtection() {
    if (!this.contracts.PodiumGuardCore) {
      throw new Error('PodiumGuardCore contract not initialized');
    }
    
    const tx = await this.contracts.PodiumGuardCore.enableProtection();
    return await tx.wait();
  }

  async getProtectionStatus(address) {
    if (!this.contracts.PodiumGuardCore) return false;
    return await this.contracts.PodiumGuardCore.isProtected(address);
  }
}

export default new BlockchainService();
```

### 2. Real-time Data Service

Connect to your backend for real-time MEV detection data:

```javascript
// src/services/mevDataService.js
import io from 'socket.io-client';

class MEVDataService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    this.socket = io(process.env.REACT_APP_BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to MEV defense backend');
    });

    this.socket.on('mev_detection', (data) => {
      this.emit('mevDetection', data);
    });

    this.socket.on('protection_triggered', (data) => {
      this.emit('protectionTriggered', data);
    });

    this.socket.on('mempool_update', (data) => {
      this.emit('mempoolUpdate', data);
    });
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  unsubscribe(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  async getAIAnalysis(transactionData) {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData)
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to get AI analysis:', error);
      throw error;
    }
  }
}

export default new MEVDataService();
```

### 3. Enhanced Dashboard Component

Update your Dashboard to show real MEV defense data:

```javascript
// src/components/MEVDefenseDashboard.jsx
import React, { useState, useEffect } from 'react';
import blockchainService from '../services/blockchainService';
import mevDataService from '../services/mevDataService';

const MEVDefenseDashboard = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isProtected, setIsProtected] = useState(false);
  const [mevDetections, setMevDetections] = useState([]);
  const [aiAnalysis, setAIAnalysis] = useState(null);
  const [defenseActive, setDefenseActive] = useState(false);
  const [stats, setStats] = useState({
    totalProtected: 0,
    threatsBlocked: 0,
    savingsGenerated: 0
  });

  useEffect(() => {
    // Initialize services
    mevDataService.connect();
    
    // Subscribe to real-time events
    mevDataService.subscribe('mevDetection', handleMEVDetection);
    mevDataService.subscribe('protectionTriggered', handleProtectionTriggered);
    
    return () => {
      mevDataService.unsubscribe('mevDetection', handleMEVDetection);
      mevDataService.unsubscribe('protectionTriggered', handleProtectionTriggered);
    };
  }, []);

  const handleMEVDetection = (detection) => {
    setMevDetections(prev => [detection, ...prev.slice(0, 9)]);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      threatsBlocked: prev.threatsBlocked + 1,
      savingsGenerated: prev.savingsGenerated + (detection.potentialLoss || 0)
    }));
  };

  const handleProtectionTriggered = (protection) => {
    // Show notification or update UI when protection is triggered
    console.log('Protection triggered:', protection);
  };

  const connectWallet = async () => {
    try {
      const address = await blockchainService.connectWallet();
      await blockchainService.initializeContracts();
      setWalletAddress(address);
      
      // Check protection status
      const protected = await blockchainService.getProtectionStatus(address);
      setIsProtected(protected);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const toggleProtection = async () => {
    try {
      if (!isProtected) {
        await blockchainService.enableProtection();
        setIsProtected(true);
        setDefenseActive(true);
      }
    } catch (error) {
      console.error('Failed to enable protection:', error);
    }
  };

  return (
    <div className="mev-defense-dashboard">
      {/* Wallet Connection */}
      <div className="wallet-section">
        {!walletAddress ? (
          <button onClick={connectWallet} className="connect-btn">
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <span>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            <span className={`status ${isProtected ? 'protected' : 'unprotected'}`}>
              {isProtected ? 'Protected' : 'Unprotected'}
            </span>
          </div>
        )}
      </div>

      {/* Protection Controls */}
      <div className="protection-controls">
        <button 
          onClick={toggleProtection}
          disabled={!walletAddress || isProtected}
          className={`protection-btn ${defenseActive ? 'active' : ''}`}
        >
          {defenseActive ? 'MEV Defense Active' : 'Enable MEV Protection'}
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Transactions Protected</h3>
          <div className="stat-value">{stats.totalProtected}</div>
        </div>
        <div className="stat-card">
          <h3>Threats Blocked</h3>
          <div className="stat-value">{stats.threatsBlocked}</div>
        </div>
        <div className="stat-card">
          <h3>Value Saved</h3>
          <div className="stat-value">{stats.savingsGenerated.toFixed(3)} ETH</div>
        </div>
      </div>

      {/* Real-time MEV Detections */}
      <div className="detections-section">
        <h3>Recent MEV Detections</h3>
        <div className="detections-list">
          {mevDetections.map((detection, index) => (
            <div key={index} className={`detection-card ${detection.riskLevel.toLowerCase()}`}>
              <div className="detection-header">
                <span className="detection-type">{detection.attackType}</span>
                <span className="risk-badge">{detection.riskLevel}</span>
              </div>
              <div className="detection-details">
                <div>Target: {detection.targetAddress?.slice(0, 10)}...</div>
                <div>Potential Loss: {detection.potentialLoss} ETH</div>
                <div>Confidence: {detection.confidence}%</div>
              </div>
              <div className="detection-time">
                {new Date(detection.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MEVDefenseDashboard;
```

### 4. Enhanced Mempool Component

Update your Mempool page to show real AI analysis:

```javascript
// src/components/EnhancedMempool.jsx
import React, { useState, useEffect } from 'react';
import mevDataService from '../services/mevDataService';

const EnhancedMempool = () => {
  const [transactions, setTransactions] = useState([]);
  const [aiInsights, setAIInsights] = useState(null);
  const [scannerActive, setScannerActive] = useState(true);

  useEffect(() => {
    mevDataService.subscribe('mempoolUpdate', handleMempoolUpdate);
    
    return () => {
      mevDataService.unsubscribe('mempoolUpdate', handleMempoolUpdate);
    };
  }, []);

  const handleMempoolUpdate = (data) => {
    setTransactions(data.transactions || []);
    setAIInsights(data.aiInsights);
  };

  const analyzeTransaction = async (tx) => {
    try {
      const analysis = await mevDataService.getAIAnalysis({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasPrice: tx.gasPrice
      });
      
      // Update transaction with AI analysis
      setTransactions(prev => prev.map(t => 
        t.hash === tx.hash ? { ...t, aiAnalysis: analysis } : t
      ));
    } catch (error) {
      console.error('Failed to analyze transaction:', error);
    }
  };

  return (
    <div className="enhanced-mempool">
      <div className="mempool-header">
        <h2>AI-Powered Mempool Analysis</h2>
        <div className="scanner-controls">
          <button 
            onClick={() => setScannerActive(!scannerActive)}
            className={`scanner-btn ${scannerActive ? 'active' : ''}`}
          >
            {scannerActive ? 'Scanner Active' : 'Scanner Paused'}
          </button>
        </div>
      </div>

      {/* AI Insights Panel */}
      {aiInsights && (
        <div className="ai-insights">
          <h3>AI Network Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <span>Network Threat Level</span>
              <span className={`threat-level ${aiInsights.threatLevel.toLowerCase()}`}>
                {aiInsights.threatLevel}
              </span>
            </div>
            <div className="insight-card">
              <span>MEV Activity</span>
              <span>{aiInsights.mevActivity}%</span>
            </div>
            <div className="insight-card">
              <span>Suspicious Patterns</span>
              <span>{aiInsights.suspiciousPatterns}</span>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List with AI Analysis */}
      <div className="transactions-container">
        {transactions.map((tx, index) => (
          <div key={tx.hash || index} className="transaction-card">
            <div className="tx-header">
              <span className="tx-hash">{tx.hash?.slice(0, 10)}...</span>
              {tx.aiAnalysis && (
                <span className={`risk-badge ${tx.aiAnalysis.riskLevel.toLowerCase()}`}>
                  {tx.aiAnalysis.riskLevel} Risk
                </span>
              )}
            </div>
            
            <div className="tx-details">
              <div>From: {tx.from?.slice(0, 8)}...</div>
              <div>To: {tx.to?.slice(0, 8)}...</div>
              <div>Value: {tx.value} ETH</div>
              <div>Gas: {tx.gasPrice} Gwei</div>
            </div>

            {tx.aiAnalysis && (
              <div className="ai-analysis">
                <div className="analysis-score">
                  AI Confidence: {tx.aiAnalysis.confidence}%
                </div>
                {tx.aiAnalysis.threats?.length > 0 && (
                  <div className="detected-threats">
                    Threats: {tx.aiAnalysis.threats.join(', ')}
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={() => analyzeTransaction(tx)}
              className="analyze-btn"
              disabled={!!tx.aiAnalysis}
            >
              {tx.aiAnalysis ? 'Analyzed' : 'Analyze with AI'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnhancedMempool;
```

## Environment Configuration

Create a `.env` file in your frontend root:

```env
# Backend API
REACT_APP_BACKEND_URL=http://localhost:3001

# Smart Contract Addresses (update after deployment)
REACT_APP_PODIUM_GUARD_ADDRESS=0x...
REACT_APP_AI_ORACLE_ADDRESS=0x...
REACT_APP_DEFENSE_SYSTEM_ADDRESS=0x...

# Blockchain Network
REACT_APP_NETWORK_ID=1
REACT_APP_NETWORK_NAME=mainnet
```

## Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "ethers": "^5.7.2",
    "socket.io-client": "^4.7.2",
    "axios": "^1.5.0"
  }
}
```

## Key Features Your Frontend Will Have

### 1. **Real-time MEV Protection Dashboard**
- Live threat detection display
- Protection status indicators
- Transaction monitoring with AI risk scores
- Savings and protection statistics

### 2. **Interactive Blockchain Integration**
- MetaMask wallet connection
- Smart contract interaction buttons
- Transaction signing for protection enrollment
- Real-time blockchain event listening

### 3. **AI-Powered Analytics**
- Live mempool scanning with AI analysis
- Risk assessment for individual transactions
- Network-wide threat pattern recognition
- Confidence scores and threat categorization

### 4. **User Experience Features**
- One-click MEV protection activation
- Real-time notifications for threats
- Historical protection data
- Customizable risk thresholds

## How It All Works Together

1. **User connects wallet** → Frontend establishes blockchain connection
2. **User enables protection** → Smart contract enrollment via frontend
3. **AI monitors mempool** → Backend streams data to frontend
4. **Threats detected** → Real-time alerts shown in dashboard
5. **Protection triggered** → Automatic defense with user notifications
6. **Results displayed** → Updated stats and savings shown

This creates a complete, interactive MEV defense system where users can see real-time protection in action!