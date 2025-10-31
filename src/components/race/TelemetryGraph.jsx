import React, { useEffect, useRef, useState } from 'react';
import './TelemetryGraph.css';

function TelemetryGraph({ data = [], dataType = 'speed', carId, title, color = '#ff4b4b', height = 200 }) {
  const canvasRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    drawGraph();
  }, [data, dataType, color, height, hoveredPoint, selectedRange, isZoomed]);

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    const { width } = canvas;
    const graphHeight = height - 40; // Leave space for labels

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get data range
    const displayData = isZoomed && selectedRange ? data.slice(selectedRange.start, selectedRange.end + 1) : data;
    const values = displayData.map(point => getValue(point, dataType));
    const maxValue = Math.max(...values) * 1.1;
    const minValue = Math.min(...values) * 0.9;
    const range = maxValue - minValue || 1;

    // Draw grid
    drawGrid(ctx, width, graphHeight);

    // Draw data line
    drawDataLine(ctx, displayData, width, graphHeight, maxValue, minValue, range, color);

    // Draw fill area
    drawFillArea(ctx, displayData, width, graphHeight, maxValue, minValue, range, color);

    // Draw axes and labels
    drawAxes(ctx, width, height, graphHeight, maxValue, minValue);

    // Draw hovered point
    if (hoveredPoint !== null && displayData[hoveredPoint]) {
      drawHoveredPoint(ctx, hoveredPoint, displayData[hoveredPoint], width, graphHeight, maxValue, minValue, range);
    }
  };

  const drawGrid = (ctx, width, graphHeight) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = (graphHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, graphHeight);
      ctx.stroke();
    }
  };

  const drawDataLine = (ctx, displayData, width, graphHeight, maxValue, minValue, range, color) => {
    if (displayData.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    displayData.forEach((point, index) => {
      const value = getValue(point, dataType);
      const x = (index / Math.max(1, displayData.length - 1)) * width;
      const y = graphHeight - ((value - minValue) / range) * graphHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  };

  const drawFillArea = (ctx, displayData, width, graphHeight, maxValue, minValue, range, color) => {
    if (displayData.length < 2) return;

    ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.1)');
    ctx.beginPath();

    displayData.forEach((point, index) => {
      const value = getValue(point, dataType);
      const x = (index / Math.max(1, displayData.length - 1)) * width;
      const y = graphHeight - ((value - minValue) / range) * graphHeight;

      if (index === 0) {
        ctx.moveTo(x, graphHeight);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(width, graphHeight);
    ctx.closePath();
    ctx.fill();
  };

  const drawAxes = (ctx, width, height, graphHeight, maxValue, minValue) => {
    // Y-axis labels
    ctx.fillStyle = '#ccc';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 5; i++) {
      const value = minValue + (range * (5 - i) / 5);
      const y = (graphHeight / 5) * i;
      ctx.fillText(value.toFixed(1), 35, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const dataLength = isZoomed && selectedRange ? selectedRange.end - selectedRange.start + 1 : data.length;

    for (let i = 0; i <= 5; i++) {
      const dataIndex = Math.floor((dataLength - 1) * i / 5);
      const x = (width / 5) * i;
      ctx.fillText(dataIndex.toString(), x, height - 5);
    }
  };

  const drawHoveredPoint = (ctx, index, point, width, graphHeight, maxValue, minValue, range) => {
    const value = getValue(point, dataType);
    const displayData = isZoomed && selectedRange ? data.slice(selectedRange.start, selectedRange.end + 1) : data;
    const x = (index / Math.max(1, displayData.length - 1)) * width;
    const y = graphHeight - ((value - minValue) / range) * graphHeight;

    // Draw point
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw crosshairs
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, graphHeight);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    ctx.setLineDash([]);
  };

  const getValue = (point, type) => {
    switch (type) {
      case 'speed':
        return point.speed || point.value || 0;
      case 'rpm':
        return point.rpm || 0;
      case 'temperature':
        return point.temperature || point.temp || 0;
      case 'throttle':
        return point.throttle || 0;
      case 'brake':
        return point.brake || 0;
      case 'gear':
        return point.gear || 0;
      default:
        return point.value || point.speed || 0;
    }
  };

  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (y > height - 40) return; // Don't show tooltip on axis area

    const displayData = isZoomed && selectedRange ? data.slice(selectedRange.start, selectedRange.end + 1) : data;
    const dataIndex = Math.floor((x / canvas.width) * displayData.length);

    if (dataIndex >= 0 && dataIndex < displayData.length) {
      setHoveredPoint(dataIndex);
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const handleDoubleClick = () => {
    if (isZoomed) {
      setIsZoomed(false);
      setSelectedRange(null);
    }
  };

  const getTooltipContent = () => {
    if (hoveredPoint === null) return null;

    const displayData = isZoomed && selectedRange ? data.slice(selectedRange.start, selectedRange.end + 1) : data;
    const point = displayData[hoveredPoint];

    if (!point) return null;

    const value = getValue(point, dataType);
    const timestamp = point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : `Point ${hoveredPoint}`;

    return {
      value: value.toFixed(2),
      timestamp,
      unit: getUnit(dataType)
    };
  };

  const getUnit = (type) => {
    switch (type) {
      case 'speed': return 'km/h';
      case 'rpm': return 'RPM';
      case 'temperature': return '°C';
      case 'throttle': return '%';
      case 'brake': return '%';
      case 'gear': return '';
      default: return '';
    }
  };

  const tooltip = getTooltipContent();

  return (
    <div className="telemetry-graph">
      <div className="graph-header">
        <h4>{title || `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Graph`}</h4>
        <div className="graph-controls">
          <button
            className={`graph-btn ${isZoomed ? 'active' : ''}`}
            onClick={() => setIsZoomed(!isZoomed)}
            disabled={!selectedRange}
          >
            {isZoomed ? 'Zoom Out' : 'Zoom In'}
          </button>
          <span className="data-points">{data.length} points</span>
        </div>
      </div>

      <div className="graph-container">
        <canvas
          ref={canvasRef}
          width={600}
          height={height}
          className="graph-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
        />

        {tooltip && (
          <div className="graph-tooltip" style={{
            left: hoveredPoint ? `${(hoveredPoint / Math.max(1, (isZoomed && selectedRange ? selectedRange.end - selectedRange.start + 1 : data.length) - 1)) * 100}%` : '0%'
          }}>
            <div className="tooltip-value">{tooltip.value} {tooltip.unit}</div>
            <div className="tooltip-timestamp">{tooltip.timestamp}</div>
          </div>
        )}
      </div>

      <div className="graph-stats">
        <div className="stat">
          <span className="stat-label">Min</span>
          <span className="stat-value">{data.length > 0 ? Math.min(...data.map(p => getValue(p, dataType))).toFixed(1) : 0}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Max</span>
          <span className="stat-value">{data.length > 0 ? Math.max(...data.map(p => getValue(p, dataType))).toFixed(1) : 0}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Avg</span>
          <span className="stat-value">{data.length > 0 ? (data.reduce((sum, p) => sum + getValue(p, dataType), 0) / data.length).toFixed(1) : 0}</span>
        </div>
      </div>
    </div>
  );
}

export default TelemetryGraph;