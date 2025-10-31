# Race Telemetry Engine Theming & Customization Guide

This guide explains how to customize the appearance and behavior of the `<race-telemetry-engine>` Web Component to match your F1 dashboard's design system.

## CSS Custom Properties (CSS Variables)

The component uses CSS custom properties for easy theming. Override these variables to customize the appearance:

```css
race-telemetry-engine {
  /* Color Scheme */
  --primary-color: #ff0000;
  --secondary-color: #00ff00;
  --accent-color: #ffff00;
  --warning-color: #ffa500;
  --critical-color: #ff0000;

  /* Backgrounds */
  --background-primary: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  --background-secondary: rgba(0, 0, 0, 0.5);
  --background-tertiary: rgba(0, 0, 0, 0.8);

  /* Text Colors */
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --text-muted: #888888;

  /* Borders */
  --border-color: #ff0000;
  --border-radius: 10px;
  --border-width: 2px;

  /* Shadows */
  --shadow-color: rgba(255, 0, 0, 0.3);
  --shadow-blur: 20px;

  /* Typography */
  --font-family: 'Orbitron', 'Courier New', monospace;
  --font-size-base: 16px;
  --font-size-large: 2em;
  --font-size-small: 0.8em;

  /* Spacing */
  --spacing-xs: 5px;
  --spacing-sm: 10px;
  --spacing-md: 20px;
  --spacing-lg: 30px;

  /* Animations */
  --animation-duration: 0.3s;
  --animation-timing: ease-in-out;

  /* Chart Colors */
  --chart-line-color: #00ff00;
  --chart-background: rgba(0, 255, 0, 0.1);
  --chart-grid-color: rgba(255, 255, 255, 0.1);
  --chart-text-color: #ffffff;
}
```

## Theme Presets

### Dark Carbon Fiber Theme (Default)

```css
.race-telemetry-dark {
  --primary-color: #ff0000;
  --secondary-color: #00ff00;
  --background-primary: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  --background-secondary: rgba(0, 0, 0, 0.5);
  --text-primary: #ffffff;
  --border-color: #ff0000;
  --font-family: 'Orbitron', monospace;
}
```

### Light Neon Theme

```css
.race-telemetry-light {
  --primary-color: #0066cc;
  --secondary-color: #ff1493;
  --background-primary: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
  --background-secondary: rgba(255, 255, 255, 0.9);
  --text-primary: #000000;
  --border-color: #0066cc;
  --font-family: 'Audiowide', cursive;
}
```

### Cyberpunk Theme

```css
.race-telemetry-cyberpunk {
  --primary-color: #ff0080;
  --secondary-color: #00ffff;
  --accent-color: #ffff00;
  --background-primary: linear-gradient(135deg, #0a0a0a 0%, #1a0033 100%);
  --background-secondary: rgba(255, 0, 128, 0.1);
  --text-primary: #ffffff;
  --border-color: #ff0080;
  --shadow-color: rgba(255, 0, 128, 0.5);
  --font-family: 'Courier New', monospace;
}
```

### Minimalist Theme

```css
.race-telemetry-minimal {
  --primary-color: #333333;
  --secondary-color: #666666;
  --background-primary: #ffffff;
  --background-secondary: #f5f5f5;
  --text-primary: #000000;
  --border-color: #dddddd;
  --border-radius: 5px;
  --shadow-blur: 5px;
  --font-family: 'Roboto', sans-serif;
}
```

## Dynamic Theme Switching

### JavaScript Theme Switcher

