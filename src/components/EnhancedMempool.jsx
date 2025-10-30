// Enhanced Mempool Component with AI-powered MEV detection
import React, { useState, useEffect, useCallback } from 'react';
import './EnhancedMempool.css';

// Mock AI analysis service
const aiAnalysisService = {
  analyzeTransaction: async (tx) => {
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];
    const threats = [
      'Sandwich Attack Pattern',
      'Front-running Detected',
      'Flash Loan Arbitrage',
      'Price Manipulation',
      'Liquidity Attack',
      'MEV Bot Activity'
    ];
    
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    const detectedThreats = Math.random() > 0.6 ? 
      [threats[Math.floor(Math.random() * threats.length)]] : [];
    
    return {
      riskLevel,
      confidence: Math.floor(Math.random() * 30 + 70),
      threats: detectedThreats,
      potentialMevValue: riskLevel === 'HIGH' ? (Math.random() * 0.5).toFixed(4) : '0',
      recommendation: riskLevel === 'HIGH' ? 'BLOCK' : 'MONITOR',
      analysis: {
        gasPrice: Math.random() > 0.5 ? 'SUSPICIOUS' : 'NORMAL',
        timing: Math.random() > 0.7 ? 'FRONT_RUNNING' : 'NORMAL',
        valueFlow: Math.random() > 0.6 ? 'ARBITRAGE' : 'NORMAL'
      }
    };
  }
};

// Generate mock transaction
const generateTransaction = () => {
  const txTypes = ['Transfer', 'Swap', 'Liquidity', 'NFT Trade', 'DeFi'];
  const addresses = [
    '0x742d35Cc6634C0532925a3b8D39b4b6C5bC947C7',
    '0x8ba1f109551bD432803012645Hac136c776c4b4f',
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    '0xA0b86a33E6411BACb5231CeC1bac3eB1A9e3b457'
  ];
  
  return {
    hash: '0x' + Math.random().toString(16).substr(2, 40),
    type: txTypes[Math.floor(Math.random() * txTypes.length)],
    from: addresses[Math.floor(Math.random() * addresses.length)],
    to: addresses[Math.floor(Math.random() * addresses.length)],
    value: (Math.random() * 10).toFixed(4),
    gasPrice: Math.floor(Math.random() * 100 + 20),
    gasLimit: Math.floor(Math.random() * 50000 + 21000),
    timestamp: new Date(),
    status: 'PENDING',
    blockNumber: null
  };
};

