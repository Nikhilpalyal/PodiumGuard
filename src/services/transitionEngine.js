class TransitionEngine {
  constructor() {
    this.transitions = new Map();
    this.isEnabled = true;
    this.defaultDuration = 300;
    this.defaultEasing = 'ease-out';

    // CSS transition presets
    this.presets = {
      fade: {
        properties: ['opacity'],
        duration: 300,
        easing: 'ease-out'
      },
      slide: {
        properties: ['transform'],
        duration: 400,
        easing: 'ease-out'
      },
      scale: {
        properties: ['transform'],
        duration: 200,
        easing: 'ease-out'
      },
      color: {
        properties: ['color', 'background-color', 'border-color'],
        duration: 200,
        easing: 'ease-out'
      },
      height: {
        properties: ['height', 'max-height'],
        duration: 300,
        easing: 'ease-out'
      },
      width: {
        properties: ['width', 'max-width'],
        duration: 300,
        easing: 'ease-out'
      },
      all: {
        properties: ['all'],
        duration: 300,
        easing: 'ease-out'
      }
    };
  }

  // Enable/disable transitions globally
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Apply transition to element
  applyTransition(element, properties = 'all', duration = null, easing = null) {
    if (!element || !this.isEnabled) return;

    const transitionProps = Array.isArray(properties) ? properties : [properties];
    const transitionValue = transitionProps
      .map(prop => `${prop} ${duration || this.defaultDuration}ms ${easing || this.defaultEasing}`)
      .join(', ');

    element.style.transition = transitionValue;
  }

  // Remove transition from element
  removeTransition(element) {
    if (!element) return;
    element.style.transition = '';
  }

  // Apply preset transition
  applyPreset(element, presetName, customDuration = null, customEasing = null) {
    if (!element || !this.presets[presetName]) return;

    const preset = this.presets[presetName];
    const duration = customDuration || preset.duration;
    const easing = customEasing || preset.easing;

    this.applyTransition(element, preset.properties, duration, easing);
  }

  // Fade in element
  fadeIn(element, duration = 300) {
    if (!element) return;

    element.style.opacity = '0';
    element.style.display = '';

    this.applyTransition(element, 'opacity', duration);

    // Force reflow
    element.offsetHeight;

    element.style.opacity = '1';

    return new Promise(resolve => {
      setTimeout(() => {
        this.removeTransition(element);
        resolve();
      }, duration);
    });
  }

  // Fade out element
  fadeOut(element, duration = 300) {
    if (!element) return;

    this.applyTransition(element, 'opacity', duration);
    element.style.opacity = '0';

    return new Promise(resolve => {
      setTimeout(() => {
        element.style.display = 'none';
        this.removeTransition(element);
        resolve();
      }, duration);
    });
  }

  // Slide in element
  slideIn(element, direction = 'up', distance = 50, duration = 400) {
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
    element.style.display = '';

    this.applyTransition(element, ['transform', 'opacity'], duration);

    // Force reflow
    element.offsetHeight;

    element.style.transform = '';
    element.style.opacity = '1';

    return new Promise(resolve => {
      setTimeout(() => {
        this.removeTransition(element);
        resolve();
      }, duration);
    });
  }

  // Slide out element
  slideOut(element, direction = 'down', distance = 50, duration = 400) {
    if (!element) return;

    this.applyTransition(element, ['transform', 'opacity'], duration);

    let endTransform = '';
    switch (direction) {
      case 'up': endTransform = `translateY(-${distance}px)`; break;
      case 'down': endTransform = `translateY(${distance}px)`; break;
      case 'left': endTransform = `translateX(-${distance}px)`; break;
      case 'right': endTransform = `translateX(${distance}px)`; break;
    }

    element.style.transform = endTransform;
    element.style.opacity = '0';

    return new Promise(resolve => {
      setTimeout(() => {
        element.style.display = 'none';
        element.style.transform = '';
        this.removeTransition(element);
        resolve();
      }, duration);
    });
  }

  // Scale in element
  scaleIn(element, startScale = 0.8, duration = 200) {
    if (!element) return;

    element.style.transform = `scale(${startScale})`;
    element.style.opacity = '0';
    element.style.display = '';

    this.applyTransition(element, ['transform', 'opacity'], duration);

    // Force reflow
    element.offsetHeight;

    element.style.transform = 'scale(1)';
    element.style.opacity = '1';

    return new Promise(resolve => {
      setTimeout(() => {
        this.removeTransition(element);
        resolve();
      }, duration);
    });
  }

  // Scale out element
  scaleOut(element, endScale = 0.8, duration = 200) {
    if (!element) return;

    this.applyTransition(element, ['transform', 'opacity'], duration);
    element.style.transform = `scale(${endScale})`;
    element.style.opacity = '0';

    return new Promise(resolve => {
      setTimeout(() => {
        element.style.display = 'none';
        element.style.transform = '';
        this.removeTransition(element);
        resolve();
      }, duration);
    });
  }

  // Expand/collapse element
  expand(element, duration = 300) {
    if (!element) return;

    const scrollHeight = element.scrollHeight;
    element.style.height = '0px';
    element.style.overflow = 'hidden';
    element.style.display = '';

    this.applyTransition(element, 'height', duration);

    // Force reflow
    element.offsetHeight;

    element.style.height = scrollHeight + 'px';

    return new Promise(resolve => {
      setTimeout(() => {
        element.style.height = '';
        element.style.overflow = '';
        this.removeTransition(element);
        resolve();
      }, duration);
    });
  }

  // Collapse element
  collapse(element, duration = 300) {
    if (!element) return;

    const scrollHeight = element.scrollHeight;
    element.style.height = scrollHeight + 'px';
    element.style.overflow = 'hidden';

    this.applyTransition(element, 'height', duration);

    // Force reflow
    element.offsetHeight;

    element.style.height = '0px';

    return new Promise(resolve => {
      setTimeout(() => {
        element.style.display = 'none';
        element.style.height = '';
        element.style.overflow = '';
        this.removeTransition(element);
        resolve();
      }, duration);
    });
  }

  // Morph between states
  morph(element, fromState, toState, duration = 300) {
    if (!element) return;

    // Apply from state
    Object.assign(element.style, fromState);

    this.applyTransition(element, Object.keys(toState), duration);

    // Force reflow
    element.offsetHeight;

    // Apply to state
    Object.assign(element.style, toState);

    return new Promise(resolve => {
      setTimeout(() => {
        this.removeTransition(element);
        resolve();
      }, duration);
    });
  }

  // Stagger transitions for multiple elements
  stagger(elements, transitionFunction, staggerDelay = 50) {
    const promises = [];

    elements.forEach((element, index) => {
      const delay = index * staggerDelay;
      const promise = new Promise(resolve => {
        setTimeout(() => {
          transitionFunction(element).then(resolve);
        }, delay);
      });
      promises.push(promise);
    });

    return Promise.all(promises);
  }

  // Chain transitions
  chain(element, transitions) {
    let promise = Promise.resolve();

    transitions.forEach(transition => {
      promise = promise.then(() => {
        const [functionName, ...args] = transition;
        return this[functionName](element, ...args);
      });
    });

    return promise;
  }

  // Race-specific transitions
  animateLeaderboardUpdate(leaderboardElement, newOrder, duration = 500) {
    if (!leaderboardElement) return;

    const items = Array.from(leaderboardElement.children);
    const itemHeight = items[0]?.offsetHeight || 60;

    // Calculate new positions
    const animations = items.map((item, index) => {
      const newIndex = newOrder[index];
      const newY = newIndex * itemHeight;

      return this.morph(
        item,
        { transform: item.style.transform || 'translateY(0px)' },
        { transform: `translateY(${newY}px)` },
        duration
      );
    });

    return Promise.all(animations);
  }

  animateAlertAppearance(alertElement, type = 'slide', duration = 400) {
    if (!alertElement) return;

    switch (type) {
      case 'slide':
        return this.slideIn(alertElement, 'right', 50, duration);
      case 'fade':
        return this.fadeIn(alertElement, duration);
      case 'scale':
        return this.scaleIn(alertElement, 0.9, duration);
      default:
        return this.fadeIn(alertElement, duration);
    }
  }

  animateCarHighlight(carElement, duration = 1000) {
    if (!carElement) return;

    // Pulse animation using transitions
    const originalTransform = carElement.style.transform || '';

    this.applyTransition(carElement, 'transform', duration / 4);

    // Scale up
    carElement.style.transform = `${originalTransform} scale(1.2)`;

    return new Promise(resolve => {
      setTimeout(() => {
        // Scale back to normal
        carElement.style.transform = originalTransform;

        setTimeout(() => {
          this.removeTransition(carElement);
          resolve();
        }, duration / 4);
      }, duration / 4);
    });
  }

  animateValueChange(valueElement, oldValue, newValue, duration = 500) {
    if (!valueElement) return;

    // Simple color flash for value changes
    const originalColor = valueElement.style.color || '';
    const changeColor = newValue > oldValue ? '#4caf50' : '#f44336';

    this.applyTransition(valueElement, 'color', duration);
    valueElement.style.color = changeColor;

    return new Promise(resolve => {
      setTimeout(() => {
        valueElement.style.color = originalColor;
        setTimeout(() => {
          this.removeTransition(valueElement);
          resolve();
        }, duration);
      }, duration);
    });
  }

  animateStatusChange(statusElement, oldStatus, newStatus, duration = 300) {
    if (!statusElement) return;

    // Fade out old status, fade in new status
    return this.morph(
      statusElement,
      { opacity: '1' },
      { opacity: '0' },
      duration / 2
    ).then(() => {
      // Update text/color
      statusElement.textContent = newStatus;
      // Status color would be set by color coding engine

      return this.morph(
        statusElement,
        { opacity: '0' },
        { opacity: '1' },
        duration / 2
      );
    });
  }

  // Page transitions
  pageTransition(fromElement, toElement, type = 'fade', duration = 300) {
    const transitions = {
      fade: () => Promise.all([
        this.fadeOut(fromElement, duration / 2),
        this.fadeIn(toElement, duration / 2)
      ]),
      slide: () => Promise.all([
        this.slideOut(fromElement, 'left', 50, duration / 2),
        this.slideIn(toElement, 'right', 50, duration / 2)
      ]),
      scale: () => Promise.all([
        this.scaleOut(fromElement, 0.9, duration / 2),
        this.scaleIn(toElement, 1.1, duration / 2)
      ])
    };

    return transitions[type] ? transitions[type]() : transitions.fade();
  }

  // Loading state transitions
  showLoading(element, type = 'spinner') {
    if (!element) return;

    element.classList.add('loading', `loading-${type}`);
    return this.fadeIn(element, 200);
  }

  hideLoading(element) {
    if (!element) return;

    return this.fadeOut(element, 200).then(() => {
      element.classList.remove('loading', 'loading-spinner', 'loading-pulse', 'loading-bars');
    });
  }

  // Error state transitions
  showError(element, message, duration = 3000) {
    if (!element) return;

    element.textContent = message;
    element.classList.add('error-state');

    return this.slideIn(element, 'down', 30, duration / 3).then(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          this.slideOut(element, 'up', 30, duration / 3).then(() => {
            element.classList.remove('error-state');
            resolve();
          });
        }, duration / 3);
      });
    });
  }

  // Success state transitions
  showSuccess(element, message, duration = 2000) {
    if (!element) return;

    element.textContent = message;
    element.classList.add('success-state');

    return this.scaleIn(element, 0.8, duration / 4).then(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          this.fadeOut(element, duration / 4).then(() => {
            element.classList.remove('success-state');
            resolve();
          });
        }, duration / 2);
      });
    });
  }

  // Get transition statistics
  getStats() {
    return {
      isEnabled: this.isEnabled,
      defaultDuration: this.defaultDuration,
      defaultEasing: this.defaultEasing,
      presets: Object.keys(this.presets)
    };
  }

  // Configure transition settings
  configure(settings) {
    if (settings.enabled !== undefined) this.isEnabled = settings.enabled;
    if (settings.defaultDuration) this.defaultDuration = settings.defaultDuration;
    if (settings.defaultEasing) this.defaultEasing = settings.defaultEasing;
  }

  // Add custom preset
  addPreset(name, config) {
    this.presets[name] = config;
  }

  // Remove preset
  removePreset(name) {
    delete this.presets[name];
  }

  // Clean up
  destroy() {
    this.transitions.clear();
  }
}

// Create singleton instance
const transitionEngine = new TransitionEngine();

export default transitionEngine;