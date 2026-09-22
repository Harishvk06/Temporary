import React, { useRef, Suspense, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html, Sphere, Box, Cylinder, Ring, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { Sparkles, Cpu, CheckCircle, Camera, Film } from 'lucide-react';
import { isWebGLAvailable } from '../../utils/webglUtils';
import { Hero3DFallback2D } from './Hero3DFallback2D';

interface Hero3DSceneProps {
  mousePos: { x: number; y: number };
}

// 1. 3D Humanoid AI Robot Head (White/Chrome, glowing blue eyes, visible circuitry) facing right
const RobotHead: React.FC<{ mousePos: { x: number; y: number } }> = ({ mousePos }) => {
  const headGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!headGroupRef.current) return;
    const targetRotY = mousePos.x * 0.7;
    const targetRotX = mousePos.y * 0.4;
    headGroupRef.current.rotation.y = THREE.MathUtils.damp(
      headGroupRef.current.rotation.y,
      targetRotY,
      4,
      delta
    );
    headGroupRef.current.rotation.x = THREE.MathUtils.damp(
      headGroupRef.current.rotation.x,
      targetRotX,
      4,
      delta
    );
  });

  return (
    <group ref={headGroupRef} position={[2.2, 0.4, 0]}>
      {/* Cranium / Skull Sphere */}
      <Sphere args={[0.9, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.92}
          roughness={0.08}
        />
      </Sphere>

      {/* Visible Outer Circuitry Wireframe */}
      <Sphere args={[0.93, 16, 16]} position={[0, 0, 0]}>
        <meshBasicMaterial
          color="#22d3ee"
          wireframe
          transparent
          opacity={0.3}
        />
      </Sphere>

      {/* Face Plate Visor Box */}
      <Box args={[1.4, 1.0, 0.7]} position={[0, 0, 0.4]} scale={[0.85, 0.7, 0.6]}>
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.95}
          roughness={0.05}
        />
      </Box>

      {/* Glowing Blue Eyes Spheres */}
      <Sphere args={[0.12, 16, 16]} position={[-0.28, 0.1, 0.75]}>
        <meshBasicMaterial color="#22d3ee" />
      </Sphere>
      <Sphere args={[0.12, 16, 16]} position={[0.28, 0.1, 0.75]}>
        <meshBasicMaterial color="#22d3ee" />
      </Sphere>

      {/* Eye Halo Rings */}
      <Ring args={[0.14, 0.18, 32]} position={[-0.28, 0.1, 0.73]}>
        <meshBasicMaterial color="#4ade80" side={THREE.DoubleSide} />
      </Ring>
      <Ring args={[0.14, 0.18, 32]} position={[0.28, 0.1, 0.73]}>
        <meshBasicMaterial color="#4ade80" side={THREE.DoubleSide} />
      </Ring>

      {/* Neck Base Cylinder */}
      <Cylinder args={[0.4, 0.5, 0.4, 32]} position={[0, -0.9, 0]}>
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </Cylinder>
    </group>
  );
};

// 2. 3D Camera Model Tilted in Space + Fanned Photo Stack + Glowing Tablet Frame
const CameraAndStack: React.FC<{ mousePos: { x: number; y: number } }> = ({ mousePos }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.25;
    groupRef.current.rotation.x = mousePos.y * 0.25 + Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
  });

  return (
    <group ref={groupRef} position={[-2.2, 0.6, 0]} scale={0.75}>
      <Box args={[1.5, 1.0, 0.8]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </Box>
      <Cylinder args={[0.45, 0.45, 0.7, 32]} position={[0, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </Cylinder>
      <Ring args={[0.28, 0.42, 32]} position={[0, 0, 0.91]}>
        <meshBasicMaterial color="#22d3ee" side={THREE.DoubleSide} />
      </Ring>

      {/* Fanned Photo Stack */}
      <mesh position={[-0.4, -0.3, -0.5]} rotation={[0.1, 0.3, -0.15]}>
        <planeGeometry args={[1.4, 0.9]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.2} />
      </mesh>
      <mesh position={[0.3, -0.5, -0.8]} rotation={[-0.1, -0.35, 0.2]}>
        <planeGeometry args={[1.4, 0.9]} />
        <meshStandardMaterial color="#c084fc" roughness={0.2} />
      </mesh>
      <mesh position={[-0.1, 0.5, -0.9]} rotation={[0.25, 0.1, -0.1]}>
        <planeGeometry args={[1.4, 0.9]} />
        <meshStandardMaterial color="#4ade80" roughness={0.2} />
      </mesh>

      {/* Glowing Tablet/Phone Frame displaying camera icon */}
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        <Html position={[0, -1.3, 0.3]} center>
          <div className="w-24 h-16 rounded-xl border border-cyan-400/60 bg-[#0a0e2e]/90 backdrop-blur-md shadow-teal-glow flex items-center justify-center text-cyan-400">
            <Camera className="w-6 h-6 animate-pulse" />
          </div>
        </Html>
      </Float>
    </group>
  );
};

// 3. 3D Unspooling Film Reel with Individual Video-Frame Thumbnails
const FilmReel: React.FC<{ mousePos: { x: number; y: number } }> = ({ mousePos }) => {
  const reelRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!reelRef.current) return;
    reelRef.current.rotation.z += delta * 0.4;
    reelRef.current.position.y = -1.4 + Math.sin(state.clock.elapsedTime * 1.2) * 0.08;
  });

  return (
    <group position={[0, -1.2, 0.2]}>
      <group ref={reelRef}>
        <Cylinder args={[0.8, 0.8, 0.14, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </Cylinder>
        <Torus args={[0.62, 0.04, 16, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#22d3ee" />
        </Torus>
      </group>

      <mesh position={[-0.9, 0.5, 0.3]} rotation={[0.1, -0.2, 0.2]}>
        <planeGeometry args={[0.65, 0.45]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
      <mesh position={[0.9, 0.7, 0.2]} rotation={[-0.1, 0.2, -0.15]}>
        <planeGeometry args={[0.65, 0.45]} />
        <meshStandardMaterial color="#c084fc" />
      </mesh>
    </group>
  );
};

// 4. Glowing Blue/Pink/Purple Energy Trail Lines
const EnergyTrails: React.FC = () => {
  const curveLeftToRight1 = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.5, 0.8, -0.5),
        new THREE.Vector3(-1.0, 1.4, 0.5),
        new THREE.Vector3(0.5, 0.6, 0),
        new THREE.Vector3(2.2, 0.4, 0),
      ]),
    []
  );

  const curveLeftToRight2 = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.2, -0.6, -0.2),
        new THREE.Vector3(-0.8, -1.0, 0.6),
        new THREE.Vector3(1.0, -0.5, 0.2),
        new THREE.Vector3(2.2, 0.4, 0),
      ]),
    []
  );

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curveLeftToRight1, 48, 0.025, 8, false]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.7} />
      </mesh>
      <mesh>
        <tubeGeometry args={[curveLeftToRight2, 48, 0.025, 8, false]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.7} />
      </mesh>
    </group>
  );
};