```javascript
class ThemeManager {
  constructor() {
    this.themes = {
      dark: {
        '--primary-color': '#ff0000',
        '--secondary-color': '#00ff00',
        '--background-primary': 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        '--background-secondary': 'rgba(0, 0, 0, 0.5)',
        '--text-primary': '#ffffff',
        '--border-color': '#ff0000'
      },
      light: {
        '--primary-color': '#0066cc',
        '--secondary-color': '#ff1493',
        '--background-primary': 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)',
        '--background-secondary': 'rgba(255, 255, 255, 0.9)',
        '--text-primary': '#000000',
        '--border-color': '#0066cc'
      },
      cyberpunk: {
        '--primary-color': '#ff0080',
        '--secondary-color': '#00ffff',
        '--background-primary': 'linear-gradient(135deg, #0a0a0a 0%, #1a0033 100%)',
        '--background-secondary': 'rgba(255, 0, 128, 0.1)',
        '--text-primary': '#ffffff',
        '--border-color': '#ff0080'
      }
    };
  }

  applyTheme(themeName) {
    const engine = document.querySelector('race-telemetry-engine');
    const theme = this.themes[themeName];

    if (engine && theme) {
      Object.entries(theme).forEach(([property, value]) => {
        engine.style.setProperty(property, value);
      });

      engine.setAttribute('theme', themeName);
      localStorage.setItem('raceTelemetryTheme', themeName);
    }
  }

  loadSavedTheme() {
    const savedTheme = localStorage.getItem('raceTelemetryTheme') || 'dark';
    this.applyTheme(savedTheme);
  }
}

// Usage
const themeManager = new ThemeManager();
themeManager.loadSavedTheme();

// Theme switcher buttons
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    themeManager.applyTheme(btn.dataset.theme);
  });
});
```

### CSS-Only Theme Switching

```html
<div class="theme-switcher">
  <button class="theme-btn" data-theme="dark">Dark</button>
  <button class="theme-btn" data-theme="light">Light</button>
  <button class="theme-btn" data-theme="cyberpunk">Cyberpunk</button>
</div>

<race-telemetry-engine class="theme-dark" theme="dark">
</race-telemetry-engine>
```

```css
/* Base theme variables */
race-telemetry-engine {
  --primary-color: #ff0000;
  --secondary-color: #00ff00;
  --background-primary: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  --background-secondary: rgba(0, 0, 0, 0.5);
  --text-primary: #ffffff;
  --border-color: #ff0000;
}

/* Light theme override */
race-telemetry-engine.theme-light {
  --primary-color: #0066cc;
  --secondary-color: #ff1493;
  --background-primary: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
  --background-secondary: rgba(255, 255, 255, 0.9);
  --text-primary: #000000;
  --border-color: #0066cc;
}

/* Cyberpunk theme override */
race-telemetry-engine.theme-cyberpunk {
  --primary-color: #ff0080;
  --secondary-color: #00ffff;
  --background-primary: linear-gradient(135deg, #0a0a0a 0%, #1a0033 100%);
  --background-secondary: rgba(255, 0, 128, 0.1);
  --text-primary: #ffffff;
  --border-color: #ff0080;
}
```

```javascript
// JavaScript to switch themes
function switchTheme(theme) {
  const engine = document.querySelector('race-telemetry-engine');
  engine.className = `theme-${theme}`;
  engine.setAttribute('theme', theme);
}
```

## Custom Fonts

### Google Fonts Integration

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Audiowide&family=Racing+Sans+One&display=swap" rel="stylesheet">
```

```css
race-telemetry-engine {
  --font-family: 'Orbitron', monospace;
  --font-family-heading: 'Racing Sans One', cursive;
  --font-family-mono: 'Courier New', monospace;
}
```

### Custom Font Loading

```javascript
// Load custom fonts
const fontLoader = {
  loadFonts() {
    const fonts = [
      new FontFace('CustomF1', 'url(/fonts/custom-f1.woff2)'),
      new FontFace('DigitalDisplay', 'url(/fonts/digital-display.woff2)')
    ];

    return Promise.all(
      fonts.map(font => font.load().then(loadedFont => {
        document.fonts.add(loadedFont);
        return loadedFont;
      }))
    );
  }
};

// Apply custom fonts after loading
fontLoader.loadFonts().then(() => {
  const engine = document.querySelector('race-telemetry-engine');
  engine.style.setProperty('--font-family', 'CustomF1, monospace');
  engine.style.setProperty('--font-family-heading', 'DigitalDisplay, cursive');
});
```

## Layout Customization

### Grid Layout Override

```css
race-telemetry-engine {
  /* Change from 2-column to 3-column layout */
}

race-telemetry-engine .dashboard {
  grid-template-columns: 1fr 2fr 1fr;
  gap: 15px;
}

race-telemetry-engine .speedometer {
  grid-column: 1;
}

race-telemetry-engine .leaderboard {
  grid-column: 2;
}

race-telemetry-engine .alerts {
  grid-column: 3;
  grid-row: span 2;
}

