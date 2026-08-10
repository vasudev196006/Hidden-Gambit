import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  fadeSpeed: number;
  color: string;
}

export const CanvasEmbers: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const particleCount = 45;

    const colors = [
      "rgba(239, 68, 68, ",   // bright red
      "rgba(220, 38, 38, ",   // dark red
      "rgba(185, 28, 28, ",   // deep crimson
      "rgba(251, 146, 60, ",  // ember orange
    ];

    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: height + Math.random() * 40,
      size: Math.random() * 2.5 + 0.8,
      speedY: Math.random() * 0.8 + 0.3,
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.8 + 0.2,
      fadeSpeed: Math.random() * 0.005 + 0.002,
      color: colors[Math.floor(Math.random() * colors.length)],
    });

    for (let i = 0; i < particleCount; i++) {
      const p = createParticle();
      p.y = Math.random() * height; // initial spread
      particles.push(p);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle ambient vignette glow
      const radialGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        100,
        width / 2,
        height / 2,
        Math.max(width, height) / 1.2
      );
      radialGradient.addColorStop(0, "rgba(185, 28, 28, 0.04)");
      radialGradient.addColorStop(0.5, "rgba(20, 0, 0, 0.15)");
      radialGradient.addColorStop(1, "rgba(5, 5, 5, 0.7)");

      ctx.fillStyle = radialGradient;
      ctx.fillRect(0, 0, width, height);

      // Update and draw embers
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speedY;
        p.x += p.speedX + Math.sin(p.y * 0.01) * 0.2;
        p.opacity -= p.fadeSpeed;

        if (p.y < -10 || p.opacity <= 0) {
          particles[i] = createParticle();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
