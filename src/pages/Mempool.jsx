import React, { useEffect, useState } from 'react';
import './Mempool.css';

function TxCard({ tx }) {
  return (
    <div className={`tx-card ${tx.level.toLowerCase()}`}>
      <div className="tx-row">
        <div className="tx-hash">{tx.hash}</div>
        <div className="tx-badge">{tx.level}</div>
      </div>
      <div className="tx-meta">
        <div>From: <span className="mono">{tx.from}</span></div>
        <div>To: <span className="mono">{tx.to}</span></div>
      </div>
      <div className="tx-bottom">
        <div className="tx-val">{tx.value} ETH</div>
        <div className="tx-gas">Gas: {tx.gas}</div>
      </div>
    </div>
  );
}

export default function Mempool() {
  const [scanning, setScanning] = useState(true);
  const [progress, setProgress] = useState(22);
  const [filter, setFilter] = useState('All');
  const [live, setLive] = useState(true);
  const [txs, setTxs] = useState(() => generateTxs(6));

  useEffect(() => {
    const t = setInterval(() => {
      if (!live) return;
      setTxs((s) => [generateTx(), ...s].slice(0, 12));
      setProgress((p) => Math.min(99, p + Math.random() * 3));
    }, 1500);
    return () => clearInterval(t);
  }, [live]);

  return (
    <div className="mempool-page">
      <div className="mempool-hero">
        <h1>AI Mempool Scanner</h1>
        <p className="sub">Real-time blockchain security monitoring with AI-powered threat detection and risk assessment</p>
      </div>

      <div className="mempool-grid">
        <div className="mempool-left">
          <div className="scanner-card">
            <div className="scanner-row">
              <div className="scanner-title">AI Threat Detection</div>
              <div className="scanner-actions">
                <button className={`ctl ${scanning ? 'active' : ''}`} onClick={() => setScanning((s) => !s)}>{scanning ? 'Scanning' : 'Start Scan'}</button>
              </div>
            </div>
            <div className="scanner-track">
              <div className="scanner-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="scanner-footer">{Math.floor(progress)}% Complete</div>
          </div>

          <div className="tx-filters">
            <div className={`filter ${filter==='All'? 'active':''}`} onClick={() => setFilter('All')}>All Transactions</div>
            <div className={`filter ${filter==='Safe'? 'active':''}`} onClick={() => setFilter('Safe')}>Safe</div>
            <div className={`filter ${filter==='Warning'? 'active':''}`} onClick={() => setFilter('Warning')}>Warning</div>
            <div className={`filter ${filter==='Critical'? 'active':''}`} onClick={() => setFilter('Critical')}>Critical</div>
          </div>

          <div className="tx-feed">
            <div className="feed-head">
              <h3>Live Transaction Feed</h3>
              <div className="feed-controls">
                <div className="switch">
                  <input 
                    type="checkbox" 
                    id="live-toggle" 
                    checked={live} 
                    onChange={() => setLive(s => !s)} 
                  />
                  <label htmlFor="live-toggle"></label>
                  <span>Live</span>
                </div>
              </div>
            </div>
            <div className="feed-list">
              {txs.filter(t=> filter==='All' ? true : t.level === filter).map((t) => (
                <TxCard key={t.hash} tx={t} />
              ))}
            </div>
          </div>
        </div>

        <div className="mempool-right">
          <div className="panel ai-panel">
            <div className="panel-head">AI Threat Detection <span className="status">Scanning</span></div>
            <div className="panel-body">
              <div className="metric-row">
                <div className="metric">
                  <div className="metric-num">1,254</div>
                  <div className="metric-label">Total Threats</div>
                </div>
                <div className="metric critical">
                  <div className="metric-num">11</div>
                  <div className="metric-label">Critical</div>
                </div>
              </div>
              <div className="metric-row small">
                <div className="metric">Resolved<br/><strong>1,202</strong></div>
                <div className="metric">Active Scans<br/><strong>11</strong></div>
              </div>
            </div>
          </div>

          <div className="panel levels">
            <div className="panel-head">Threat Level Analysis</div>
            <div className="panel-body">
              <div className="level">
                <div className="lvl-label">Safe Operations <span className="pct">75.3%</span></div>
                <div className="lvl-bar"><div style={{ width: '75%' }} /></div>
              </div>
              <div className="level">
                <div className="lvl-label">Warning Signals <span className="pct">16.7%</span></div>
                <div className="lvl-bar"><div style={{ width: '16%' }} /></div>
              </div>
              <div className="level">
                <div className="lvl-label">Critical Threats <span className="pct">7.3%</span></div>
                <div className="lvl-bar"><div style={{ width: '7%' }} /></div>
              </div>
            </div>
          </div>

          <div className="panel logs">
            <div className="panel-head">Threat Logs</div>
            <div className="panel-body">
              <div className="log">Suspicious transaction pattern detected from 0x7a...ef (Critical)</div>
              <div className="log">High gas fee anomaly in mempool transactions (Warning)</div>
              <div className="log">AI model updated with new threat signature (Info)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// helpers
function rndHex(len=6){
  return '0x'+Math.random().toString(16).slice(2,2+len);
}

function generateTx(){
  const r = Math.random();
  const level = r < 0.7 ? 'Safe' : r < 0.9 ? 'Warning' : 'Critical';
  return {
    hash: rndHex(8)+'..'+rndHex(4),
    from: rndHex(6),
    to: rndHex(6),
    value: (Math.random()*10).toFixed(4),
    gas: (Math.random()*100).toFixed(2),
    level
  };
}

function generateTxs(n=6){
  return Array.from({length:n}).map(()=>generateTx());
}
