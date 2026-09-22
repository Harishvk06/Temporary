import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isWebGLAvailable } from '../../utils/webglUtils';

interface ParticlesProps {
  mousePos: { x: number; y: number };
}

const SpiralVortexParticles: React.FC<ParticlesProps> = ({ mousePos }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const raysRef = useRef<THREE.LineSegments>(null);
  const count = 2000;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const deepBlue = new THREE.Color('#0a0e2e');
    const cyan = new THREE.Color('#22d3ee');
    const pinkPurple = new THREE.Color('#c084fc');
    const mint = new THREE.Color('#4ade80');

    for (let i = 0; i < count; i++) {
      const radius = 1.5 + Math.pow(Math.random(), 1.6) * 20;
      const angle = Math.random() * Math.PI * 2 + radius * 0.6;
      const height = (Math.random() - 0.5) * 7;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      const mixRatio = Math.min(1, radius / 16);
      let particleColor: THREE.Color;
      if (Math.random() > 0.6) {
        particleColor = cyan.clone().lerp(mint, Math.random());
      } else if (Math.random() > 0.3) {
        particleColor = pinkPurple.clone().lerp(cyan, mixRatio);
      } else {
        particleColor = deepBlue.clone().lerp(cyan, mixRatio * 0.4);
      }

      col[i * 3] = particleColor.r;
      col[i * 3 + 1] = particleColor.g;
      col[i * 3 + 2] = particleColor.b;
    }

    return [pos, col];
  }, []);

  // Radiating Light Ray Streaks
  const rayGeometry = useMemo(() => {
    const linePositions = new Float32Array(24 * 6);
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      linePositions[i * 6] = 0;
      linePositions[i * 6 + 1] = 0;
      linePositions[i * 6 + 2] = 0;
      linePositions[i * 6 + 3] = Math.cos(angle) * 15;
      linePositions[i * 6 + 4] = (Math.random() - 0.5) * 8;
      linePositions[i * 6 + 5] = Math.sin(angle) * 15;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    return geom;
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.09;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1 + mousePos.y * 0.12;
      pointsRef.current.rotation.z = mousePos.x * 0.12;
    }
    if (raysRef.current) {
      raysRef.current.rotation.y -= delta * 0.03;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Radiating Light Ray Streaks */}
      <lineSegments ref={raysRef} geometry={rayGeometry}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
};

// 2D HTML5 Canvas Particles Fallback
const Vortex2DFallback: React.FC<{ mousePos: { x: number; y: number } }> = ({ mousePos }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.5 ? '#22d3ee' : '#c084fc',
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.angle += 0.006;
        p.x += Math.cos(p.angle) * p.speed + mousePos.x * 0.6;
        p.y += Math.sin(p.angle) * p.speed + mousePos.y * 0.6;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.45;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

interface VortexBackground3DProps {
  mousePos: { x: number; y: number };
}

export const VortexBackground3D: React.FC<VortexBackground3DProps> = ({ mousePos }) => {
  const [hasWebGL, setHasWebGL] = useState<boolean>(false);

  useEffect(() => {
    setHasWebGL(isWebGLAvailable());
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-gradient-to-b from-[#0a0e2e] to-[#0a0e1a]">
      {/* Ambient Deep Blue Radial Glow reacting to cursor */}
      <div
        className="absolute w-[900px] h-[900px] rounded-full blur-[150px] pointer-events-none transition-transform duration-700 ease-out opacity-50"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(192,132,252,0.15) 40%, rgba(10,14,46,0) 70%)',
          left: `calc(50% + ${mousePos.x * 250}px - 450px)`,
          top: `calc(40% + ${mousePos.y * 250}px - 450px)`,
        }}
      />

      {hasWebGL ? (
        <Suspense fallback={<Vortex2DFallback mousePos={mousePos} />}>
          <Canvas
            camera={{ position: [0, 0, 12], fov: 60 }}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[mousePos.x * 10, mousePos.y * 10, 10]} intensity={1.8} color="#22d3ee" />
            <SpiralVortexParticles mousePos={mousePos} />
          </Canvas>
        </Suspense>
      ) : (
        <Vortex2DFallback mousePos={mousePos} />
      )}
    </div>
  );
};