const EnhancedMempool = () => {
  const [transactions, setTransactions] = useState([]);
  const [scannerActive, setScannerActive] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [analyzing, setAnalyzing] = useState(new Set());
  const [networkStats, setNetworkStats] = useState({
    totalTransactions: 15847,
    pendingTransactions: 234,
    averageGasPrice: 45,
    mevOpportunities: 12,
    threatLevel: 'MEDIUM'
  });

  // Initialize with some transactions
  useEffect(() => {
    const initialTxs = Array.from({ length: 8 }, generateTransaction);
    setTransactions(initialTxs);
  }, []);

  // Simulate real-time transaction stream
  useEffect(() => {
    if (!scannerActive) return;

    const interval = setInterval(() => {
      const newTx = generateTransaction();
      setTransactions(prev => [newTx, ...prev.slice(0, 19)]); // Keep last 20
      
      // Update network stats
      setNetworkStats(prev => ({
        ...prev,
        totalTransactions: prev.totalTransactions + 1,
        pendingTransactions: Math.floor(Math.random() * 50 + 200),
        averageGasPrice: Math.floor(Math.random() * 20 + 35),
        mevOpportunities: Math.floor(Math.random() * 5 + 10)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [scannerActive]);

  const analyzeTransaction = useCallback(async (txHash) => {
    setAnalyzing(prev => new Set([...prev, txHash]));
    
    try {
      const tx = transactions.find(t => t.hash === txHash);
      const analysis = await aiAnalysisService.analyzeTransaction(tx);
      
      setTransactions(prev => 
        prev.map(t => 
          t.hash === txHash ? { ...t, aiAnalysis: analysis } : t
        )
      );
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(prev => {
        const newSet = new Set(prev);
        newSet.delete(txHash);
        return newSet;
      });
    }
  }, [transactions]);

  const getFilteredTransactions = () => {
    switch (filter) {
      case 'HIGH_RISK':
        return transactions.filter(tx => tx.aiAnalysis?.riskLevel === 'HIGH');
      case 'MEV_DETECTED':
        return transactions.filter(tx => tx.aiAnalysis?.threats?.length > 0);
      case 'ANALYZED':
        return transactions.filter(tx => tx.aiAnalysis);
      default:
        return transactions;
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH': return '#ff4757';
      case 'MEDIUM': return '#ffa502';
      case 'LOW': return '#2ed573';
      default: return '#74b9ff';
    }
  };

  const getThreatLevelColor = (level) => {
    switch (level) {
      case 'HIGH': return '#ff4757';
      case 'MEDIUM': return '#ffa502';
      case 'LOW': return '#2ed573';
      default: return '#74b9ff';
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="enhanced-mempool">
      {/* Header */}
      <div className="mempool-header">
        <h1>🔍 AI-Powered Mempool Scanner</h1>
        <p>Real-time blockchain transaction monitoring with MEV threat detection</p>
        
        <div className="scanner-controls">
          <button 
            onClick={() => setScannerActive(!scannerActive)}
            className={`scanner-btn ${scannerActive ? 'active' : 'paused'}`}
          >
            {scannerActive ? '⏸️ Pause Scanner' : '▶️ Resume Scanner'}
          </button>
          
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Transactions</option>
            <option value="HIGH_RISK">High Risk Only</option>
            <option value="MEV_DETECTED">MEV Detected</option>
            <option value="ANALYZED">Analyzed</option>
          </select>
        </div>
      </div>

      {/* Network Stats */}
      <div className="network-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{networkStats.totalTransactions.toLocaleString()}</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{networkStats.pendingTransactions}</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">⛽</div>
            <div className="stat-content">
              <div className="stat-label">Avg Gas Price</div>
              <div className="stat-value">{networkStats.averageGasPrice} Gwei</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">⚔️</div>
            <div className="stat-content">
              <div className="stat-label">MEV Opportunities</div>
              <div className="stat-value">{networkStats.mevOpportunities}</div>
            </div>
          </div>
          
          <div className="stat-item threat-level">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-label">Threat Level</div>
              <div 
                className="stat-value threat"
                style={{ color: getThreatLevelColor(networkStats.threatLevel) }}
              >
                {networkStats.threatLevel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="transactions-section">
        <div className="section-header">
          <h3>🔄 Live Transaction Stream</h3>
          <div className="transaction-count">
            {getFilteredTransactions().length} transactions
          </div>
        </div>

        <div className="transactions-container">
          {getFilteredTransactions().length === 0 ? (
            <div className="no-transactions">
              <div className="scanning-indicator">
                {scannerActive ? '🔍 Scanning...' : '⏸️ Scanner Paused'}
              </div>
              <p>No transactions match the current filter</p>
            </div>
          ) : (
            <div className="transactions-list">
              {getFilteredTransactions().map((tx) => (
                <div key={tx.hash} className="transaction-card">
                  <div className="tx-header">
                    <div className="tx-info">
                      <span className="tx-type">{tx.type}</span>
                      <span className="tx-hash">{formatAddress(tx.hash)}</span>
                    </div>
                    
                    <div className="tx-status">
                      {tx.aiAnalysis && (
                        <span 
                          className="risk-badge"
                          style={{ 
                            backgroundColor: getRiskColor(tx.aiAnalysis.riskLevel),
                            color: 'white'
                          }}
                        >
                          {tx.aiAnalysis.riskLevel} RISK
                        </span>
                      )}
                      <span className="tx-time">{formatTime(tx.timestamp)}</span>
                    </div>
                  </div>

                  <div className="tx-details">
                    <div className="tx-flow">
                      <div className="address-info">
                        <span className="label">From:</span>
                        <span className="address">{formatAddress(tx.from)}</span>
                      </div>
                      <div className="flow-arrow">→</div>
                      <div className="address-info">
                        <span className="label">To:</span>
                        <span className="address">{formatAddress(tx.to)}</span>
                      </div>
                    </div>
                    
                    <div className="tx-amounts">
                      <div className="amount-item">
                        <span className="label">Value:</span>
                        <span className="value">{tx.value} ETH</span>
                      </div>
                      <div className="amount-item">
                        <span className="label">Gas:</span>
                        <span className="value">{tx.gasPrice} Gwei</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis Section */}
                  {tx.aiAnalysis ? (
                    <div className="ai-analysis">
                      <div className="analysis-header">
                        <span className="ai-icon">🤖</span>
                        <span>AI Analysis Complete</span>
                        <span className="confidence">
                          {tx.aiAnalysis.confidence}% confidence
                        </span>
                      </div>
                      
                      {tx.aiAnalysis.threats.length > 0 && (
                        <div className="threats-detected">
                          <span className="threats-label">⚠️ Threats Detected:</span>
                          <div className="threats-list">
                            {tx.aiAnalysis.threats.map((threat, idx) => (
                              <span key={idx} className="threat-tag">{threat}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {tx.aiAnalysis.potentialMevValue > 0 && (
                        <div className="mev-value">
                          <span className="mev-label">💰 Potential MEV Value:</span>
                          <span className="mev-amount">{tx.aiAnalysis.potentialMevValue} ETH</span>
                        </div>
                      )}
                      
                      <div className="analysis-details">
                        <div className="analysis-row">
                          <span>Gas Analysis:</span>
                          <span className={tx.aiAnalysis.analysis.gasPrice.toLowerCase()}>
                            {tx.aiAnalysis.analysis.gasPrice}
                          </span>
                        </div>
                        <div className="analysis-row">
                          <span>Timing Analysis:</span>
                          <span className={tx.aiAnalysis.analysis.timing.toLowerCase()}>
                            {tx.aiAnalysis.analysis.timing}
                          </span>
                        </div>
                        <div className="analysis-row">
                          <span>Value Flow:</span>
                          <span className={tx.aiAnalysis.analysis.valueFlow.toLowerCase()}>
                            {tx.aiAnalysis.analysis.valueFlow}
                          </span>
                        </div>
                      </div>
                      
                      <div className="recommendation">
                        <span className="rec-label">Recommendation:</span>
                        <span 
                          className={`rec-action ${tx.aiAnalysis.recommendation.toLowerCase()}`}
                        >
                          {tx.aiAnalysis.recommendation}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="analyze-section">
                      <button 
                        onClick={() => analyzeTransaction(tx.hash)}
                        disabled={analyzing.has(tx.hash)}
                        className="analyze-btn"
                      >
                        {analyzing.has(tx.hash) ? (
                          <>
                            <span className="spinner">⏳</span>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <span>🔍</span>
                            Analyze with AI
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Status */}
      <div className="scanner-status">
        <div className="status-indicators">
          <div className="indicator">
            <span className="indicator-dot active"></span>
            <span>AI Engine Online</span>
          </div>
          <div className="indicator">
            <span className="indicator-dot active"></span>
            <span>Mempool Connected</span>
          </div>
          <div className="indicator">
            <span className="indicator-dot active"></span>
            <span>MEV Detection Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMempool;