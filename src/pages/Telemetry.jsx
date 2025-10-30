import React, { useEffect, useRef, useState } from 'react';
import './Telemetry.css';

function LineChart({ data = [], color = '#ff4b4b', fill = false }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [tip, setTip] = useState({ visible: false, x: 0, y: 0, idx: 0, value: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.scale(dpr, dpr);

    // clear
    ctx.clearRect(0, 0, w, h);

    // background subtle grid
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const cols = 4;
    for (let i = 1; i < cols; i++) {
      const x = (w / cols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (!data || data.length === 0) return;

    const max = Math.max(...data) * 1.05;
    const min = Math.min(...data) * 0.95;
    const range = Math.max(1, max - min);

    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = color;
    const len = data.length;
    for (let i = 0; i < len; i++) {
      const x = (i / Math.max(1, len - 1)) * (w - 12) + 6;
      const y = h - ((data[i] - min) / range) * (h - 12) - 6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (fill) {
      ctx.lineTo(w - 6, h - 6);
      ctx.lineTo(6, h - 6);
      ctx.closePath();
      ctx.fillStyle = color.replace(')', ',0.12)').replace('rgb', 'rgba');
      // fallback if color not rgb
      try { ctx.fill(); } catch (e) { /* ignore */ }
    }

    // last point marker
    const lastX = ( (len - 1) / Math.max(1, len - 1) ) * (w - 12) + 6;
    const lastY = h - ((data[len - 1] - min) / range) * (h - 12) - 6;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }, [data, color, fill]);

  // pointer handlers for tooltip
  function handleMove(e) {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const len = data.length;
    // reverse of x calc in drawing
    const norm = Math.min(1, Math.max(0, (x - 6) / Math.max(1, w - 12)));
    const idx = Math.round(norm * (len - 1));
    const value = data[Math.min(len - 1, Math.max(0, idx))];
    // position tooltip slightly above cursor and clamp
    const parentRect = wrapRef.current?.getBoundingClientRect();
    let left = x + 12;
    let top = y - 10;
    if (parentRect) {
      // avoid overflow right
      if (left + 140 > parentRect.width) left = x - 140 - 12;
      if (top < 6) top = 6;
    }
    setTip({ visible: true, x: left, y: top, idx, value });
  }

  function handleLeave() {
    setTip((t) => ({ ...t, visible: false }));
  }

  return (
    <div className="linechart-wrap" ref={wrapRef}>
      <canvas className="telemetry-canvas" ref={canvasRef} onMouseMove={handleMove} onMouseLeave={handleLeave} />
      {tip.visible && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="ct-value">{tip.value}</div>
          <div className="ct-idx">pt #{tip.idx}</div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, children }) {
  return (
    <div className="stat-card">
      <div className="sc-title">{title}</div>
      <div className="sc-body">{children}</div>
    </div>
  );
}

function statsFrom(arr) {
  const current = arr[arr.length - 1];
  const max = Math.max(...arr);
  const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100;
  return { current, max, avg };
}

function tireTempsFrom(baseArr) {
  // produce four tyre temps from base temp series with small offsets
  const last = baseArr[baseArr.length - 1] || 90;
  return [
    +(last + (Math.random() * 3 - 1)).toFixed(2),
    +(last + (Math.random() * 2 - 0.5)).toFixed(2),
    +(last + (Math.random() * 2 - 1.2)).toFixed(2),
    +(last + (Math.random() * 3 - 1)).toFixed(2),
  ];
}

function ChartCard({ title, subtitle, data, color, fill = false }) {
  const s = statsFrom(data);
  const tyres = tireTempsFrom(data);
  return (
    <div className="chart-card perf-card">
      <div className="chart-head-row">
        <div>
          <div className="chart-head">{title}</div>
          <div className="chart-sub">{subtitle}</div>
        </div>
        <div className="tag">Live Data</div>
      </div>
      <LineChart data={data} color={color} fill={fill} />
      <div className="card-stats">
        <div className="stat-col">
          <div className="st-label">Current</div>
          <div className="st-value">{s.current}</div>
          <div className="st-unit">{title.includes('Speed') ? 'km/h' : title.includes('Temperature') ? '°C' : ''}</div>
        </div>
        <div className="stat-col">
          <div className="st-label">Max</div>
          <div className="st-value">{s.max}</div>
          <div className="st-unit">{title.includes('Speed') ? 'km/h' : ''}</div>
        </div>
        <div className="stat-col">
          <div className="st-label">Avg</div>
          <div className="st-value">{s.avg}</div>
          <div className="st-unit">{title.includes('Speed') ? 'km/h' : ''}</div>
        </div>
      </div>
      <div className="tyres-row">
        <button className="tyre">FL<br/><span>{tyres[0]}°C</span></button>
        <button className="tyre">FR<br/><span>{tyres[1]}°C</span></button>
        <button className="tyre">RL<br/><span>{tyres[2]}°C</span></button>
        <button className="tyre">RR<br/><span>{tyres[3]}°C</span></button>
      </div>
    </div>
  );
}

export default function Telemetry() {
  const [running, setRunning] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [recording, setRecording] = useState(false);
  const [graphView, setGraphView] = useState(false);
  const [dataRate, setDataRate] = useState(60);
  const [points, setPoints] = useState(60);

  // create three datasets: speed, temp, rpm
  const [speed, setSpeed] = useState(() => Array.from({ length: 60 }, () => 320 + Math.random() * 10));
  const [temp, setTemp] = useState(() => Array.from({ length: 60 }, () => 80 + Math.random() * 3));
  const [rpm, setRpm] = useState(() => Array.from({ length: 60 }, () => 14000 + Math.random() * 300));

  useEffect(() => {
    const t = setInterval(() => {
      if (!running) return;
      setSpeed((s) => {
        const next = s.slice(1);
        const last = next[next.length - 1] || 320;
        next.push(Math.max(0, Math.round(last + (Math.random() * 6 - 3))));
        return next;
      });
      setTemp((s) => {
        const next = s.slice(1);
        const last = next[next.length - 1] || 80;
        next.push(Math.max(0, +(last + (Math.random() * 0.6 - 0.3)).toFixed(2)));
        return next;
      });
      setRpm((s) => {
        const next = s.slice(1);
        const last = next[next.length - 1] || 14000;
        next.push(Math.max(0, Math.round(last + (Math.random() * 300 - 150))));
        return next;
      });
      setLastUpdate(Date.now());
      setPoints((p) => p + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  return (
    <div className="telemetry-page">
      <div className="telemetry-hero">
        <div>
          <h1>Race Telemetry Engine</h1>
          <p className="subtitle">Real-time car performance monitoring</p>
        </div>
        <div className="hero-actions">
          <button className={`ctl ${running ? 'pause' : 'play'}`} onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Resume'}</button>
          <div className="last-up">Last update: {new Date(lastUpdate).toLocaleTimeString()}</div>
        </div>
      </div>

      <section className="telemetry-grid">
        <div className="telemetry-toolbar">
          <div className="toolbar-left">
            <button className="btn" onClick={() => setRunning((r) => !r)}>{running ? 'Pause Telemetry' : 'Resume Telemetry'}</button>
            <button className={`btn ${graphView? 'active':''}`} onClick={() => setGraphView((s)=>!s)}>Graph View</button>
            <button className={`btn ${recording? 'rec':''}`} onClick={() => setRecording((r) => !r)}>{recording ? 'Stop Recording' : 'Start Recording'}</button>
          </div>
          <div className="toolbar-center">
            <div className="data-rate">
              Data Rate:
              <button className={`rate ${dataRate===10? 'on':''}`} onClick={() => setDataRate(10)}>10 Hz</button>
              <button className={`rate ${dataRate===30? 'on':''}`} onClick={() => setDataRate(30)}>30 Hz</button>
              <button className={`rate ${dataRate===60? 'on':''}`} onClick={() => setDataRate(60)}>60 Hz</button>
              <button className={`rate ${dataRate===120? 'on':''}`} onClick={() => setDataRate(120)}>120 Hz</button>
            </div>
          </div>
          <div className="toolbar-right">
            <div className="live">LIVE <span className="pts">{points} pts</span></div>
            <div className="session">Session: {new Date().toLocaleDateString()} , {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
        <h2 className="section-title">Performance Analytics</h2>
        <div className="perf-grid">
          <ChartCard title="Speed Trend - Car #1" subtitle="Real-time speed monitoring" data={speed} color="#ff4b4b" />
          <ChartCard title="Temperature Trends - Car #1" subtitle="Tire temperature monitoring" data={temp} color="#ff6b6b" fill />
          <ChartCard title="Speed Trend - Car #44" subtitle="Real-time speed monitoring" data={speed.map((v,i)=> Math.max(0, v - (i%5)*2))} color="#3be0c4" />
          <ChartCard title="Temperature Trends - Car #44" subtitle="Tire temperature monitoring" data={temp.map((t,i)=> +(t + (i%3)*0.6).toFixed(2))} color="#6bd1ff" fill />
        </div>

        <div className="panels-row">
          <AIAnalysis speed={speed} />
          <TeamPerformance speed={speed} />
        </div>
      </section>
    </div>
  );
}

function AIAnalysis({ speed }) {
  const warnings = [
    {
      id: 1,
      title: 'Tire Degradation Warning',
      body: 'Car #44 showing increased tire wear on front-left compound. Recommend pit window in 3-5 laps for optimal strategy.',
      priority: 'HIGH',
      time: '03:35',
    },
    {
      id: 2,
      title: 'Fuel Delta Anomaly',
      body: 'Unusual fuel delta detected vs expected consumption on Car #1. Monitor throttle bias.',
      priority: 'MEDIUM',
      time: '03:30',
    },
  ];

  const [idx, setIdx] = useState(0);
  const conf = Math.round(90 + Math.random() * 8 + (speed[speed.length-1] % 2));

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div>
          <div className="ai-title">AI Race Analysis</div>
          <div className="ai-sub">Real-time predictions & insights</div>
        </div>
        <div className="ai-status">Active</div>
      </div>

      <div className="ai-card-wrap">
        <div className="ai-card highlight">
          <div className="ai-card-left">
            <div className="ai-card-title">{warnings[idx].title}</div>
            <div className="ai-card-body">{warnings[idx].body}</div>
            <div className="ai-meta">Priority: <span className="prio">{warnings[idx].priority}</span></div>
          </div>
          <div className="ai-card-right">
            <div className="ai-time">{warnings[idx].time}</div>
            <a className="view-details" href="#">View Details</a>
          </div>
        </div>
      </div>

      <div className="ai-footer">
        <div className="dots">
          {warnings.map((w, i) => (
            <button key={w.id} className={`dot ${i===idx? 'active':''}`} onClick={() => setIdx(i)} />
          ))}
        </div>
        <div className="confidence">AI Confidence Level <strong>{conf}%</strong></div>
      </div>
    </div>
  );
}

function TeamPerformance({ speed }) {
  const top = Math.max(...speed).toFixed(6);
  const lapsDone = 55;
  const lapsTotal = 58;
  const latency = (30 + Math.random() * 30).toFixed(12);

  return (
    <div className="team-panel">
      <div className="tp-header">Team Performance</div>
      <div className="tp-card">
        <div className="tp-left">
          <div className="tp-rank">1</div>
          <div>
            <div className="tp-name">Max Verstappen</div>
            <div className="tp-role">Formula 1 Driver</div>
          </div>
        </div>
        <div className="tp-right">LIVE<br/><span className="tp-pos">P1</span></div>
      </div>

      <div className="tp-stats">
        <div className="tp-stat big"><div className="label">Top Speed</div><div className="num">{top}</div><div className="unit">km/h</div></div>
        <div className="tp-stat small"><div className="label">Laps Completed</div><div className="num">{lapsDone} / {lapsTotal}</div></div>
        <div className="tp-stat small"><div className="label">Reaction Latency</div><div className="num">{latency}</div><div className="unit">ms</div><div className="sub">Excellent</div></div>
      </div>

      <div className="tp-footer">
        <div className="delta">+2.3% <span>vs last session</span></div>
        <a className="tp-details" href="#">Details</a>
      </div>
    </div>
  );
}
