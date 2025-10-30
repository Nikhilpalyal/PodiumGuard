import { useState } from 'react';
import './InsurancePool.css';

function Progress({ value = 0, label }) {
  return (
    <div className="progress-row">
      <div className="pr-label">{label}</div>
      <div className="pr-track"><div className="pr-fill" style={{ width: `${value}%` }} /></div>
      <div className="pr-value">{value}%</div>
    </div>
  );
}

export default function InsurancePool() {
  const [joined, setJoined] = useState(false);
  const [poolHealth, setPoolHealth] = useState(94);
  const [aiRisk, setAiRisk] = useState(28);
  // UI scale for accessibility (1 = normal). User can increase to make text/UI larger.
  const [scale, setScale] = useState(1);

  const mockLeaderboard = [
    { id: 1, name: 'safe1...a3c', score: 99, rewards: '$2,020' },
    { id: 2, name: 'safe2...b6d', score: 98, rewards: '$24,502' },
    { id: 3, name: 'safe3...c9e', score: 96, rewards: '$19,080' },
    { id: 4, name: 'safe4...d1f', score: 94, rewards: '$15,200' },
  ];

  const toggleJoin = () => setJoined((s) => !s);

  const contribute = (amount) => {
    // simulate increase/decrease of pool health
    const delta = Math.max(-10, Math.min(10, Math.round(amount / 10)));
    setPoolHealth((h) => Math.max(0, Math.min(100, h + delta)));
  };

  const increaseScale = () => setScale((s) => Math.min(1.6, +(s + 0.05).toFixed(2)));
  const decreaseScale = () => setScale((s) => Math.max(0.8, +(s - 0.05).toFixed(2)));
  const onScaleChange = (e) => setScale(parseFloat(e.target.value));

  return (
    <div className="insurance-page" style={{ ['--page-scale']: scale }}>
      <div className="insurance-hero">
        <div className="scale-controls" aria-hidden={false}>
          <button className="scale-btn" onClick={decreaseScale} aria-label="Decrease text size">A-</button>
          <input className="scale-range" type="range" min="0.8" max="1.6" step="0.05" value={scale} onChange={onScaleChange} aria-label="Adjust page scale" />
          <button className="scale-btn" onClick={increaseScale} aria-label="Increase text size">A+</button>
        </div>
        <h1>Predictive Insurance Pool</h1>
        <p className="subtitle">NEO-PIT GARAGE · AI-DRIVEN RISK ANALYTICS</p>

        <div className="metrics-row">
          <div className="metric"> <div className="m-label">Total Pool Size</div><div className="m-value">$5,239,847</div></div>
          <div className="metric"> <div className="m-label">Pool Members</div><div className="m-value">12,841</div></div>
          <div className="metric"> <div className="m-label">Premium Collected</div><div className="m-value">$18,492</div></div>
          <div className="metric"> <div className="m-label">Active Policies</div><div className="m-value">1,848</div></div>
        </div>

        <div className="pool-health">
          <div className="health-left">
            <div className="health-label">Insurance Pool Health</div>
            <div className="health-value">{poolHealth}%</div>
          </div>
          <div className="health-bar"><div className="health-fill" style={{ width: `${poolHealth}%` }} /></div>
        </div>

        <div className="hero-actions">
          <button className={`join-btn ${joined ? 'joined' : ''}`} onClick={toggleJoin}>{joined ? 'IN POOL' : 'JOIN POOL'}</button>
          <div className="contrib-controls">
            <button onClick={() => contribute(50)} className="small">+50</button>
            <button onClick={() => contribute(200)} className="small">+200</button>
            <button onClick={() => contribute(-100)} className="small danger">-100</button>
          </div>
        </div>
      </div>

      <div className="analytics">
        <h3>AI Risk Analytics</h3>
        <Progress label="Wallets Risk Assessment" value={aiRisk} />
        <Progress label="Payout Likelihood" value={72} />
        <Progress label="Pool Loss Ratio" value={8} />
      </div>

      <div className="leaderboard">
        <h3>Safety Leaderboard</h3>
        <div className="leaders">
          {mockLeaderboard.map((p, i) => (
            <div className="leader" key={p.id} style={{ ['--i']: i }}>
              <div className="leader-left"> <div className="rank">{i+1}</div> <div className="name">{p.name}</div></div>
              <div className="leader-right"> <div className="score">{p.score}</div> <div className="rewards">{p.rewards}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="roi-row">
        <div className="roi-box"> <div className="r-label">30 Day ROI</div><div className="r-value">+18.4%</div></div>
        <div className="roi-box"> <div className="r-label">Total Premiums</div><div className="r-value">$847,392</div></div>
        <div className="roi-box"> <div className="r-label">Your Rewards</div><div className="r-value">$0</div></div>
        <div className="roi-box"> <div className="r-label">Insurance Status</div><div className="r-value">Healthy</div></div>
      </div>
    </div>
  );
}
