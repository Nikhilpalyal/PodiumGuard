import React, { useEffect, useRef, useState } from 'react';
import './TrackMap.css';

function TrackMap({ cars = [], selectedCarId, onCarSelect, trackLayout = 'monza' }) {
  const canvasRef = useRef(null);
  const [hoveredCar, setHoveredCar] = useState(null);
  const [viewMode, setViewMode] = useState('full'); // full, sector, pit
  const [showTrails, setShowTrails] = useState(true);
  const [carTrails, setCarTrails] = useState(new Map());

  // Track layouts (simplified coordinates)
  const trackLayouts = {
    monza: {
      name: 'Monza Circuit',
      length: 5793,
      points: [
        { x: 100, y: 200 }, { x: 150, y: 180 }, { x: 200, y: 160 }, { x: 250, y: 140 },
        { x: 300, y: 130 }, { x: 350, y: 140 }, { x: 400, y: 160 }, { x: 450, y: 180 },
        { x: 480, y: 200 }, { x: 480, y: 250 }, { x: 450, y: 280 }, { x: 400, y: 300 },
        { x: 350, y: 310 }, { x: 300, y: 300 }, { x: 250, y: 280 }, { x: 200, y: 260 },
        { x: 150, y: 240 }, { x: 120, y: 220 }, { x: 100, y: 200 }
      ],
      sectors: [
        { start: 0, end: 5, color: '#4caf50' },
        { start: 5, end: 11, color: '#ff9800' },
        { start: 11, end: 17, color: '#f44336' }
      ],
      pitLane: { x: 300, y: 320, width: 100, height: 20 }
    }
  };

  const currentTrack = trackLayouts[trackLayout] || trackLayouts.monza;

  // Update car trails
  useEffect(() => {
    if (!showTrails) return;

    setCarTrails(prevTrails => {
      const newTrails = new Map(prevTrails);

      cars.forEach(car => {
        if (!newTrails.has(car.carId)) {
          newTrails.set(car.carId, []);
        }

        const trail = newTrails.get(car.carId);
        const position = getCarPosition(car);

        // Add current position to trail
        trail.push({
          ...position,
          timestamp: Date.now(),
          speed: car.speed
        });

        // Keep only last 20 positions
        if (trail.length > 20) {
          trail.shift();
        }

        newTrails.set(car.carId, trail);
      });

      return newTrails;
    });
  }, [cars, showTrails]);

  // Draw track and cars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw track
    drawTrack(ctx, width, height);

    // Draw car trails
    if (showTrails) {
      drawCarTrails(ctx);
    }

    // Draw cars
    drawCars(ctx);

    // Draw pit lane
    drawPitLane(ctx, width, height);

  }, [cars, hoveredCar, viewMode, showTrails, carTrails]);

  const drawTrack = (ctx, width, height) => {
    const track = currentTrack;

    // Draw track outline
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 8;
    ctx.beginPath();

    track.points.forEach((point, index) => {
      const x = (point.x / 500) * width;
      const y = (point.y / 350) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();
    ctx.stroke();

    // Draw sector colors
    track.sectors.forEach(sector => {
      ctx.strokeStyle = sector.color;
      ctx.lineWidth = 4;
      ctx.beginPath();

      for (let i = sector.start; i <= sector.end; i++) {
        const point = track.points[i];
        const x = (point.x / 500) * width;
        const y = (point.y / 350) * height;

        if (i === sector.start) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    });

    // Draw start/finish line
    const startPoint = track.points[0];
    const nextPoint = track.points[1];
    const startX = (startPoint.x / 500) * width;
    const startY = (startPoint.y / 350) * height;
    const nextX = (nextPoint.x / 500) * width;
    const nextY = (nextPoint.y / 350) * height;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(nextX, nextY);
    ctx.stroke();

    // Add checkered pattern to start line
    ctx.fillStyle = '#000';
    ctx.fillRect(startX - 2, startY - 2, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(startX + 2, startY - 2, 4, 4);
    ctx.fillStyle = '#000';
    ctx.fillRect(startX - 2, startY + 2, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(startX + 2, startY + 2, 4, 4);
  };

  const drawCarTrails = (ctx) => {
    carTrails.forEach((trail, carId) => {
      if (trail.length < 2) return;

      const canvas = canvasRef.current;
      const { width, height } = canvas;

      ctx.strokeStyle = getCarColor(carId);
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;

      ctx.beginPath();
      trail.forEach((point, index) => {
        const x = (point.x / 500) * width;
        const y = (point.y / 350) * height;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      ctx.globalAlpha = 1;
    });
  };

  const drawCars = (ctx) => {
    const canvas = canvasRef.current;
    const { width, height } = canvas;

    cars.forEach(car => {
      const position = getCarPosition(car);
      const x = (position.x / 500) * width;
      const y = (position.y / 350) * height;

      // Car body
      ctx.fillStyle = getCarColor(car.carId);
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Car number
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(car.carId.toString(), x, y + 3);

      // Speed indicator
      if (car.speed > 300) {
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Selected car highlight
      if (selectedCarId === car.carId) {
        ctx.strokeStyle = '#ff4b4b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Hovered car highlight
      if (hoveredCar === car.carId) {
        ctx.strokeStyle = '#2fe2d5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  };

  const drawPitLane = (ctx, width, height) => {
    const pit = currentTrack.pitLane;
    const x = (pit.x / 500) * width;
    const y = (pit.y / 350) * height;

    ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
    ctx.fillRect(x - pit.width/2, y - pit.height/2, pit.width, pit.height);

    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - pit.width/2, y - pit.height/2, pit.width, pit.height);

    ctx.fillStyle = '#ff9800';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PIT LANE', x, y + 4);
  };

  // Get car position on track (simplified)
  const getCarPosition = (car) => {
    // Use lap progress and sector to position car on track
    const lapProgress = (car.lapNumber || 1) % 1; // Simplified
    const sector = car.sector || 1;

    // Map to track points
    const trackPoints = currentTrack.points;
    const totalPoints = trackPoints.length;
    const pointIndex = Math.floor((lapProgress * totalPoints) + (sector - 1) * 3) % totalPoints;

    return trackPoints[pointIndex] || trackPoints[0];
  };

  // Get car color based on team
  const getCarColor = (carId) => {
    const colors = {
      1: '#1E41FF',   // Red Bull
      44: '#00D2BE',  // Mercedes
      16: '#DC0000',  // Ferrari
      63: '#00D2BE',  // Mercedes
      55: '#DC0000',  // Ferrari
      11: '#1E41FF',  // Red Bull
      4: '#FF8700',   // McLaren
      81: '#FF8700',  // McLaren
      14: '#006F62',  // Aston Martin
      18: '#006F62',  // Aston Martin
      3: '#2B4562',   // AlphaTauri
      31: '#0090FF',  // Alpine
      10: '#0090FF',  // Alpine
      20: '#FFFFFF',  // Haas
      22: '#2B4562',  // AlphaTauri
      27: '#FFFFFF',  // Haas
      24: '#900000',  // Alfa Romeo
      2: '#005AFF',   // Williams
      77: '#900000',  // Alfa Romeo
      23: '#005AFF'   // Williams
    };

    return colors[carId] || '#666';
  };

  // Handle mouse events
  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if mouse is over a car
    let foundCar = null;
    cars.forEach(car => {
      const position = getCarPosition(car);
      const carX = (position.x / 500) * canvas.width;
      const carY = (position.y / 350) * canvas.height;

      const distance = Math.sqrt((x - carX) ** 2 + (y - carY) ** 2);
      if (distance < 15) {
        foundCar = car.carId;
      }
    });

    setHoveredCar(foundCar);
  };

  const handleClick = () => {
    if (hoveredCar && onCarSelect) {
      const car = cars.find(c => c.carId === hoveredCar);
      if (car) {
        onCarSelect(car);
      }
    }
  };

  return (
    <div className="track-map">
      <div className="track-header">
        <h3>🏁 {currentTrack.name}</h3>
        <div className="track-controls">
          <button
            className={viewMode === 'full' ? 'active' : ''}
            onClick={() => setViewMode('full')}
          >
            Full Track
          </button>
          <button
            className={viewMode === 'sector' ? 'active' : ''}
            onClick={() => setViewMode('sector')}
          >
            Sector View
          </button>
          <button
            className={viewMode === 'pit' ? 'active' : ''}
            onClick={() => setViewMode('pit')}
          >
            Pit Lane
          </button>
          <button
            className={showTrails ? 'active' : ''}
            onClick={() => setShowTrails(!showTrails)}
          >
            Trails
          </button>
        </div>
      </div>

      <div className="track-canvas-container">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="track-canvas"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        {hoveredCar && (
          <div className="car-tooltip">
            {(() => {
              const car = cars.find(c => c.carId === hoveredCar);
              return car ? (
                <div>
                  <div className="tooltip-driver">{car.driver}</div>
                  <div className="tooltip-team">{car.team}</div>
                  <div className="tooltip-speed">{car.speed} km/h</div>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </div>

      <div className="track-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4caf50' }}></div>
          <span>Sector 1</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ff9800' }}></div>
          <span>Sector 2</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f44336' }}></div>
          <span>Sector 3</span>
        </div>
        <div className="legend-item">
          <div className="legend-indicator">🏁</div>
          <span>Start/Finish</span>
        </div>
      </div>
    </div>
  );
}

export default TrackMap;