// 5. Thin Glowing Connector Lines to Three Vertically Stacked Pill Labels ("Input", "Output", "Input")
const ConnectorNodes: React.FC = () => {
  const curveNode1 = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(2.2, 0.4, 0),
        new THREE.Vector3(1.2, 1.8, 0.4),
        new THREE.Vector3(0.2, 2.2, 0.6),
      ]),
    []
  );

  const curveNode2 = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(2.2, 0.4, 0),
        new THREE.Vector3(2.8, -0.8, 0.4),
        new THREE.Vector3(3.2, -1.8, 0.6),
      ]),
    []
  );

  const curveNode3 = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(2.2, 0.4, 0),
        new THREE.Vector3(3.4, 1.0, 0.4),
        new THREE.Vector3(3.8, 1.8, 0.6),
      ]),
    []
  );

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curveNode1, 32, 0.015, 8, false]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} />
      </mesh>
      <mesh>
        <tubeGeometry args={[curveNode2, 32, 0.015, 8, false]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.6} />
      </mesh>
      <mesh>
        <tubeGeometry args={[curveNode3, 32, 0.015, 8, false]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.6} />
      </mesh>

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
        {/* Node 1: Input (Top) */}
        <group position={[0.2, 2.2, 0.6]}>
          <Sphere args={[0.18, 16, 16]}>
            <meshBasicMaterial color="#22d3ee" />
          </Sphere>
          <Html position={[0, -0.38, 0]} center>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0a0e2e]/90 text-cyan-300 border border-cyan-500/50 shadow-teal-glow whitespace-nowrap">
              Input
            </span>
          </Html>
        </group>

        {/* Node 2: Output (Middle) */}
        <group position={[3.2, -1.8, 0.6]}>
          <Sphere args={[0.2, 16, 16]}>
            <meshBasicMaterial color="#4ade80" />
          </Sphere>
          <Html position={[0, -0.38, 0]} center>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0a0e2e]/90 text-emerald-300 border border-emerald-500/50 shadow-lg whitespace-nowrap">
              Output
            </span>
          </Html>
        </group>

        {/* Node 3: Input (Bottom) */}
        <group position={[3.8, 1.8, 0.6]}>
          <Sphere args={[0.18, 16, 16]}>
            <meshBasicMaterial color="#c084fc" />
          </Sphere>
          <Html position={[0, -0.38, 0]} center>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0a0e2e]/90 text-purple-300 border border-purple-500/50 shadow-lg whitespace-nowrap">
              Input
            </span>
          </Html>
        </group>
      </Float>
    </group>
  );
};

// 6. Floating Agent Badge (Top Right)
const FloatingAgentBadge: React.FC = () => {
  return (
    <Float speed={1.8} rotationIntensity={0.1} floatIntensity={0.4}>
      <Html position={[2.6, 2.6, 0.5]} center>
        <div className="glass-panel px-4 py-2 rounded-full border border-cyan-500/50 shadow-teal-glow flex items-center gap-2.5 whitespace-nowrap text-xs font-semibold text-white">
          <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span>🔷 Gemini 2.5 Flash Agent</span>
          <span className="text-emerald-400 font-mono text-[11px] font-bold flex items-center gap-1 border-l border-white/10 pl-2">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Active (14ms Latency)
          </span>
        </div>
      </Html>
    </Float>
  );
};

export const Hero3DScene: React.FC<Hero3DSceneProps> = ({ mousePos }) => {
  const [hasWebGL, setHasWebGL] = useState<boolean>(false);

  useEffect(() => {
    setHasWebGL(isWebGLAvailable());
  }, []);

  if (!hasWebGL) {
    return <Hero3DFallback2D mousePos={mousePos} />;
  }

  return (
    <div className="relative w-full h-[520px] sm:h-[620px] flex items-center justify-center select-none">
      <Suspense fallback={<Hero3DFallback2D mousePos={mousePos} />}>
        <Canvas
          camera={{ position: [0, 0, 8.5], fov: 50 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <pointLight position={[-5, -5, 2]} intensity={0.8} color="#22d3ee" />
          <pointLight position={[5, -2, 2]} intensity={0.8} color="#c084fc" />

          <FloatingAgentBadge />
          <RobotHead mousePos={mousePos} />
          <CameraAndStack mousePos={mousePos} />
          <FilmReel mousePos={mousePos} />
          <EnergyTrails />
          <ConnectorNodes />
        </Canvas>
      </Suspense>
    </div>
  );
};
