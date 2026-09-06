"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  type: "paw" | "heart" | "sparkle" | "bubble";
  rotation: number;
  rotSpeed: number;
}

const COLORS = [
  "#ffb6c1", // light pink
  "#ff9ebb", // rose
  "#bfe3f7", // soft sky
  "#c8f2e2", // soft mint
  "#e3d5ff", // soft lavender
  "#ffe8a3", // warm butter
];

export function CatEffects() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: -100, y: -100 });
  const isTouchRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      isTouchRef.current =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Draw helper for cute paw print
    const drawPaw = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      color: string,
      alpha: number,
      rotation: number
    ) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.globalAlpha = alpha;
      context.fillStyle = color;

      // Main pad
      context.beginPath();
      context.ellipse(0, size * 0.25, size * 0.5, size * 0.4, 0, 0, Math.PI * 2);
      context.fill();

      // 4 Toe beans
      const toeOffsets = [
        { dx: -size * 0.45, dy: -size * 0.25, r: size * 0.2 },
        { dx: -size * 0.16, dy: -size * 0.45, r: size * 0.22 },
        { dx: size * 0.16, dy: -size * 0.45, r: size * 0.22 },
        { dx: size * 0.45, dy: -size * 0.25, r: size * 0.2 },
      ];
      toeOffsets.forEach(({ dx, dy, r }) => {
        context.beginPath();
        context.ellipse(dx, dy, r * 0.85, r, 0, 0, Math.PI * 2);
        context.fill();
      });

      context.restore();
    };

    // Draw helper for heart
    const drawHeart = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      color: string,
      alpha: number,
      rotation: number
    ) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.beginPath();
      const topCurveHeight = size * 0.3;
      context.moveTo(0, topCurveHeight);
      context.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
      context.bezierCurveTo(
        -size / 2,
        (size + topCurveHeight) / 2,
        0,
        size * 0.85,
        0,
        size
      );
      context.bezierCurveTo(
        0,
        size * 0.85,
        size / 2,
        (size + topCurveHeight) / 2,
        size / 2,
        topCurveHeight
      );
      context.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
      context.closePath();
      context.fill();
      context.restore();
    };

    // Draw helper for sparkle
    const drawSparkle = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      color: string,
      alpha: number,
      rotation: number
    ) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.beginPath();
      for (let i = 0; i < 4; i++) {
        context.lineTo(
          Math.cos(((i * 90) * Math.PI) / 180) * size,
          Math.sin(((i * 90) * Math.PI) / 180) * size
        );
        context.lineTo(
          Math.cos(((i * 90 + 45) * Math.PI) / 180) * (size * 0.25),
          Math.sin(((i * 90 + 45) * Math.PI) / 180) * (size * 0.25)
        );
      }
      context.closePath();
      context.fill();
      context.restore();
    };

    // Animation Loop
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.alpha *= 0.94; // Fade out smoothly

        if (p.alpha < 0.02) {
          particles.splice(i, 1);
          continue;
        }

        if (p.type === "paw") {
          drawPaw(ctx, p.x, p.y, p.size, p.color, p.alpha, p.rotation);
        } else if (p.type === "heart") {
          drawHeart(ctx, p.x, p.y, p.size, p.color, p.alpha, p.rotation);
        } else if (p.type === "sparkle") {
          drawSparkle(ctx, p.x, p.y, p.size, p.color, p.alpha, p.rotation);
        } else {
          // Bubble
          ctx.save();
          ctx.globalAlpha = p.alpha * 0.7;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    // Mouse move: trail generator
    const handleMouseMove = (e: MouseEvent) => {
      const cursor = cursorRef.current;
      if (cursor) {
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const dist = Math.hypot(dx, dy);

      // Only spawn particles if moved enough
      if (dist > 28) {
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const types: Array<"paw" | "sparkle" | "heart" | "bubble"> = [
          "paw",
          "bubble",
          "sparkle",
          "heart",
        ];
        const type = types[Math.floor(Math.random() * types.length)];

        particlesRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -0.6 - Math.random() * 0.7, // gentle upward drift
          size: type === "paw" ? 8 + Math.random() * 5 : 5 + Math.random() * 6,
          alpha: 0.82,
          color,
          type,
          rotation: (Math.random() - 0.5) * 0.8,
          rotSpeed: (Math.random() - 0.5) * 0.04,
        });

        // Limit maximum trail particles
        if (particlesRef.current.length > 35) {
          particlesRef.current.splice(0, particlesRef.current.length - 35);
        }
      }
    };

    // Click: particle burst
    const handleClick = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ("touches" in e) {
        if (e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else if (e.changedTouches.length > 0) {
          clientX = e.changedTouches[0].clientX;
          clientY = e.changedTouches[0].clientY;
        }
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      if (clientX === 0 && clientY === 0) return;

      // Spawn 8-10 burst particles
      const count = 9;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = 2 + Math.random() * 3.5;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const type: "paw" | "heart" | "sparkle" =
          i % 3 === 0 ? "paw" : i % 3 === 1 ? "heart" : "sparkle";

        particlesRef.current.push({
          x: clientX,
          y: clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: type === "paw" ? 9 + Math.random() * 5 : 7 + Math.random() * 5,
          alpha: 1,
          color,
          type,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.12,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);
    window.addEventListener("touchend", handleClick, { passive: true });

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("touchend", handleClick);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="cat-effects-canvas"
        aria-hidden="true"
      />
      <div ref={cursorRef} className="cat-custom-cursor" aria-hidden="true">
        <svg
          viewBox="0 0 32 32"
          width="32"
          height="32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main paw pad */}
          <path
            d="M9 19C9 14.5 12 11.5 16 11.5C20 11.5 23 14.5 23 19C23 23 20 25.5 16 25.5C12 25.5 9 23 9 19Z"
            fill="#FFF8FA"
            stroke="#E8AEC8"
            strokeWidth="2"
          />
          {/* Pink center pad */}
          <path
            d="M11.5 19.5C11.5 16.5 13.5 14.5 16 14.5C18.5 14.5 20.5 16.5 20.5 19.5C20.5 21.8 18.5 23.5 16 23.5C13.5 23.5 11.5 21.8 11.5 19.5Z"
            fill="#FFAFC7"
          />
          {/* Toe 1 */}
          <ellipse
            cx="7"
            cy="11"
            rx="3"
            ry="4"
            fill="#FFF8FA"
            stroke="#E8AEC8"
            strokeWidth="1.8"
          />
          <ellipse cx="7" cy="11" rx="1.8" ry="2.5" fill="#FFAFC7" />
          {/* Toe 2 */}
          <ellipse
            cx="12.5"
            cy="6.5"
            rx="3.2"
            ry="4.2"
            fill="#FFF8FA"
            stroke="#E8AEC8"
            strokeWidth="1.8"
          />
          <ellipse cx="12.5" cy="6.5" rx="1.9" ry="2.7" fill="#FFAFC7" />
          {/* Toe 3 */}
          <ellipse
            cx="19.5"
            cy="6.5"
            rx="3.2"
            ry="4.2"
            fill="#FFF8FA"
            stroke="#E8AEC8"
            strokeWidth="1.8"
          />
          <ellipse cx="19.5" cy="6.5" rx="1.9" ry="2.7" fill="#FFAFC7" />
          {/* Toe 4 */}
          <ellipse
            cx="25"
            cy="11"
            rx="3"
            ry="4"
            fill="#FFF8FA"
            stroke="#E8AEC8"
            strokeWidth="1.8"
          />
          <ellipse cx="25" cy="11" rx="1.8" ry="2.5" fill="#FFAFC7" />
        </svg>
      </div>
    </>
  );
}
