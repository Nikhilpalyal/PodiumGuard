class ColorCodingEngine {
  constructor() {
    this.themes = {
      f1: {
        primary: '#ff4b4b',
        secondary: '#2fe2d5',
        accent: '#ff9b9b',
        background: '#0a0a0a',
        surface: 'rgba(255, 255, 255, 0.05)',
        text: '#ffffff',
        textSecondary: '#cccccc',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3'
      },
      dark: {
        primary: '#bb86fc',
        secondary: '#03dac6',
        accent: '#cf6679',
        background: '#121212',
        surface: 'rgba(255, 255, 255, 0.05)',
        text: '#ffffff',
        textSecondary: '#cccccc',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3'
      },
      light: {
        primary: '#6200ee',
        secondary: '#03dac6',
        accent: '#b00020',
        background: '#ffffff',
        surface: 'rgba(0, 0, 0, 0.05)',
        text: '#000000',
        textSecondary: '#666666',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3'
      }
    };

    this.currentTheme = 'f1';

    // Performance-based color mappings
    this.performanceColors = {
      exceptional: '#4caf50',  // Green
      strong: '#2196f3',       // Blue
      steady: '#ff9800',       // Orange
      struggling: '#ff5722',   // Deep Orange
      critical: '#f44336'      // Red
    };

    // Speed-based color gradients
    this.speedColors = [
      { threshold: 0, color: '#666666' },
      { threshold: 250, color: '#f44336' },
      { threshold: 280, color: '#ff9800' },
      { threshold: 300, color: '#ffeb3b' },
      { threshold: 320, color: '#4caf50' },
      { threshold: 350, color: '#2196f3' },
      { threshold: 380, color: '#9c27b0' }
    ];

    // Team colors
    this.teamColors = {
      'Red Bull Racing': '#1E41FF',
      'Mercedes': '#00D2BE',
      'Ferrari': '#DC0000',
      'McLaren': '#FF8700',
      'Aston Martin': '#006F62',
      'Alpine': '#0090FF',
      'AlphaTauri': '#2B4562',
      'Haas': '#FFFFFF',
      'Alfa Romeo': '#900000',
      'Williams': '#005AFF'
    };

    // Status colors
    this.statusColors = {
      'ON_TRACK': '#4caf50',
      'PIT': '#ff9800',
      'DNF': '#f44336',
      'DNS': '#9e9e9e',
      'FINISHED': '#4caf50'
    };

    // Alert severity colors
    this.alertColors = {
      'CRITICAL': '#f44336',
      'HIGH': '#ff5722',
      'WARNING': '#ff9800',
      'MEDIUM': '#ff9800',
      'LOW': '#ffeb3b',
      'INFO': '#4caf50'
    };
  }

  // Set current theme
  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
    }
  }

  // Get current theme
  getTheme() {
    return this.themes[this.currentTheme];
  }

  // Get color for performance status
  getPerformanceColor(performance) {
    return this.performanceColors[performance] || this.performanceColors.steady;
  }

  // Get color for speed value
  getSpeedColor(speed) {
    if (!speed || speed <= 0) return this.speedColors[0].color;

    // Find the appropriate color based on speed thresholds
    for (let i = this.speedColors.length - 1; i >= 0; i--) {
      if (speed >= this.speedColors[i].threshold) {
        return this.speedColors[i].color;
      }
    }

    return this.speedColors[0].color;
  }

  // Get gradient color between two speed values
  getSpeedGradientColor(speed, minSpeed = 250, maxSpeed = 380) {
    const normalizedSpeed = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed)));

    // Simple red to green gradient
    const red = Math.round(255 * (1 - normalizedSpeed));
    const green = Math.round(255 * normalizedSpeed);
    const blue = 0;

    return `rgb(${red}, ${green}, ${blue})`;
  }

  // Get team color
  getTeamColor(teamName) {
    return this.teamColors[teamName] || '#666666';
  }

  // Get status color
  getStatusColor(status) {
    return this.statusColors[status] || this.statusColors.ON_TRACK;
  }

  // Get alert severity color
  getAlertColor(severity) {
    return this.alertColors[severity] || this.alertColors.INFO;
  }

  // Get tire temperature color
  getTireTempColor(temp) {
    if (temp < 70) return '#2196f3';      // Too cold - Blue
    if (temp >= 70 && temp < 85) return '#4caf50';  // Optimal - Green
    if (temp >= 85 && temp < 100) return '#ffeb3b'; // Warm - Yellow
    if (temp >= 100 && temp < 115) return '#ff9800'; // Hot - Orange
    return '#f44336';                     // Too hot - Red
  }

  // Get engine temperature color
  getEngineTempColor(temp) {
    if (temp < 80) return '#2196f3';      // Too cold - Blue
    if (temp >= 80 && temp < 95) return '#4caf50';  // Optimal - Green
    if (temp >= 95 && temp < 110) return '#ffeb3b'; // Warm - Yellow
    if (temp >= 110 && temp < 125) return '#ff9800'; // Hot - Orange
    return '#f44336';                     // Overheating - Red
  }

  // Get fuel level color
  getFuelColor(fuelLevel) {
    if (fuelLevel > 80) return '#4caf50';   // Plenty - Green
    if (fuelLevel > 60) return '#ffeb3b';   // Good - Yellow
    if (fuelLevel > 40) return '#ff9800';   // Low - Orange
    if (fuelLevel > 20) return '#ff5722';   // Very low - Deep Orange
    return '#f44336';                       // Critical - Red
  }

  // Get brake temperature color
  getBrakeTempColor(temp) {
    if (temp < 200) return '#4caf50';      // Cold - Green
    if (temp >= 200 && temp < 400) return '#ffeb3b'; // Normal - Yellow
    if (temp >= 400 && temp < 600) return '#ff9800'; // Warm - Orange
    if (temp >= 600 && temp < 800) return '#ff5722'; // Hot - Deep Orange
    return '#f44336';                      // Fade risk - Red
  }

  // Get position-based color (for leaderboard)
  getPositionColor(position) {
    if (position === 1) return '#FFD700';     // Gold
    if (position === 2) return '#C0C0C0';     // Silver
    if (position === 3) return '#CD7F32';     // Bronze
    if (position <= 10) return '#4caf50';     // Green for top 10
    if (position <= 15) return '#ffeb3b';     // Yellow
    return '#f44336';                         // Red for back markers
  }

  // Get gap to leader color
  getGapColor(gap) {
    const gapSeconds = gap || 0;
    if (gapSeconds === 0) return '#FFD700';     // Leader - Gold
    if (gapSeconds < 5) return '#4caf50';       // Close - Green
    if (gapSeconds < 15) return '#ffeb3b';      // Moderate - Yellow
    if (gapSeconds < 30) return '#ff9800';      // Large - Orange
    return '#f44336';                           // Huge - Red
  }

  // Generate color palette for data visualization
  getDataVizColors(count) {
    const baseColors = [
      '#ff4b4b', '#2fe2d5', '#ff9b9b', '#4caf50', '#ff9800',
      '#2196f3', '#9c27b0', '#ff5722', '#795548', '#607d8b'
    ];

    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    // Generate additional colors if needed
    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      const hue = (i * 137.5) % 360; // Golden angle approximation
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }

    return colors;
  }

  // Get color for sector performance
  getSectorColor(sector, performance = 'normal') {
    const sectorColors = {
      1: { normal: '#4caf50', fast: '#2196f3', slow: '#ff9800' },
      2: { normal: '#ff9800', fast: '#4caf50', slow: '#f44336' },
      3: { normal: '#f44336', fast: '#ff9800', slow: '#9e9e9e' }
    };

    return sectorColors[sector]?.[performance] || sectorColors[sector]?.normal || '#666666';
  }

  // Get color for weather conditions
  getWeatherColor(weather) {
    const weatherColors = {
      'DRY': '#4caf50',
      'DAMP': '#ffeb3b',
      'WET': '#2196f3',
      'RAIN': '#3f51b5',
      'STORM': '#9c27b0'
    };

    return weatherColors[weather] || '#666666';
  }

  // Get color for track conditions
  getTrackConditionColor(condition) {
    const conditionColors = {
      'GOOD': '#4caf50',
      'FAIR': '#ffeb3b',
      'POOR': '#ff9800',
      'DANGEROUS': '#f44336'
    };

    return conditionColors[condition] || '#666666';
  }

  // Create CSS custom properties for theme
  getCSSVariables() {
    const theme = this.themes[this.currentTheme];
    const variables = {};

    Object.entries(theme).forEach(([key, value]) => {
      variables[`--color-${key}`] = value;
    });

    // Add performance colors
    Object.entries(this.performanceColors).forEach(([key, value]) => {
      variables[`--color-performance-${key}`] = value;
    });

    // Add team colors
    Object.entries(this.teamColors).forEach(([team, color]) => {
      const varName = team.toLowerCase().replace(/\s+/g, '-');
      variables[`--color-team-${varName}`] = color;
    });

    return variables;
  }

  // Apply theme to document
  applyTheme(themeName = null) {
    if (themeName) {
      this.setTheme(themeName);
    }

    const variables = this.getCSSVariables();
    const root = document.documentElement;

    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  // Get color for numerical value with thresholds
  getThresholdColor(value, thresholds) {
    // thresholds should be array of { threshold, color } objects, sorted by threshold ascending
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (value >= thresholds[i].threshold) {
        return thresholds[i].color;
      }
    }
    return thresholds[0]?.color || '#666666';
  }

  // Interpolate between two colors
  interpolateColor(color1, color2, factor) {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return `rgb(${r}, ${g}, ${b})`;
  }

  // Convert hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Get contrasting text color for background
  getContrastColor(backgroundColor) {
    const rgb = this.hexToRgb(backgroundColor);
    if (!rgb) return '#ffffff';

    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  // Generate colorblind-friendly palette
  getColorblindPalette() {
    return {
      primary: '#0072B2',    // Blue
      secondary: '#E69F00',  // Orange
      tertiary: '#009E73',   // Green
      quaternary: '#CC79A7', // Pink
      quinary: '#56B4E9',    // Light Blue
      senary: '#F0E442'      // Yellow
    };
  }

  // Get color for accessibility
  getAccessibleColor(backgroundColor, textColor = '#ffffff') {
    const contrast = this.getContrastRatio(backgroundColor, textColor);

    // WCAG AA requires 4.5:1 for normal text
    if (contrast < 4.5) {
      return this.getContrastColor(backgroundColor);
    }

    return textColor;
  }

  // Calculate contrast ratio
  getContrastRatio(color1, color2) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return 1;

    const lum1 = this.getLuminance(rgb1);
    const lum2 = this.getLuminance(rgb2);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  // Get relative luminance
  getLuminance(rgb) {
    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;

    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}

// Create singleton instance
const colorCodingEngine = new ColorCodingEngine();

export default colorCodingEngine;