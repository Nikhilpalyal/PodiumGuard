class AnimationEngine {
  constructor() {
    this.animations = new Map();
    this.tweens = new Map();
    this.isRunning = false;
    this.frameRate = 60;
    this.frameInterval = 1000 / this.frameRate;
    this.lastFrameTime = 0;
    this.animationId = null;

    // Easing functions
    this.easings = {
      linear: t => t,
      easeInQuad: t => t * t,
      easeOutQuad: t => t * (2 - t),
      easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      easeInCubic: t => t * t * t,
      easeOutCubic: t => (--t) * t * t + 1,
      easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
      easeInQuart: t => t * t * t * t,
      easeOutQuart: t => 1 - (--t) * t * t * t,
      easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
      easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
      easeOutSine: t => Math.sin((t * Math.PI) / 2),
      easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
      easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
      easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
      easeInOutExpo: t => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
        return (2 - Math.pow(2, -20 * t + 10)) / 2;
      }
    };
  }

  // Start animation loop
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  // Stop animation loop
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Animation loop
  animate = (currentTime = 0) => {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime >= this.frameInterval) {
      this.updateAnimations(deltaTime);
      this.lastFrameTime = currentTime;
    }

    this.animationId = requestAnimationFrame(this.animate);
  };

  // Update all active animations
  updateAnimations(deltaTime) {
    // Update tweens
    this.tweens.forEach((tween, id) => {
      tween.elapsed += deltaTime;

      if (tween.elapsed >= tween.duration) {
        // Animation complete
        tween.onUpdate(tween.endValue);
        tween.onComplete && tween.onComplete();

        this.tweens.delete(id);
      } else {
        // Animation in progress
        const progress = tween.elapsed / tween.duration;
        const easedProgress = tween.easing(progress);

        let currentValue;
        if (Array.isArray(tween.startValue)) {
          // Array interpolation
          currentValue = tween.startValue.map((start, index) =>
            start + (tween.endValue[index] - start) * easedProgress
          );
        } else if (typeof tween.startValue === 'object') {
          // Object interpolation
          currentValue = {};
          Object.keys(tween.startValue).forEach(key => {
            currentValue[key] = tween.startValue[key] +
              (tween.endValue[key] - tween.startValue[key]) * easedProgress;
          });
        } else {
          // Number interpolation
          currentValue = tween.startValue +
            (tween.endValue - tween.startValue) * easedProgress;
        }

        tween.onUpdate(currentValue);
      }
    });

    // Update custom animations
    this.animations.forEach((animation, id) => {
      animation.elapsed += deltaTime;

      if (animation.elapsed >= animation.duration) {
        animation.onComplete && animation.onComplete();
        this.animations.delete(id);
      } else {
        const progress = animation.elapsed / animation.duration;
        animation.onUpdate(progress, animation.elapsed);
      }
    });
  }

  // Create a tween animation
  tween(options) {
    const {
      from: startValue,
      to: endValue,
      duration = 1000,
      easing = 'easeOutQuad',
      onUpdate,
      onComplete,
      id = Math.random().toString(36).substr(2, 9)
    } = options;

    const tween = {
      id,
      startValue,
      endValue,
      duration,
      easing: this.easings[easing] || this.easings.easeOutQuad,
      elapsed: 0,
      onUpdate,
      onComplete
    };

    this.tweens.set(id, tween);
    return id;
  }

  // Create a custom animation
  animateTo(options) {
    const {
      duration = 1000,
      onUpdate,
      onComplete,
      id = Math.random().toString(36).substr(2, 9)
    } = options;

    const animation = {
      id,
      duration,
      elapsed: 0,
      onUpdate,
      onComplete
    };

    this.animations.set(id, animation);
    return id;
  }

  // Stop specific animation
  stopAnimation(id) {
    this.tweens.delete(id);
    this.animations.delete(id);
  }

  // Stop all animations
  stopAll() {
    this.tweens.clear();
    this.animations.clear();
  }

  // Race-specific animations
  animateCarPosition(carElement, newPosition, duration = 500) {
    if (!carElement) return;

    const currentTransform = carElement.style.transform || '';
    const currentX = this.extractTranslateX(currentTransform) || 0;
    const currentY = this.extractTranslateY(currentTransform) || 0;

    return this.tween({
      from: { x: currentX, y: currentY },
      to: { x: newPosition.x, y: newPosition.y },
      duration,
      easing: 'easeOutQuad',
      onUpdate: (value) => {
        carElement.style.transform = `translate(${value.x}px, ${value.y}px)`;
      }
    });
  }

  animateLeaderboardPosition(itemElement, newIndex, duration = 300) {
    if (!itemElement) return;

    const itemHeight = itemElement.offsetHeight || 60;
    const newY = newIndex * itemHeight;

    return this.tween({
      from: { y: this.extractTranslateY(itemElement.style.transform) || 0 },
      to: { y: newY },
      duration,
      easing: 'easeOutQuad',
      onUpdate: (value) => {
        itemElement.style.transform = `translateY(${value.y}px)`;
      }
    });
  }

  animateValueChange(element, startValue, endValue, duration = 1000, formatter = (v) => v) {
    if (!element) return;

    return this.tween({
      from: startValue,
      to: endValue,
      duration,
      easing: 'easeOutQuad',
      onUpdate: (value) => {
        element.textContent = formatter(Math.round(value));
      }
    });
  }

  animateColorChange(element, startColor, endColor, duration = 500) {
    if (!element) return;

    // Convert colors to RGB
    const startRGB = this.hexToRgb(startColor) || { r: 0, g: 0, b: 0 };
    const endRGB = this.hexToRgb(endColor) || { r: 255, g: 255, b: 255 };

    return this.tween({
      from: [startRGB.r, startRGB.g, startRGB.b],
      to: [endRGB.r, endRGB.g, endRGB.b],
      duration,
      easing: 'easeOutQuad',
      onUpdate: (value) => {
        const [r, g, b] = value.map(Math.round);
        element.style.color = `rgb(${r}, ${g}, ${b})`;
      }
    });
  }

  animateOpacity(element, startOpacity, endOpacity, duration = 300) {
    if (!element) return;

    return this.tween({
      from: startOpacity,
      to: endOpacity,
      duration,
      easing: 'easeOutQuad',
      onUpdate: (value) => {
        element.style.opacity = value;
      }
    });
  }

  animateScale(element, startScale, endScale, duration = 300) {
    if (!element) return;

    return this.tween({
      from: startScale,
      to: endScale,
      duration,
      easing: 'easeOutQuad',
      onUpdate: (value) => {
        element.style.transform = `scale(${value})`;
      }
    });
  }

  // Pulse animation for alerts
  pulseAnimation(element, intensity = 1, duration = 1000) {
    if (!element) return;

    const originalTransform = element.style.transform || '';

    return this.animateTo({
      duration,
      onUpdate: (progress) => {
        const scale = 1 + Math.sin(progress * Math.PI * 2) * intensity * 0.1;
        element.style.transform = `${originalTransform} scale(${scale})`;
      },
      onComplete: () => {
        element.style.transform = originalTransform;
      }
    });
  }

  // Bounce animation
  bounceAnimation(element, height = 20, duration = 600) {
    if (!element) return;

    const originalTransform = element.style.transform || '';

    return this.animateTo({
      duration,
      onUpdate: (progress) => {
        const y = Math.sin(progress * Math.PI) * height;
        element.style.transform = `${originalTransform} translateY(${-y}px)`;
      },
      onComplete: () => {
        element.style.transform = originalTransform;
      }
    });
  }

  // Slide in animation
  slideIn(element, direction = 'up', distance = 50, duration = 500) {
    if (!element) return;

    let startTransform = '';
    switch (direction) {
      case 'up': startTransform = `translateY(${distance}px)`; break;
      case 'down': startTransform = `translateY(-${distance}px)`; break;
      case 'left': startTransform = `translateX(${distance}px)`; break;
      case 'right': startTransform = `translateX(-${distance}px)`; break;
    }

    element.style.transform = startTransform;
    element.style.opacity = '0';

    return this.tween({
      from: { opacity: 0, transform: startTransform },
      to: { opacity: 1, transform: '' },
      duration,
      easing: 'easeOutQuad',
      onUpdate: (value) => {
        element.style.opacity = value.opacity;
        element.style.transform = value.transform;
      }
    });
  }

  // Fade in animation
  fadeIn(element, duration = 300) {
    if (!element) return;

    element.style.opacity = '0';

    return this.tween({
      from: 0,
      to: 1,
      duration,
      easing: 'easeOutQuad',
      onUpdate: (value) => {
        element.style.opacity = value;
      }
    });
  }

  // Stagger animation for multiple elements
  staggerAnimation(elements, animationFunction, staggerDelay = 100) {
    const animations = [];

    elements.forEach((element, index) => {
      setTimeout(() => {
        const animationId = animationFunction(element);
        animations.push(animationId);
      }, index * staggerDelay);
    });

    return animations;
  }

  // Sequence animations
  sequence(animations, delayBetween = 0) {
    let currentDelay = 0;

    animations.forEach((animationConfig) => {
      setTimeout(() => {
        this.tween(animationConfig);
      }, currentDelay);

      currentDelay += animationConfig.duration + delayBetween;
    });
  }

  // Utility functions
  extractTranslateX(transform) {
    const match = transform.match(/translate\(([^,)]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  extractTranslateY(transform) {
    const match = transform.match(/translateY\(([^)]+)\)/);
    return match ? parseFloat(match[1]) : 0;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Get animation statistics
  getStats() {
    return {
      activeTweens: this.tweens.size,
      activeAnimations: this.animations.size,
      totalAnimations: this.tweens.size + this.animations.size,
      isRunning: this.isRunning,
      frameRate: this.frameRate
    };
  }

  // Set frame rate
  setFrameRate(fps) {
    this.frameRate = fps;
    this.frameInterval = 1000 / fps;
  }

  // Add custom easing function
  addEasing(name, easingFunction) {
    this.easings[name] = easingFunction;
  }

  // Clean up
  destroy() {
    this.stopAll();
    this.stop();
  }
}

// Create singleton instance
const animationEngine = new AnimationEngine();

export default animationEngine;