import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  speedY: number;
  speedX: number;
  size: number;
  alpha: number;
  isPrimary: boolean;
  wobbleScale: number;
  wobbleSpeed: number;
  baseX: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface WaveLayer {
  offset: number;
  amplitude: number;
  frequency: number;
  speed: number;
  color: string;
  alpha: number;
}

export function EnergyStreamBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let time = 0;

    // Wave layers for flowing energy effect
    const waveLayers: WaveLayer[] = [
      { offset: 0, amplitude: 60, frequency: 0.003, speed: 0.015, color: '#00FF88', alpha: 0.08 },
      { offset: 2, amplitude: 40, frequency: 0.005, speed: 0.02, color: '#00E0FF', alpha: 0.06 },
      { offset: 4, amplitude: 80, frequency: 0.002, speed: 0.01, color: '#00FF88', alpha: 0.05 },
      { offset: 1, amplitude: 30, frequency: 0.008, speed: 0.025, color: '#00C8FF', alpha: 0.04 },
    ];

    const particles: Particle[] = [];
    const numParticles = 250;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: 0,
        y: 0,
        speedY: -(Math.random() * 2.5 + 0.5),
        speedX: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        isPrimary: Math.random() > 0.4,
        wobbleScale: Math.random() * 2.5,
        wobbleSpeed: Math.random() * 0.05 + 0.01,
        baseX: 0,
        trail: []
      });
    }

    // Initialize particles at random positions
    const initParticles = () => {
      particles.forEach(p => {
        p.baseX = width / 2 + (Math.random() - 0.5) * (width * 0.9);
        p.x = p.baseX;
        p.y = Math.random() * height;
        p.trail = [];
      });
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = Math.max(window.innerHeight, 800);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    window.addEventListener('resize', resize);
    resize();

    // Easing function for smooth wave motion
    const easeInOutSine = (x: number): number => -(Math.cos(Math.PI * x) - 1) / 2;

    const draw = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Background gradient (Dark Teal to Black with subtle animation)
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      const bgPulse = Math.sin(time * 0.01) * 0.02;
      bgGradient.addColorStop(0, `rgb(${2 + bgPulse * 10}, ${11 + bgPulse * 5}, ${10 + bgPulse * 5})`);
      bgGradient.addColorStop(0.4, `rgb(${0}, ${26 + bgPulse * 20}, ${18 + bgPulse * 10})`);
      bgGradient.addColorStop(1, '#000000');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // --- Draw Flowing Wave Layers ---
      waveLayers.forEach((layer, layerIndex) => {
        ctx.beginPath();
        const beamWidth = width > 768 ? 500 + layerIndex * 50 : width * 0.75;
        const centerX = width / 2;

        // Left edge of wave
        ctx.moveTo(centerX - beamWidth / 2, height);

        for (let y = height; y >= 0; y -= 10) {
          const progress = y / height;
          const waveOffset = Math.sin(y * layer.frequency + time * layer.speed + layer.offset) * layer.amplitude;
          const x = centerX - beamWidth / 2 + beamWidth * progress + waveOffset;
          ctx.lineTo(x, y);
        }

        // Right edge back down
        ctx.lineTo(centerX + beamWidth / 2, height);
        ctx.closePath();

        const waveGradient = ctx.createLinearGradient(centerX - beamWidth / 2, 0, centerX + beamWidth / 2, 0);
        waveGradient.addColorStop(0, layer.color.replace(')', `, 0)`).replace('#', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_, r, g, b) => {
          const rDec = parseInt(r, 16);
          const gDec = parseInt(g, 16);
          const bDec = parseInt(b, 16);
          return `${rDec}, ${gDec}, ${bDec}`;
        }));
        waveGradient.addColorStop(0.5, layer.color.replace(')', `, ${layer.alpha * 1.5})`));
        waveGradient.addColorStop(1, layer.color.replace(')', `, 0)`).replace('#', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_, r, g, b) => {
          const rDec = parseInt(r, 16);
          const gDec = parseInt(g, 16);
          const bDec = parseInt(b, 16);
          return `${rDec}, ${gDec}, ${bDec}`;
        }));

        ctx.fillStyle = layer.color.replace('#', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_, r, g, b) => {
          const rDec = parseInt(r, 16);
          const gDec = parseInt(g, 16);
          const bDec = parseInt(b, 16);
          return `${rDec}, ${gDec}, ${bDec}, ${layer.alpha})`;
        });
        ctx.fill();
      });

      // --- Draw Main Energy Beam ---
      const beamWidth = width > 768 ? 600 : width * 0.8;
      const startX = width / 2 - beamWidth / 2;

      // Animated beam gradient with pulsing core
      const beamPulse = (Math.sin(time * 0.03) + 1) / 2;
      const beamGrad = ctx.createLinearGradient(startX, 0, startX + beamWidth, 0);
      beamGrad.addColorStop(0, 'rgba(0, 255, 136, 0)');
      beamGrad.addColorStop(0.15, `rgba(0, 224, 255, ${0.04 + beamPulse * 0.02})`);
      beamGrad.addColorStop(0.3, `rgba(0, 255, 136, ${0.12 + beamPulse * 0.05})`);
      beamGrad.addColorStop(0.45, `rgba(0, 255, 136, ${0.18 + beamPulse * 0.08})`);
      beamGrad.addColorStop(0.5, `rgba(0, 255, 136, ${0.25 + beamPulse * 0.1})`);
      beamGrad.addColorStop(0.55, `rgba(0, 255, 136, ${0.18 + beamPulse * 0.08})`);
      beamGrad.addColorStop(0.7, `rgba(0, 255, 136, ${0.12 + beamPulse * 0.05})`);
      beamGrad.addColorStop(0.85, `rgba(0, 224, 255, ${0.04 + beamPulse * 0.02})`);
      beamGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');

      ctx.fillStyle = beamGrad;
      ctx.fillRect(startX, 0, beamWidth, height);

      // Intense Center Core with light trails
      const coreWidth = 80;
      const coreX = width / 2 - coreWidth / 2;
      const coreGrad = ctx.createLinearGradient(coreX, 0, coreX + coreWidth, 0);
      coreGrad.addColorStop(0, 'rgba(0, 255, 136, 0)');
      coreGrad.addColorStop(0.3, `rgba(0, 255, 136, ${0.5 + beamPulse * 0.3})`);
      coreGrad.addColorStop(0.5, `rgba(0, 255, 136, ${0.8 + beamPulse * 0.2})`);
      coreGrad.addColorStop(0.7, `rgba(0, 255, 136, ${0.5 + beamPulse * 0.3})`);
      coreGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(coreX, 0, coreWidth, height);

      // Add vertical light streaks in the core
      for (let i = 0; i < 5; i++) {
        const streakX = coreX + (i + 0.5) * (coreWidth / 5);
        const streakWidth = 8 + Math.sin(time * 0.05 + i) * 4;
        const streakAlpha = 0.3 + Math.sin(time * 0.08 + i * 2) * 0.15;
        const streakGrad = ctx.createLinearGradient(streakX - streakWidth / 2, 0, streakX + streakWidth / 2, 0);
        streakGrad.addColorStop(0, `rgba(255, 255, 255, 0)`);
        streakGrad.addColorStop(0.5, `rgba(255, 255, 255, ${streakAlpha})`);
        streakGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = streakGrad;
        ctx.fillRect(streakX - streakWidth / 2, 0, streakWidth, height);
      }

      // --- Draw Particles with Trails ---
      particles.forEach(p => {
        // Store trail position
        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
        if (p.trail.length > 8) p.trail.shift();

        // Update particle position with wave influence
        const distFromCenter = Math.abs(p.x - width / 2);
        const waveInfluence = Math.max(0, 1 - distFromCenter / (beamWidth / 2));

        p.y += p.speedY * (1 + waveInfluence * 0.5);
        p.x += p.speedX + Math.sin(time * p.wobbleSpeed + p.wobbleScale) * p.wobbleScale * 0.5;

        // Apply wave layer influence
        const waveOffset = Math.sin(p.y * 0.005 + time * 0.02) * 30 * waveInfluence;
        p.x += waveOffset * 0.02;

        // Natural turbulence near edges
        if (distFromCenter > beamWidth / 2 * 0.8) {
          p.x += (width / 2 - p.x) * 0.001;
        }

        // Fading and respawning
        p.alpha += 0.003 * (Math.random() > 0.5 ? 1 : -1);
        if (p.alpha < 0.1) p.alpha = 0.1;
        if (p.alpha > 0.9) p.alpha = 0.9;

        // Loop around vertically
        if (p.y < -10) {
          p.y = height + 10;
          p.baseX = width / 2 + (Math.random() - 0.5) * (beamWidth * 0.9);
          p.x = p.baseX;
          p.trail = [];
        }
        if (p.y > height + 10) {
          p.y = -10;
          p.baseX = width / 2 + (Math.random() - 0.5) * (beamWidth * 0.9);
          p.x = p.baseX;
          p.trail = [];
        }

        // Clamp horizontal movement
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        // Draw trail first (behind particle)
        p.trail.forEach((pos, i) => {
          const trailAlpha = (i / p.trail.length) * p.alpha * 0.5;
          const trailSize = p.size * (i / p.trail.length);
          const distToCenter = Math.abs(pos.x - width / 2);
          const ratio = Math.max(0, 1 - (distToCenter / (beamWidth / 2)));

          let r, g, b;
          if (p.isPrimary || ratio > 0.6) {
            r = 0; g = 255; b = 136;
          } else {
            r = 0; g = 224; b = 255;
          }

          ctx.beginPath();
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailAlpha})`;
          ctx.arc(pos.x, pos.y, trailSize, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw main particle
        ctx.beginPath();
        const distToCenter = Math.abs(p.x - width / 2);
        const ratio = Math.max(0, 1 - (distToCenter / (beamWidth / 2)));

        let pr, pg, pb;
        if (p.isPrimary || ratio > 0.6) {
          pr = 0; pg = 255; pb = 136;
        } else {
          pr = 0; pg = 224; pb = 255;
        }

        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Glow for particles near core
        if (p.size > 1.5 && ratio > 0.4) {
          const glowSize = p.size * (3 + Math.sin(time * 0.1) * 0.5);
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
          glowGrad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, ${p.alpha * 0.6})`);
          glowGrad.addColorStop(0.5, `rgba(${pr}, ${pg}, ${pb}, ${p.alpha * 0.2})`);
          glowGrad.addColorStop(1, `rgba(${pr}, ${pg}, ${pb}, 0)`);
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Sparkle effect for bright particles
        if (p.alpha > 0.7 && Math.random() > 0.95) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(time * 0.1);
          ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-p.size * 2, 0);
          ctx.lineTo(p.size * 2, 0);
          ctx.moveTo(0, -p.size * 2);
          ctx.lineTo(0, p.size * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      // --- Ambient Depth Lighting ---
      // Soft ambient glow pulses from center
      const ambientPulse = (Math.sin(time * 0.02) + 1) / 2;
      const ambientGrad = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.8
      );
      ambientGrad.addColorStop(0, `rgba(0, 255, 136, ${0.03 + ambientPulse * 0.02})`);
      ambientGrad.addColorStop(0.5, `rgba(0, 224, 255, ${0.02 + ambientPulse * 0.01})`);
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" style={{ mixBlendMode: 'screen' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000] opacity-60" />
    </div>
  );
}
