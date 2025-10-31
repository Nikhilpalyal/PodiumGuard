import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Track3D.css';

const randomHex = (len = 10) => '0x' + Math.random().toString(16).slice(2, 2 + len);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const STATUS = {
  SAFE: 'safe',
  CRITICAL: 'critical',
  UNSAFE: 'unsafe',
};

function makeTx() {
  const status = STATUS.SAFE;
  const speed = 6 + Math.random() * 3;
  return {
    id: Math.random().toString(36).slice(2, 9),
    hash: randomHex(14),
    gas: (Math.random() * 0.02 + 0.001).toFixed(5),
    risk: 'SAFE',
    status,
    lane: Math.floor(Math.random() * 3),
    // negative delay seeds cars mid-lane so you see them immediately
    delay: -Math.random() * speed,
    speed,
  };
}

function makeCurdle() {
  return {
    id: 'c_' + Math.random().toString(36).slice(2, 9),
    lane: Math.floor(Math.random() * 3),
    delay: Math.random() * 4,
    speed: 6 + Math.random() * 4,
  };
}

export default function Track3D() {
  const [txs, setTxs] = useState(() => Array.from({ length: 18 }, makeTx));
  const [curdles, setCurdles] = useState(() => Array.from({ length: 4 }, makeCurdle));
  const [selected, setSelected] = useState(null);
  const [pausedId, setPausedId] = useState(null);
  const [stats, setStats] = useState({ threats: 1, funds: 56.99, success: 0.4, active: 4, mempool: 4, tps: 2.0, gas: 83 });
  const [alert, setAlert] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => {
      setTxs((prev) => [makeTx(), ...prev].slice(0, 18));
      if (Math.random() > 0.6) setCurdles((c) => [makeCurdle(), ...c].slice(0, 5));
      // update stats lightly to simulate live telemetry
      setStats((s) => ({
        ...s,
        funds: Number((s.funds + Math.random() * 0.5).toFixed(2)),
        active: Math.max(1, Math.min(12, Math.round(txs.length / 3))),
        mempool: Math.max(1, (s.mempool + (Math.random() > 0.5 ? 1 : -1))) ,
        tps: Number((1.5 + Math.random() * 2.5).toFixed(1)),
        gas: Math.max(5, Math.min(300, Math.round(60 + Math.random() * 40)))
      }));
      // occasionally show an UNSAFE alert banner (visual cue)
      if (Math.random() > 0.8) {
        setAlert({ msg: `UNSAFE: Suspicious detected - ${(60 + Math.random()*60).toFixed(2)} ETH`, ts: Date.now() });
        setTimeout(() => setAlert(null), 4000);
      }
    }, 2200);
    return () => clearInterval(t);
  }, [txs.length]);

  useEffect(() => {
  const hop = setInterval(() => {
    setCurdles((prev) => prev.map((c) => (Math.random() > 0.6 ? { ...c, lane: Math.floor(Math.random() * 3) } : c)));
  }, 1800);
  return () => clearInterval(hop);
}, []);
const lanes = useMemo(() => [0, 1, 2], []);

  const onCardClick = (tx) => {
    setSelected(tx);
    setPausedId((id) => (id === tx.id ? null : tx.id));
  };

  const closePanel = () => {
    setSelected(null);
    setPausedId(null);
  };

  return (
    <div className="track3d-page">
      <header className="track3d-header hud-top">
        <div className="hud-title">BLOCKCHAIN TELEMETRY</div>
        <div className="hud-live"><span className="live-dot"/> LIVE</div>
      </header>

      <div className="hud-left">
        <div className="hud-card warning">
          <div className="label">THREATS DETECTED</div>
          <div className="value">{stats.threats}</div>
        </div>
        <div className="hud-card funds">
          <div className="label">FUNDS PROTECTED</div>
          <div className="value accent">{stats.funds.toFixed(2)} ETH</div>
        </div>
        <div className="hud-card">
          <div className="label">SUCCESS RATE</div>
          <div className="value">{stats.success}%</div>
        </div>
        <div className="hud-card">
          <div className="label">ACTIVE TXs</div>
          <div className="value">{stats.active}</div>
        </div>
      </div>

      {alert && (
        <div className="hud-alert">
          <span className="dot"/>
          <span className="text">{alert.msg}</span>
        </div>
      )}

      <div className="track3d-container">
        {/* Side panel */}
        <aside className={`info-panel ${selected ? 'open' : ''}`} ref={panelRef}>
          {selected ? (
            <div className="panel-content">
              <div className={`badge ${selected.status}`}>{selected.risk}</div>
              <h3>Transaction Details</h3>
              <div className="kv"><span>Hash</span><code>{selected.hash}</code></div>
              <div className="kv"><span>Gas Fee</span><b>{selected.gas} ETH</b></div>
              <div className="kv"><span>Status</span><b>{selected.status}</b></div>
              <button className="close-btn" onClick={closePanel}>Close</button>
            </div>
          ) : (
            <div className="panel-empty">Select a car to see details</div>
          )}
        </aside>

        {/* Vertical Track */}
        <div className="track3d" aria-label="Vertical Transaction Track">
          <div className="perspective-wrapper">
            <div className="lanes">
              {lanes.map((lane) => (
                <div key={lane} className="lane">
                  {/* Safety bands (state markers) */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`band-${i}`}
                      className={`safety-band ${['safe','critical','unsafe'][i % 3]}`}
                      style={{ ['--i']: i }}
                      aria-hidden="true"
                    />
                  ))}

                  {/* Hurdles */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="hurdle" style={{ ['--y']: i }} />
                  ))}

                  {/* Transactions as cars */}
                  {txs
                    .filter((t) => t.lane === lane)
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className={`car ${tx.status} ${pausedId === tx.id ? 'paused' : ''}`}
                        style={{ ['--delay']: tx.delay + 's', ['--speed']: tx.speed + 's' }}
                        onClick={() => onCardClick(tx)}
                      >
                        <div className="car-body" />
                        <div className="trail" />
                        <div className="shadow" />
                        <div className="hovercard">
                          <div className="hash">{tx.hash}</div>
                          <div className="meta">Gas {tx.gas} • {tx.risk}</div>
                        </div>
                      </div>
                    ))}

                  {/* MEV curdles */}
                  {curdles
                    .filter((c) => c.lane === lane)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="curdle"
                        style={{ ['--delay']: (c.delay || 0) + 's', ['--speed']: (c.speed || 8) + 's' }}
                        aria-label="MEV Bot"
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hud-bottom">
        <div className="metric">
          <span className="label">MEMPOOL</span>
          <span className="value neon">{stats.mempool}</span>
        </div>
        <div className="metric">
          <span className="label">TPS</span>
          <span className="value neon">{stats.tps}</span>
        </div>
        <div className="metric">
          <span className="label">GAS</span>
          <span className="value neon">{stats.gas} GWEI</span>
        </div>
      </div>
    </div>
  );
}