race-telemetry-engine .chart-container {
  grid-column: span 2;
}
```

### Compact Layout

```css
race-telemetry-engine.compact {
  --spacing-md: 10px;
  --spacing-lg: 15px;
  --font-size-base: 14px;
  --font-size-large: 1.5em;
}

race-telemetry-engine.compact .dashboard {
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

race-telemetry-engine.compact .speedometer,
race-telemetry-engine.compact .leaderboard {
  padding: 10px;
}

race-telemetry-engine.compact .alerts {
  grid-column: span 2;
}
```

### Fullscreen Layout

```css
race-telemetry-engine.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  --font-size-large: 3em;
  --spacing-lg: 50px;
}

race-telemetry-engine.fullscreen .dashboard {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  gap: 30px;
}

race-telemetry-engine.fullscreen .speedometer {
  grid-column: 1;
  grid-row: 1;
  font-size: 4em;
}

race-telemetry-engine.fullscreen .leaderboard {
  grid-column: 2;
  grid-row: 1 / span 2;
}

race-telemetry-engine.fullscreen .chart-container {
  grid-column: 1 / span 3;
  grid-row: 2;
}

race-telemetry-engine.fullscreen .alerts {
  grid-column: 3;
  grid-row: 3;
}
```

## Component Size Customization

### Responsive Sizing

```css
/* Mobile */
@media (max-width: 768px) {
  race-telemetry-engine {
    --font-size-base: 14px;
    --font-size-large: 1.8em;
    --spacing-md: 15px;
  }

  race-telemetry-engine .dashboard {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  race-telemetry-engine .chart-container,
  race-telemetry-engine .alerts {
    grid-column: span 1;
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  race-telemetry-engine {
    --font-size-base: 15px;
    --font-size-large: 2.2em;
  }

  race-telemetry-engine .dashboard {
    grid-template-columns: 1fr 1fr;
  }
}

/* Desktop */
@media (min-width: 1025px) {
  race-telemetry-engine {
    --font-size-base: 16px;
    --font-size-large: 2.5em;
    max-width: 1200px;
  }

  race-telemetry-engine .dashboard {
    grid-template-columns: 1fr 1fr;
  }
}
```

### Custom Dimensions

```css
/* Small widget */
race-telemetry-engine.size-small {
  width: 400px;
  height: 300px;
  --font-size-base: 12px;
  --font-size-large: 1.5em;
  --spacing-md: 8px;
}

/* Medium widget */
race-telemetry-engine.size-medium {
  width: 600px;
  height: 400px;
  --font-size-base: 14px;
  --font-size-large: 2em;
}

/* Large widget */
race-telemetry-engine.size-large {
  width: 100%;
  height: 600px;
  --font-size-base: 16px;
  --font-size-large: 2.5em;
}
```

## Animation Customization

### Custom Animations

```css
race-telemetry-engine {
  --animation-pulse: pulse 1s infinite;
  --animation-fade-in: fadeIn 0.5s ease-in;
  --animation-slide-up: slideUp 0.3s ease-out;
}

@keyframes customPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Apply custom animations */
race-telemetry-engine.custom-animations .live-indicator {
  animation: customPulse 1s infinite;
}

race-telemetry-engine.custom-animations .alert {
  animation: var(--animation-slide-up);
}
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  race-telemetry-engine {
    --animation-duration: 0s;
  }

  race-telemetry-engine .live-indicator,
  race-telemetry-engine .alert {
    animation: none;
  }
}
```

## Chart Customization

### Chart.js Theme Integration

```javascript
// Custom chart theme
const chartThemes = {
  dark: {
    color: '#ffffff',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderColor: '#00ff00',
    gridColor: 'rgba(255, 255, 255, 0.1)'
  },
  light: {
    color: '#000000',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    borderColor: '#0066cc',
    gridColor: 'rgba(0, 0, 0, 0.1)'
  },
  cyberpunk: {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    borderColor: '#ff0080',
    gridColor: 'rgba(255, 0, 128, 0.2)'
  }
};

// Apply chart theme
function applyChartTheme(themeName) {
  const theme = chartThemes[themeName];
  // This would be called from within the component
  // when updating the chart configuration
}
```

### Chart Size and Responsiveness

```css
race-telemetry-engine .chart-container canvas {
  max-width: 100%;
  height: auto;
}

/* Custom chart aspect ratio */
race-telemetry-engine.aspect-16-9 .chart-container canvas {
  aspect-ratio: 16 / 9;
}

race-telemetry-engine.aspect-4-3 .chart-container canvas {
  aspect-ratio: 4 / 3;
}

race-telemetry-engine.aspect-square .chart-container canvas {
  aspect-ratio: 1 / 1;
}
```

## Icon and Asset Customization

### Custom Icons

```css
race-telemetry-engine {
  --icon-live: url('data:image/svg+xml,<svg>...</svg>');
  --icon-warning: url('data:image/svg+xml,<svg>...</svg>');
  --icon-verified: url('data:image/svg+xml,<svg>...</svg>');
}

/* Apply custom icons */
race-telemetry-engine .live-indicator::before {
  content: '';
  background-image: var(--icon-live);
  /* Additional styling */
}
```

### Custom Background Images

```css
race-telemetry-engine.custom-bg {
  background-image:
    var(--background-primary),
    url('/images/carbon-fiber-texture.jpg');
  background-blend-mode: multiply;
}

race-telemetry-engine.race-track-bg {
  background-image:
    var(--background-primary),
    url('/images/f1-track-overlay.png');
  background-size: cover;
  background-position: center;
}
```

## Advanced Customization

### CSS-in-JS Integration

```javascript
// For React/Styled Components integration
const StyledTelemetryEngine = styled.race-telemetry-engine`
  --primary-color: ${props => props.theme.primaryColor};
  --secondary-color: ${props => props.theme.secondaryColor};
  --background-primary: ${props => props.theme.backgroundGradient};
  --text-primary: ${props => props.theme.textColor};
  --border-color: ${props => props.theme.borderColor};
  --font-family: ${props => props.theme.fontFamily};

  border-radius: ${props => props.theme.borderRadius};
  box-shadow: ${props => props.theme.shadow};
`;
```

### Runtime Style Injection

```javascript
class StyleInjector {
  static injectStyles(engine, styles) {
    const styleId = 'race-telemetry-custom-styles';
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const cssRules = Object.entries(styles)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join('\n');

    styleElement.textContent = `
      race-telemetry-engine {
${cssRules}
      }
    `;
  }
}

// Usage
const customStyles = {
  '--primary-color': '#ff6b35',
  '--secondary-color': '#f7931e',
  '--background-primary': 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
  '--font-family': '"Roboto Condensed", sans-serif'
};

StyleInjector.injectStyles(engine, customStyles);
```

### Theme Builder Tool

```html
<div class="theme-builder">
  <div class="color-picker">
    <label>Primary Color: <input type="color" id="primaryColor" value="#ff0000"></label>
    <label>Secondary Color: <input type="color" id="secondaryColor" value="#00ff00"></label>
    <label>Background: <input type="color" id="backgroundColor" value="#1a1a1a"></label>
  </div>
  <button id="applyTheme">Apply Custom Theme</button>
  <button id="exportTheme">Export Theme CSS</button>
</div>
```

```javascript
document.getElementById('applyTheme').addEventListener('click', () => {
  const primary = document.getElementById('primaryColor').value;
  const secondary = document.getElementById('secondaryColor').value;
  const background = document.getElementById('backgroundColor').value;

  const engine = document.querySelector('race-telemetry-engine');
  engine.style.setProperty('--primary-color', primary);
  engine.style.setProperty('--secondary-color', secondary);
  engine.style.setProperty('--background-primary', `linear-gradient(135deg, ${background} 0%, ${adjustBrightness(background, -20)} 100%)`);
});

document.getElementById('exportTheme').addEventListener('click', () => {
  const primary = document.getElementById('primaryColor').value;
  const secondary = document.getElementById('secondaryColor').value;
  const background = document.getElementById('backgroundColor').value;

  const css = `
race-telemetry-engine {
  --primary-color: ${primary};
  --secondary-color: ${secondary};
  --background-primary: linear-gradient(135deg, ${background} 0%, ${adjustBrightness(background, -20)} 100%);
}
  `;

  console.log('Custom Theme CSS:', css);
  // Could also download as file
});

function adjustBrightness(hex, percent) {
  // Color manipulation utility
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}
```

This comprehensive theming and customization guide provides all the tools needed to make the Race Telemetry Engine fit seamlessly into any F1 dashboard design. The component's CSS custom properties architecture makes it highly flexible and easy to customize without modifying the core component code.