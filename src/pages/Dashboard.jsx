import { useEffect, useState, useRef } from 'react';
import './Dashboard.css';

function randomHex(len = 8) {
  return '0x' + Math.random().toString(16).slice(2, 2 + len);
}

function formatEth(n = 0.001) {
  return `${Number(n).toFixed(3)} ETH`;
}

function makeTx() {
  const risks = ['LOW', 'MEDIUM', 'HIGH'];
  const risk = risks[Math.floor(Math.random() * risks.length)];
  return {
    id: Math.random().toString(36).slice(2, 9),
    hash: randomHex(10),
    time: 'Just now',
    gas: (Math.random() * 0.02 + 0.001).toFixed(3),
    risk,
    from: randomHex(6),
    to: randomHex(6),
    status: 'PENDING',
  };
}

export default function Dashboard() {
  const [defenseActive, setDefenseActive] = useState(false);
  const [live, setLive] = useState(true);
  const [txs, setTxs] = useState(() => Array.from({ length: 8 }, () => makeTx()));
  const timerRef = useRef(null);

  useEffect(() => {
    if (live) {
      timerRef.current = setInterval(() => {
        setTxs((t) => [makeTx(), ...t].slice(0, 12));
      }, 3000);
    }
    return () => clearInterval(timerRef.current);
  }, [live]);

  const toggleDefense = () => setDefenseActive((s) => !s);

  const blockTx = (id) => {
    setTxs((t) => t.map((x) => (x.id === id ? { ...x, status: 'BLOCKED' } : x)));
  };

  const confirmTx = (id) => {
    setTxs((t) => t.map((x) => (x.id === id ? { ...x, status: 'CONFIRMED' } : x)));
  };

  return (
    <div className="dashboard">
      <section className="dash-hero">
        <div className="dash-title">
          <h1>REAL-TIME MEV DEFENSE DASHBOARD</h1>
          <p className="subtitle">PODIUM GARAGE • LIVE TRANSACTION SECURITY</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">$</div>
            <div className="stat-meta">
              <div className="label">Funds Protected</div>
              <div className="value">$2,847,392</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🛡️</div>
            <div className="stat-meta">
              <div className="label">Attacks Blocked</div>
              <div className="value">182</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-meta">
              <div className="label">System Uptime</div>
              <div className="value">99.97%</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-meta">
              <div className="label">Threat Level</div>
              <div className="value danger">LOW</div>
              <div className="threat-bar"><div className="threat-fill" style={{ width: '18%' }} /></div>
            </div>
          </div>
        </div>

        <div className="hero-cta">
          <button className={`activate-btn ${defenseActive ? 'active' : ''}`} onClick={toggleDefense}>
            {defenseActive ? 'DEFENSE ACTIVE' : 'ACTIVATE DEFENSE'}
          </button>
        </div>
      </section>

      <section className="live-feed">
        <div className="feed-header">
          <h2>Live Transaction Feed</h2>
          <div className="feed-controls">
            <button className={`live-toggle ${live ? 'on' : 'off'}`} onClick={() => setLive((s) => !s)}>
              {live ? 'LIVE' : 'PAUSE'}
            </button>
          </div>
        </div>

        <table className="tx-table">
          <thead>
            <tr>
              <th>TX HASH</th>
              <th>TIME</th>
              <th>GAS FEE</th>
              <th>RISK SCORE</th>
              <th>FROM</th>
              <th>TO</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx, idx) => (
              <tr key={tx.id} className={`tx-row ${tx.status.toLowerCase()}`} style={{ ['--i']: idx }}>
                <td className="hash">{tx.hash}</td>
                <td>{tx.time}</td>
                <td>{formatEth(tx.gas)}</td>
                <td>
                  <span className={`risk ${tx.risk.toLowerCase()}`}>{tx.risk}</span>
                </td>
                <td className="mono">{tx.from}</td>
                <td className="mono">{tx.to}</td>
                <td className="status-col">
                  {tx.status === 'PENDING' ? (
                    <>
                      <button className="block" onClick={() => blockTx(tx.id)}>BLOCK</button>
                      <button className="confirm" onClick={() => confirmTx(tx.id)}>CONFIRM</button>
                    </>
                  ) : (
                    <span className={`badge ${tx.status.toLowerCase()}`}>{tx.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="charts">
        <div className="card">
          <h3>Attack Frequency</h3>
          <div className="card-graphic">📈</div>
          <div className="chart-stats">
            <div className="stat-line">
              <span className="stat-label">24h Attacks:</span>
              <span className="stat-value">47</span>
            </div>
            <div className="stat-line">
              <span className="stat-label">Avg Response:</span>
              <span className="stat-value">0.3s</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Gas Optimization</h3>
          <div className="card-graphic">⚡</div>
          <div className="chart-stats">
            <div className="stat-line">
              <span className="stat-label">Gas Saved:</span>
              <span className="stat-value">34.8 ETH</span>
            </div>
            <div className="stat-line">
              <span className="stat-label">Efficiency:</span>
              <span className="stat-value">+127%</span>
            </div>
          </div>
        </div>
        <div className="card link-card" onClick={() => { window.history.pushState({}, '', '/track'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
          <h3>Network Status</h3>
          <div className="card-graphic">�️</div>
          <div className="chart-stats">
            <div className="stat-line">
              <span className="stat-label">Nodes:</span>
              <span className="stat-value">1,247</span>
            </div>
            <div className="stat-line">
              <span className="stat-label">Coverage:</span>
              <span className="stat-value">99.97%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
