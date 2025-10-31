class VisualizationEngine {
  constructor() {
    this.canvases = new Map();
    this.animations = new Map();
    this.themes = {
      dark: {
        background: '#0a0a0a',
        grid: 'rgba(255, 255, 255, 0.1)',
        text: '#ffffff',
        accent: '#ff4b4b',
        secondary: '#2fe2d5'
      },
      light: {
        background: '#ffffff',
        grid: 'rgba(0, 0, 0, 0.1)',
        text: '#000000',
        accent: '#ff4b4b',
        secondary: '#2fe2d5'
      }
    };

    this.currentTheme = 'dark';
    this.animationFrame = null;
    this.isAnimating = false;
  }

  // Initialize canvas for visualization
  initializeCanvas(canvasId, width = 800, height = 400) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas with id ${canvasId} not found`);
      return null;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Enable high DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    this.canvases.set(canvasId, { canvas, ctx, width: rect.width, height: rect.height });
    return { canvas, ctx };
  }

  // Draw track map
  drawTrackMap(canvasId, cars = [], trackLayout = null, options = {}) {
    const canvasData = this.canvases.get(canvasId);
    if (!canvasData) return;

    const { ctx, width, height } = canvasData;
    const theme = this.themes[this.currentTheme];

    // Clear canvas
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);

    // Draw track
    if (trackLayout) {
      this.drawTrack(ctx, trackLayout, width, height, theme);
    }

    // Draw cars
    cars.forEach(car => {
      this.drawCar(ctx, car, width, height, options.selectedCarId === car.carId);
    });

    // Draw UI elements
    this.drawTrackUI(ctx, width, height, cars, theme);
  }

  // Draw track layout
  drawTrack(ctx, trackLayout, width, height, theme) {
    const points = trackLayout.points || [];

    if (points.length < 2) return;

    // Draw track outline
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 3;
    ctx.beginPath();

    points.forEach((point, index) => {
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

    // Draw sectors
    if (trackLayout.sectors) {
      trackLayout.sectors.forEach(sector => {
        ctx.strokeStyle = sector.color || theme.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = sector.start; i <= sector.end; i++) {
          const point = points[i];
          if (point) {
            const x = (point.x / 500) * width;
            const y = (point.y / 350) * height;

            if (i === sector.start) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }

        ctx.stroke();
      });
    }

    // Draw pit lane
    if (trackLayout.pitLane) {
      const pit = trackLayout.pitLane;
      ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
      ctx.fillRect(
        (pit.x - pit.width/2) / 500 * width,
        (pit.y - pit.height/2) / 350 * height,
        pit.width / 500 * width,
        pit.height / 350 * height
      );

      ctx.strokeStyle = '#ff9800';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        (pit.x - pit.width/2) / 500 * width,
        (pit.y - pit.height/2) / 350 * height,
        pit.width / 500 * width,
        pit.height / 350 * height
      );
    }
  }

  // Draw car on track
  drawCar(ctx, car, width, height, isSelected = false) {
    // Get car position (simplified)
    const position = this.getCarPosition(car);
    const x = (position.x / 500) * width;
    const y = (position.y / 350) * height;

    // Car body
    ctx.fillStyle = this.getCarColor(car.carId);
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car number
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(car.carId.toString(), x, y + 2);

    // Speed indicator
    if (car.speed > 300) {
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Selection indicator
    if (isSelected) {
      ctx.strokeStyle = '#ff4b4b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Status indicator
    if (car.status === 'PIT') {
      ctx.fillStyle = '#ff9800';
      ctx.beginPath();
      ctx.arc(x - 8, y - 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw track UI elements
  drawTrackUI(ctx, width, height, cars, theme) {
    // Draw legend
    this.drawLegend(ctx, width, height, theme);

    // Draw car labels for top cars
    this.drawCarLabels(ctx, width, height, cars, theme);
  }

  // Draw legend
  drawLegend(ctx, width, height, theme) {
    const legendX = 10;
    const legendY = height - 60;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(legendX - 5, legendY - 5, 120, 50);

    ctx.fillStyle = theme.text;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    const legendItems = [
      { color: '#4caf50', label: 'Sector 1' },
      { color: '#ff9800', label: 'Sector 2' },
      { color: '#f44336', label: 'Sector 3' }
    ];

    legendItems.forEach((item, index) => {
      const y = legendY + (index * 15);

      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, y, 12, 12);

      ctx.fillStyle = theme.text;
      ctx.fillText(item.label, legendX + 18, y + 10);
    });
  }

  // Draw car labels
  drawCarLabels(ctx, width, height, cars, theme) {
    const topCars = cars.slice(0, 3);

    topCars.forEach((car, index) => {
      const labelX = width - 80;
      const labelY = 20 + (index * 25);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(labelX - 5, labelY - 12, 75, 20);

      ctx.fillStyle = this.getCarColor(car.carId);
      ctx.fillRect(labelX, labelY - 10, 12, 12);

      ctx.fillStyle = theme.text;
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${car.carId}. ${car.driver?.split(' ')[1] || 'Unknown'}`, labelX + 18, labelY + 2);
    });
  }

  // Draw telemetry graph
  drawTelemetryGraph(canvasId, data = [], dataType = 'speed', options = {}) {
    const canvasData = this.canvases.get(canvasId);
    if (!canvasData || !data.length) return;

    const { ctx, width, height } = canvasData;
    const theme = this.themes[this.currentTheme];

    // Clear canvas
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    this.drawGraphGrid(ctx, width, height, theme);

    // Draw data line
    this.drawGraphLine(ctx, data, width, height, dataType, theme, options);

    // Draw axes and labels
    this.drawGraphAxes(ctx, width, height, data, dataType, theme);
  }

  // Draw graph grid
  drawGraphGrid(ctx, width, height, theme) {
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - 30);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = ((height - 30) / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  // Draw graph line
  drawGraphLine(ctx, data, width, height, dataType, theme, options) {
    if (data.length < 2) return;

    const values = data.map(point => this.getGraphValue(point, dataType));
    const maxValue = Math.max(...values) * 1.1;
    const minValue = Math.min(...values) * 0.9;
    const range = maxValue - minValue || 1;

    // Draw fill area
    ctx.fillStyle = theme.accent.replace('rgb', 'rgba').replace(')', ', 0.2)');
    ctx.beginPath();

    data.forEach((point, index) => {
      const value = this.getGraphValue(point, dataType);
      const x = (index / Math.max(1, data.length - 1)) * width;
      const y = (height - 30) - ((value - minValue) / range) * (height - 30);

      if (index === 0) {
        ctx.moveTo(x, height - 30);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(width, height - 30);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const value = this.getGraphValue(point, dataType);
      const x = (index / Math.max(1, data.length - 1)) * width;
      const y = (height - 30) - ((value - minValue) / range) * (height - 30);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  // Draw graph axes
  drawGraphAxes(ctx, width, height, data, dataType, theme) {
    // Y-axis labels
    ctx.fillStyle = theme.text;
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';

    const maxValue = Math.max(...data.map(point => this.getGraphValue(point, dataType))) * 1.1;
    const minValue = Math.min(...data.map(point => this.getGraphValue(point, dataType))) * 0.9;

    for (let i = 0; i <= 5; i++) {
      const value = minValue + (maxValue - minValue) * (5 - i) / 5;
      const y = ((height - 30) / 5) * i;
      ctx.fillText(value.toFixed(1), 35, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const dataIndex = Math.floor((data.length - 1) * i / 5);
      const x = (width / 5) * i;
      ctx.fillText(dataIndex.toString(), x, height - 10);
    }

    // Axis labels
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(this.getAxisLabel(dataType), 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillText('Time', width / 2, height - 5);
  }

  // Get graph value for data type
  getGraphValue(point, dataType) {
    switch (dataType) {
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
      default:
        return point.value || 0;
    }
  }

  // Get axis label for data type
  getAxisLabel(dataType) {
    switch (dataType) {
      case 'speed': return 'Speed (km/h)';
      case 'rpm': return 'RPM';
      case 'temperature': return 'Temperature (°C)';
      case 'throttle': return 'Throttle (%)';
      case 'brake': return 'Brake (%)';
      default: return 'Value';
    }
  }

  // Get car position (simplified)
  getCarPosition(car) {
    // This would use actual GPS/track position data
    // For now, return mock position based on lap progress
    const lapProgress = (car.lapNumber || 1) % 1;
    return {
      x: 200 + Math.cos(lapProgress * Math.PI * 2) * 150,
      y: 200 + Math.sin(lapProgress * Math.PI * 2) * 100
    };
  }

  // Get car color
  getCarColor(carId) {
    const colors = {
      1: '#1E41FF', 44: '#00D2BE', 16: '#DC0000', 63: '#00D2BE',
      55: '#DC0000', 11: '#1E41FF', 4: '#FF8700', 81: '#FF8700',
      14: '#006F62', 18: '#006F62', 3: '#2B4562', 31: '#0090FF',
      10: '#0090FF', 20: '#FFFFFF', 22: '#2B4562', 27: '#FFFFFF',
      24: '#900000', 2: '#005AFF', 77: '#900000', 23: '#005AFF'
    };
    return colors[carId] || '#666';
  }

  // Start animation loop
  startAnimation(canvasId, animationFunction) {
    if (this.animations.has(canvasId)) {
      this.stopAnimation(canvasId);
    }

    const animate = () => {
      animationFunction();
      this.animations.set(canvasId, requestAnimationFrame(animate));
    };

    this.animations.set(canvasId, requestAnimationFrame(animate));
  }

  // Stop animation
  stopAnimation(canvasId) {
    if (this.animations.has(canvasId)) {
      cancelAnimationFrame(this.animations.get(canvasId));
      this.animations.delete(canvasId);
    }
  }

  // Set theme
  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
    }
  }

  // Get theme
  getTheme() {
    return this.themes[this.currentTheme];
  }

  // Resize canvas
  resizeCanvas(canvasId) {
    const canvasData = this.canvases.get(canvasId);
    if (!canvasData) return;

    const { canvas, ctx } = canvasData;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    canvasData.width = rect.width;
    canvasData.height = rect.height;
  }

  // Clean up
  destroy() {
    // Stop all animations
    this.animations.forEach((animationId) => {
      cancelAnimationFrame(animationId);
    });
    this.animations.clear();
    this.canvases.clear();
  }
}

// Create singleton instance
const visualizationEngine = new VisualizationEngine();

export default visualizationEngine;