// openasvg.js - OpenASVG JavaScript Library v2025.7
// Copyright 2025 Halide Systems Ltd.

class OpenASVG {
  constructor(source, options = {}) {
    this.source = source;
    this.options = {
      autoplay: true,
      loop: false,
      fps: 60,
      ...options
    };
    
    this.state = {
      playing: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
      currentState: null
    };
    
    this.animations = [];
    this.timeline = null;
    this.svgContent = null;
    this.variables = new Map();
    this.states = new Map();
    this.triggers = [];
    this.targetCache = new Map();
    
    this._animationFrame = null;
    this._lastFrameTime = 0;
    this._startTime = 0;
    
    this.events = new EventTarget();
    
    if (typeof source === 'string') {
      if (source.startsWith('<')) {
        this.parseXML(source);
      } else {
        this.loadFromURL(source);
      }
    } else if (source instanceof Element) {
      this.parseElement(source);
    }
  }
  
  // Loading and Parsing
  async loadFromURL(url) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      this.parseXML(text);
    } catch (error) {
      this.emit('error', { error });
    }
  }
  
  parseXML(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    
    if (doc.querySelector('parsererror')) {
      this.emit('error', { error: new Error('XML parsing error') });
      return;
    }
    
    const asvgRoot = doc.querySelector('asvg');
    if (!asvgRoot) {
      this.emit('error', { error: new Error('No ASVG root element found') });
      return;
    }
    
    this.parseElement(asvgRoot);
  }
  
  parseElement(element) {
    // Parse root attributes
    this.options.width = parseInt(element.getAttribute('width')) || 800;
    this.options.height = parseInt(element.getAttribute('height')) || 600;
    this.options.duration = this.parseTime(element.getAttribute('duration') || '0s');
    this.options.fps = parseInt(element.getAttribute('fps') || '60');
    this.options.loop = element.getAttribute('loop') === 'true';
    this.options.autoplay = element.getAttribute('autoplay') !== 'false';
    
    // Parse variables
    const variablesEl = element.querySelector('variables');
    if (variablesEl) {
      variablesEl.querySelectorAll('var').forEach(varEl => {
        const name = varEl.getAttribute('name');
        const value = varEl.getAttribute('value');
        if (name && value) {
          this.variables.set(name, this.evaluateExpression(value));
        }
      });
    }
    
    // Parse states
    const statesEl = element.querySelector('states');
    if (statesEl) {
      statesEl.querySelectorAll('state').forEach(stateEl => {
        const id = stateEl.getAttribute('id');
        if (id) {
          this.states.set(id, stateEl);
        }
      });
    }
    
    // Parse triggers
    const triggersEl = element.querySelector('triggers');
    if (triggersEl) {
      triggersEl.querySelectorAll('trigger').forEach(triggerEl => {
        this.triggers.push({
          event: triggerEl.getAttribute('event'),
          target: triggerEl.getAttribute('target'),
          state: triggerEl.getAttribute('state')
        });
      });
    }
    
    // Parse timeline
    const timelineEl = element.querySelector('timeline');
    if (timelineEl) {
      this.timeline = this.parseTimeline(timelineEl);
    }
    
    // Extract SVG content
    const svgEl = element.querySelector('svg');
    if (svgEl) {
      this.svgContent = svgEl.cloneNode(true);
      // Remove namespace prefix if present
      this.svgContent.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    
    // Calculate total duration
    this.state.duration = this.calculateDuration();
    
    // Setup triggers
    this.setupTriggers();
    
    // Emit ready event
    this.emit('ready');
    
    // Autoplay if enabled
    if (this.options.autoplay) {
      this.play();
    }
  }
  
  parseTimeline(timelineEl) {
    const animations = [];
    
    for (const child of timelineEl.children) {
      const anim = this.parseAnimation(child, 0);
      if (anim) animations.push(anim);
    }
    
    return animations;
  }
  
  parseAnimation(el, parentStart = 0) {
    const type = el.tagName.toLowerCase();
    
    switch (type) {
      case 'animate':
        return this.parseAnimate(el, parentStart);
      case 'animate-transform':
        return this.parseAnimateTransform(el, parentStart);
      case 'animate-path':
        return this.parseAnimatePath(el, parentStart);
      case 'animate-color':
        return this.parseAnimateColor(el, parentStart);
      case 'morph':
        return this.parseMorph(el, parentStart);
      case 'sequence':
        return this.parseSequence(el, parentStart);
      case 'parallel':
        return this.parseParallel(el, parentStart);
      case 'animate-set':
        return this.parseAnimateSet(el, parentStart);
      default:
        return null;
    }
  }
  
  parseAnimate(el, parentStart = 0) {
    const anim = {
      type: 'animate',
      target: el.getAttribute('target'),
      attribute: el.getAttribute('attribute'),
      from: el.getAttribute('from'),
      to: el.getAttribute('to'),
      by: el.getAttribute('by'),
      start: parentStart + this.parseTime(el.getAttribute('start') || '0s'),
      duration: this.parseTime(el.getAttribute('duration') || '0s'),
      easing: el.getAttribute('easing') || 'linear',
      repeat: el.getAttribute('repeat') || '1',
      reverse: el.getAttribute('reverse') === 'true',
      fill: el.getAttribute('fill') || 'none',
      id: el.getAttribute('id')
    };
    
    // Handle repeat
    if (anim.repeat === 'infinite') {
      anim.repeat = Infinity;
    } else {
      anim.repeat = parseInt(anim.repeat);
    }
    
    return anim;
  }
  
  parseAnimateTransform(el, parentStart = 0) {
    return {
      type: 'animate-transform',
      target: el.getAttribute('target'),
      transformType: el.getAttribute('type'),
      from: el.getAttribute('from'),
      to: el.getAttribute('to'),
      start: parentStart + this.parseTime(el.getAttribute('start') || '0s'),
      duration: this.parseTime(el.getAttribute('duration') || '0s'),
      easing: el.getAttribute('easing') || 'linear',
      repeat: el.getAttribute('repeat') || '1',
      reverse: el.getAttribute('reverse') === 'true',
      additive: el.getAttribute('additive') || 'replace',
      id: el.getAttribute('id')
    };
  }
  
  parseAnimatePath(el, parentStart = 0) {
    return {
      type: 'animate-path',
      target: el.getAttribute('target'),
      path: el.getAttribute('path'),
      start: parentStart + this.parseTime(el.getAttribute('start') || '0s'),
      duration: this.parseTime(el.getAttribute('duration') || '0s'),
      easing: el.getAttribute('easing') || 'linear',
      rotate: el.getAttribute('rotate') || 'none',
      anchor: el.getAttribute('anchor') || 'center',
      id: el.getAttribute('id')
    };
  }
  
  parseAnimateColor(el, parentStart = 0) {
    return {
      type: 'animate-color',
      target: el.getAttribute('target'),
      attribute: el.getAttribute('attribute'),
      from: el.getAttribute('from'),
      to: el.getAttribute('to'),
      start: parentStart + this.parseTime(el.getAttribute('start') || '0s'),
      duration: this.parseTime(el.getAttribute('duration') || '0s'),
      easing: el.getAttribute('easing') || 'linear',
      colorSpace: el.getAttribute('color-space') || 'srgb',
      id: el.getAttribute('id')
    };
  }
  
  parseMorph(el, parentStart = 0) {
    return {
      type: 'morph',
      target: el.getAttribute('target'),
      to: el.getAttribute('to'),
      start: parentStart + this.parseTime(el.getAttribute('start') || '0s'),
      duration: this.parseTime(el.getAttribute('duration') || '0s'),
      easing: el.getAttribute('easing') || 'linear',
      preserveCorners: el.getAttribute('preserve-corners') === 'true',
      id: el.getAttribute('id')
    };
  }
  
  parseSequence(el, parentStart = 0) {
    const animations = [];
    let currentStart = parentStart;
    
    for (const child of el.children) {
      const anim = this.parseAnimation(child, currentStart);
      if (anim) {
        animations.push(anim);
        currentStart += anim.duration;
      }
    }
    
    return {
      type: 'sequence',
      animations,
      repeat: el.getAttribute('repeat') || '1',
      id: el.getAttribute('id'),
      duration: currentStart - parentStart
    };
  }
  
  parseParallel(el, parentStart = 0) {
    const animations = [];
    let maxDuration = 0;
    
    for (const child of el.children) {
      const anim = this.parseAnimation(child, parentStart);
      if (anim) {
        animations.push(anim);
        maxDuration = Math.max(maxDuration, anim.duration);
      }
    }
    
    return {
      type: 'parallel',
      animations,
      id: el.getAttribute('id'),
      duration: maxDuration
    };
  }
  
  parseAnimateSet(el, parentStart = 0) {
    const animations = [];
    const target = el.getAttribute('target');
    let maxDuration = 0;
    
    for (const child of el.children) {
      const anim = this.parseAnimation(child, parentStart);
      if (anim) {
        anim.target = target; // Override target
        animations.push(anim);
        maxDuration = Math.max(maxDuration, anim.duration);
      }
    }
    
    return {
      type: 'animate-set',
      animations,
      target,
      id: el.getAttribute('id'),
      duration: maxDuration
    };
  }
  
  // Time parsing
  parseTime(timeStr) {
    if (!timeStr) return 0;
    
    const match = timeStr.match(/^([\d.]+)(ms|s|m)?$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2] || 's';
    
    switch (unit) {
      case 'ms': return value / 1000;
      case 's': return value;
      case 'm': return value * 60;
      default: return value;
    }
  }
  
  // Expression evaluation
  evaluateExpression(expr, context = {}) {
    // Simple expression evaluation
    // In production, use a proper expression parser
    try {
      const vars = { ...Object.fromEntries(this.variables), ...context };
      const func = new Function(...Object.keys(vars), `return ${expr}`);
      return func(...Object.values(vars));
    } catch (e) {
      return expr;
    }
  }
  
  // Animation calculation
  calculateDuration() {
    let maxEnd = 0;
    
    const calcAnimDuration = (anim) => {
      if (anim.type === 'sequence' || anim.type === 'parallel' || anim.type === 'animate-set') {
        let seqDuration = 0;
        anim.animations.forEach(child => {
          const childDur = calcAnimDuration(child);
          if (anim.type === 'sequence') {
            seqDuration += childDur;
          } else {
            seqDuration = Math.max(seqDuration, childDur);
          }
        });
        return seqDuration;
      }
      
      const iterations = (anim.repeat === Infinity || anim.repeat === 'infinite') ? 1 : parseInt(anim.repeat) || 1;
      const animDuration = anim.duration * iterations;
      maxEnd = Math.max(maxEnd, anim.start + animDuration);
      return animDuration;
    };
    
    if (this.timeline) {
      this.timeline.forEach(anim => calcAnimDuration(anim));
    }
    
    return this.options.duration || maxEnd;
  }
  
  // Playback control
  play() {
    if (this.state.playing) return;
    
    this.state.playing = true;
    this._startTime = performance.now() - (this.state.currentTime * 1000);
    this._lastFrameTime = performance.now();
    this.emit('play');
    this.animate();
  }
  
  pause() {
    if (!this.state.playing) return;
    
    this.state.playing = false;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    this.emit('pause');
  }
  
  stop() {
    this.pause();
    this.state.currentTime = 0;
    this.updateAnimations(0);
    this.emit('stop');
  }
  
  seek(time) {
    this.state.currentTime = Math.max(0, Math.min(time, this.state.duration));
    this._startTime = performance.now() - (this.state.currentTime * 1000);
    this.updateAnimations(this.state.currentTime);
    this.emit('seek', { time: this.state.currentTime });
  }
  
  // Animation loop
  animate() {
    if (!this.state.playing) return;
    
    const now = performance.now();
    const elapsed = (now - this._startTime) / 1000 * this.state.playbackRate;
    
    this.state.currentTime = elapsed;
    
    if (this.state.currentTime >= this.state.duration) {
      if (this.options.loop) {
        this.state.currentTime = 0;
        this._startTime = now;
      } else {
        this.state.currentTime = this.state.duration;
        this.pause();
        this.emit('end');
        return;
      }
    }
    
    this.updateAnimations(this.state.currentTime);
    this.emit('update', { time: this.state.currentTime });
    
    this._animationFrame = requestAnimationFrame(() => this.animate());
  }
  
  // Update animations
  updateAnimations(time) {
    if (!this.timeline || !this.svgContent) return;
    
    const updateAnim = (anim, parentTime = 0) => {
      const localTime = time - parentTime;
      
      switch (anim.type) {
        case 'animate':
          this.updateAnimate(anim, localTime);
          break;
        case 'animate-transform':
          this.updateAnimateTransform(anim, localTime);
          break;
        case 'animate-path':
          this.updateAnimatePath(anim, localTime);
          break;
        case 'animate-color':
          this.updateAnimateColor(anim, localTime);
          break;
        case 'morph':
          this.updateMorph(anim, localTime);
          break;
        case 'sequence':
        case 'parallel':
        case 'animate-set':
          anim.animations.forEach(child => updateAnim(child, parentTime));
          break;
      }
    };
    
    this.timeline.forEach(anim => updateAnim(anim, 0));
  }
  
  updateAnimate(anim, time) {
    const targets = this.getTargets(anim.target);
    if (!targets.length) return;
    
    const progress = this.calculateProgress(anim, time);
    if (progress < 0 || progress > 1) return;
    
    const easedProgress = this.applyEasing(progress, anim.easing);
    
    targets.forEach(target => {
      const from = parseFloat(anim.from || target.getAttribute(anim.attribute) || 0);
      const to = parseFloat(anim.to || from);
      const value = from + (to - from) * easedProgress;
      
      target.setAttribute(anim.attribute, value);
    });
  }
  
  updateAnimateTransform(anim, time) {
    const targets = this.getTargets(anim.target);
    if (!targets.length) return;
    
    const progress = this.calculateProgress(anim, time);
    if (progress < 0 || progress > 1) return;
    
    const easedProgress = this.applyEasing(progress, anim.easing);
    
    targets.forEach(target => {
      const transform = this.interpolateTransform(
        anim.transformType,
        anim.from,
        anim.to,
        easedProgress
      );
      
      if (anim.additive === 'sum') {
        const existing = target.getAttribute('transform') || '';
        target.setAttribute('transform', existing + ' ' + transform);
      } else {
        target.setAttribute('transform', transform);
      }
    });
  }
  
  updateAnimatePath(anim, time) {
    const targets = this.getTargets(anim.target);
    if (!targets.length) return;
    
    const progress = this.calculateProgress(anim, time);
    if (progress < 0 || progress > 1) return;
    
    const easedProgress = this.applyEasing(progress, anim.easing);
    
    // Get path element or parse path data
    const pathEl = anim.path.startsWith('#') 
      ? this.svgContent.querySelector(anim.path)
      : null;
    
    const pathData = pathEl 
      ? pathEl.getAttribute('d')
      : anim.path;
    
    const point = this.getPointOnPath(pathData, easedProgress);
    
    targets.forEach(target => {
      let transform = `translate(${point.x}, ${point.y})`;
      
      if (anim.rotate === 'auto' || anim.rotate === 'auto-reverse') {
        const angle = point.angle + (anim.rotate === 'auto-reverse' ? 180 : 0);
        transform += ` rotate(${angle})`;
      }
      
      target.setAttribute('transform', transform);
    });
  }
  
  updateAnimateColor(anim, time) {
    const targets = this.getTargets(anim.target);
    if (!targets.length) return;
    
    const progress = this.calculateProgress(anim, time);
    if (progress < 0 || progress > 1) return;
    
    const easedProgress = this.applyEasing(progress, anim.easing);
    
    const color = this.interpolateColor(
      anim.from,
      anim.to,
      easedProgress,
      anim.colorSpace
    );
    
    targets.forEach(target => {
      target.setAttribute(anim.attribute, color);
    });
  }
  
  updateMorph(anim, time) {
    const targets = this.getTargets(anim.target);
    if (!targets.length) return;
    
    const progress = this.calculateProgress(anim, time);
    if (progress < 0 || progress > 1) return;
    
    const easedProgress = this.applyEasing(progress, anim.easing);
    
    const toEl = this.svgContent.querySelector(anim.to);
    if (!toEl) return;
    
    targets.forEach(target => {
      const fromPath = target.getAttribute('d');
      const toPath = toEl.getAttribute('d');
      
      if (fromPath && toPath) {
        const morphed = this.interpolatePath(fromPath, toPath, easedProgress);
        target.setAttribute('d', morphed);
      }
    });
  }
  
  // Helper methods
  calculateProgress(anim, time) {
    const relativeTime = time - anim.start;
    if (relativeTime < 0) return -1;
    
    const iterations = Math.floor(relativeTime / anim.duration);
    if (iterations >= anim.repeat) return 2; // Finished
    
    let progress = (relativeTime % anim.duration) / anim.duration;
    
    if (anim.reverse && iterations % 2 === 1) {
      progress = 1 - progress;
    }
    
    return progress;
  }
  
  getTargets(selector) {
    if (!selector || !this.svgContent) return [];
    
    // Cache targets for performance
    if (this.targetCache.has(selector)) {
      return this.targetCache.get(selector);
    }
    
    const targets = Array.from(this.svgContent.querySelectorAll(selector));
    this.targetCache.set(selector, targets);
    
    return targets;
  }
  
  applyEasing(t, easing) {
    // Built-in easing functions
    const easings = {
      linear: t => t,
      ease: t => this.cubicBezier(0.25, 0.1, 0.25, 1, t),
      'ease-in': t => this.cubicBezier(0.42, 0, 1, 1, t),
      'ease-out': t => this.cubicBezier(0, 0, 0.58, 1, t),
      'ease-in-out': t => this.cubicBezier(0.42, 0, 0.58, 1, t),
      bounce: t => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
      },
      elastic: t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 :
          Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      }
    };
    
    if (easings[easing]) {
      return easings[easing](t);
    }
    
    // Parse cubic-bezier
    const bezierMatch = easing.match(/cubic-bezier\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
    if (bezierMatch) {
      return this.cubicBezier(
        parseFloat(bezierMatch[1]),
        parseFloat(bezierMatch[2]),
        parseFloat(bezierMatch[3]),
        parseFloat(bezierMatch[4]),
        t
      );
    }
    
    return t; // Default to linear
  }
  
  cubicBezier(x1, y1, x2, y2, t) {
    // Simplified cubic bezier calculation
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    
    const sampleCurveX = t => ((ax * t + bx) * t + cx) * t;
    const sampleCurveY = t => ((ay * t + by) * t + cy) * t;
    
    // Newton-Raphson iteration
    let x = t;
    for (let i = 0; i < 4; i++) {
      const currentX = sampleCurveX(x) - t;
      if (Math.abs(currentX) < 0.001) break;
      
      const currentSlope = (3 * ax * x + 2 * bx) * x + cx;
      if (Math.abs(currentSlope) < 0.00001) break;
      
      x -= currentX / currentSlope;
    }
    
    return sampleCurveY(x);
  }
  
  interpolateTransform(type, from, to, progress) {
    const fromParts = from.split(/\s+/).map(parseFloat);
    const toParts = to.split(/\s+/).map(parseFloat);
    
    const interpolated = fromParts.map((val, i) => 
      val + (toParts[i] - val) * progress
    );
    
    switch (type) {
      case 'translate':
        return `translate(${interpolated.join(' ')})`;
      case 'scale':
        return `scale(${interpolated.join(' ')})`;
      case 'rotate':
        return `rotate(${interpolated.join(' ')})`;
      case 'skewX':
        return `skewX(${interpolated[0]})`;
      case 'skewY':
        return `skewY(${interpolated[0]})`;
      default:
        return '';
    }
  }
  
  interpolateColor(from, to, progress, colorSpace = 'srgb') {
    // Simple RGB interpolation
    // In production, implement proper color space conversion
    const fromRgb = this.parseColor(from);
    const toRgb = this.parseColor(to);
    
    const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * progress);
    const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * progress);
    const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * progress);
    
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  parseColor(color) {
    // Simple color parsing
    const hex = color.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      return {
        r: parseInt(hex[1].substr(0, 2), 16),
        g: parseInt(hex[1].substr(2, 2), 16),
        b: parseInt(hex[1].substr(4, 2), 16)
      };
    }
    
    const rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgb) {
      return {
        r: parseInt(rgb[1]),
        g: parseInt(rgb[2]),
        b: parseInt(rgb[3])
      };
    }
    
    return { r: 0, g: 0, b: 0 };
  }
  
  getPointOnPath(pathData, progress) {
    // Simplified path point calculation
    // In production, use proper SVG path parsing
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    
    const length = path.getTotalLength();
    const point = path.getPointAtLength(length * progress);
    
    // Calculate angle
    const point1 = path.getPointAtLength(length * progress - 1);
    const point2 = path.getPointAtLength(length * progress + 1);
    const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
    
    return { x: point.x, y: point.y, angle };
  }
  
  interpolatePath(fromPath, toPath, progress) {
    // Simple path interpolation
    // In production, use proper path morphing algorithm
    return progress < 0.5 ? fromPath : toPath;
  }
  
  // State management
  setState(stateId) {
    const stateEl = this.states.get(stateId);
    if (!stateEl) return;
    
    this.state.currentState = stateId;
    
    // Parse and apply state animations
    const stateTimeline = this.parseTimeline(stateEl);
    this.timeline = stateTimeline;
    
    // Reset animations
    this.state.currentTime = 0;
    this._startTime = performance.now();
    
    this.emit('statechange', { state: stateId });
  }
  
  setupTriggers() {
    if (!this.svgContent) return;
    
    this.triggers.forEach(trigger => {
      const targets = this.svgContent.querySelectorAll(trigger.target || '*');
      
      targets.forEach(target => {
        target.addEventListener(trigger.event, () => {
          this.setState(trigger.state);
        });
      });
    });
  }
  
  // Rendering
  render(canvas, callback) { // Add callback parameter
    if (!this.svgContent || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(this.svgContent);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        if (callback) callback(); // Execute the callback here
    };
    
    img.onerror = (e) => {
      console.error('Error rendering SVG:', e);
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  }
  
  exportFrame(time, format = 'png') {
    const wasPlaying = this.state.playing;
    if (wasPlaying) {
        this.pause();
    }

    this.seek(time);
    
    const canvas = document.createElement('canvas');
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    
    return new Promise((resolve) => {
        // Use the new render callback to avoid race conditions
        this.render(canvas, () => {
            canvas.toBlob(blob => {
                if (wasPlaying) {
                    this.play(); // Resume playback if it was active
                }
                resolve(blob);
            }, `image/${format}`);
        });
    });
}
  
  // Event handling
  emit(event, data = {}) {
    this.events.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
  
  on(event, handler) {
    this.events.addEventListener(event, handler);
  }
  
  off(event, handler) {
    this.events.removeEventListener(event, handler);
  }
  
  // Getters/Setters
  get duration() {
    return this.state.duration;
  }
  
  get currentTime() {
    return this.state.currentTime;
  }
  
  set currentTime(time) {
    this.seek(time);
  }
  
  get playbackRate() {
    return this.state.playbackRate;
  }
  
  set playbackRate(rate) {
    this.state.playbackRate = rate;
  }
  
  get loop() {
    return this.options.loop;
  }
  
  set loop(value) {
    this.options.loop = value;
  }
  
  get paused() {
    return !this.state.playing;
  }
  
  // Cleanup
  destroy() {
    this.stop();
    this.targetCache.clear();
    this.variables.clear();
    this.states.clear();
    this.triggers = [];
    this.timeline = null;
    this.svgContent = null;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OpenASVG;
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return OpenASVG; });
} else {
  window.OpenASVG = OpenASVG;
}
