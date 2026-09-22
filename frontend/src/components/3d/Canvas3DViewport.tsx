import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Float, Sparkles, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ImageAdjustments } from '../../types';
import { ErrorBoundary3D } from './ErrorBoundary3D';
import { isWebGLAvailable } from '../../utils/webglUtils';

interface Canvas3DViewportProps {
  imageSrc: string;
  adjustments: ImageAdjustments;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
}

// 1. 3D Spatial Media Plane with Depth Displacement & Parallax Tilt
const DisplacedMediaPlane: React.FC<{
  imageSrc: string;
  adjustments: ImageAdjustments;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
}> = ({ imageSrc, adjustments, rotation = 0, flipH = false, flipV = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, imageSrc);

  const depthScale = ((adjustments.depthDisplacement ?? 30) / 100) * 0.8;
  const tiltFactor = ((adjustments.parallaxTilt ?? 40) / 100) * 0.5;

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Mouse parallax tilt dampening
    const targetRotX = state.pointer.y * tiltFactor;
    const targetRotY = state.pointer.x * tiltFactor;

    meshRef.current.rotation.x = THREE.MathUtils.damp(meshRef.current.rotation.x, targetRotX, 4, delta);
    meshRef.current.rotation.y = THREE.MathUtils.damp(meshRef.current.rotation.y, targetRotY, 4, delta);
  });

  const planeWidth = 5.2;
  const planeHeight = 3.6;

  return (
    <group
      rotation={[0, 0, (rotation * Math.PI) / 180]}
      scale={[flipH ? -1 : 1, flipV ? -1 : 1, 1]}
    >
      {/* Primary Displaced Mesh Plane */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <planeGeometry args={[planeWidth, planeHeight, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          displacementMap={depthScale > 0 ? texture : undefined}
          displacementScale={depthScale}
          roughness={0.15}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Holographic Wireframe Backplate */}
      {Boolean(adjustments.hologramScan) && (
        <mesh position={[0, 0, -0.15]} scale={[1.05, 1.05, 1]}>
          <planeGeometry args={[planeWidth, planeHeight, 16, 16]} />
          <meshBasicMaterial
            color="#22d3ee"
            wireframe
            transparent
            opacity={(Number(adjustments.hologramScan) / 100) * 0.4 || 0.4}
          />
        </mesh>
      )}
    </group>
  );
};

// 2. Atmospheric 3D Particle Systems Engine
const AtmosphericParticles: React.FC<{ adjustments: ImageAdjustments }> = ({ adjustments }) => {
  const count = Math.max(15, Math.floor(((adjustments.particleDensity ?? 50) / 100) * 120));
  const type = adjustments.particleType || 'cyber';
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.15;
  });

  const particleColor = useMemo(() => {
    switch (type) {
      case 'matrix':
        return '#10b981';
      case 'orbs':
        return '#c084fc';
      case 'stars':
        return '#fef08a';
      case 'grid':
        return '#38bdf8';
      case 'cyber':
      default:
        return '#22d3ee';
    }
  }, [type]);

  return (
    <group ref={groupRef}>
      <Sparkles
        count={count}
        scale={[10, 8, 6]}
        size={type === 'orbs' ? 4 : 2}
        speed={0.4}
        color={particleColor}
      />
    </group>
  );
};

// 3. Volumetric Studio Relighting Lights
const VolumetricStudioLights: React.FC<{ adjustments: ImageAdjustments }> = ({ adjustments }) => {
  const rawVol = typeof adjustments.volumetricLighting === 'boolean' ? (adjustments.volumetricLighting ? 60 : 0) : (adjustments.volumetricLighting ?? 60);
  const intensityFactor = (rawVol / 100) * 1.8;
  const color1 = adjustments.lightColor1 || '#2fd9f4';
  const color2 = adjustments.lightColor2 || '#c4c0ff';

  const light1Ref = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.8;
    if (light1Ref.current) {
      light1Ref.current.position.x = Math.sin(t) * 4;
      light1Ref.current.position.y = Math.cos(t * 0.7) * 3;
    }
    if (light2Ref.current) {
      light2Ref.current.position.x = -Math.sin(t * 0.9) * 4;
      light2Ref.current.position.y = -Math.cos(t) * 3;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 5, 6]} intensity={0.9} />
      <pointLight
        ref={light1Ref}
        position={[3, 3, 3]}
        intensity={intensityFactor}
        color={color1}
        distance={12}
      />
      <pointLight
        ref={light2Ref}
        position={[-3, -3, 2]}
        intensity={intensityFactor * 0.8}
        color={color2}
        distance={12}
      />
    </group>
  );
};

// 4. Interactive 3D Floating Mesh Objects
const Floating3DObjectLayer: React.FC<{ selectedObject?: string }> = ({ selectedObject = 'none' }) => {
  const objRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!objRef.current) return;
    objRef.current.rotation.x += delta * 0.5;
    objRef.current.rotation.y += delta * 0.7;
  });

  if (!selectedObject || selectedObject === 'none') return null;

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={objRef} position={[3.2, 1.8, 1]} scale={0.7}>
        {selectedObject === 'cube' && (
          <group>
            <mesh>
              <boxGeometry args={[1.2, 1.2, 1.2]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh scale={1.05}>
              <boxGeometry args={[1.2, 1.2, 1.2]} />
              <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.6} />
            </mesh>
          </group>
        )}

        {selectedObject === 'torus' && (
          <mesh>
            <torusGeometry args={[0.9, 0.22, 16, 32]} />
            <meshStandardMaterial color="#c084fc" metalness={0.8} roughness={0.15} />
          </mesh>
        )}

        {selectedObject === 'sphere' && (
          <mesh>
            <sphereGeometry args={[0.8, 32, 32]} />
            <meshStandardMaterial color="#38bdf8" metalness={0.95} roughness={0.05} />
          </mesh>
        )}

        {selectedObject === 'gem' && (
          <mesh>
            <octahedronGeometry args={[0.9, 0]} />
            <meshStandardMaterial color="#4ade80" metalness={0.85} roughness={0.1} />
          </mesh>
        )}
      </group>
    </Float>
  );
};

// 2D Fallback Preview Component if WebGL or Suspense is loading
const ViewportFallback2D: React.FC<{ imageSrc: string }> = ({ imageSrc }) => (
  <div className="relative w-full h-full flex items-center justify-center bg-[#080c18] p-4">
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-[#2fd9f4]/40 max-h-[500px]">
      <img src={imageSrc} alt="3D Media Preview" className="max-h-[480px] w-auto object-contain" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06060c]/80 via-transparent to-transparent flex items-end p-4">
        <span className="text-xs font-mono text-[#2fd9f4] font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2fd9f4] animate-ping" />
          3D Spatial Studio Fallback Active
        </span>
      </div>
    </div>
  </div>
);

export const Canvas3DViewport: React.FC<Canvas3DViewportProps> = ({
  imageSrc,
  adjustments,
  rotation = 0,
  flipH = false,
  flipV = false,
}) => {
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);

  useEffect(() => {
    setHasWebGL(isWebGLAvailable());
  }, []);

  if (!hasWebGL) {
    return <ViewportFallback2D imageSrc={imageSrc} />;
  }

  return (
    <div className="relative w-full h-full min-h-[480px] flex items-center justify-center rounded-xl overflow-hidden select-none bg-[#04060e]">
      {/* 3D Spatial Badge */}
      <div className="absolute top-4 left-4 z-20 glass-panel px-3 py-1.5 rounded-full border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300 flex items-center gap-2 shadow-teal-glow">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>3D Spatial Studio Viewport Active</span>
      </div>

      <ErrorBoundary3D fallback={<ViewportFallback2D imageSrc={imageSrc} />}>
        <Suspense fallback={<ViewportFallback2D imageSrc={imageSrc} />}>
          <Canvas
            camera={{ position: [0, 0, 6.2], fov: 45 }}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
            style={{ width: '100%', height: '100%' }}
          >
            <VolumetricStudioLights adjustments={adjustments} />
            <AtmosphericParticles adjustments={adjustments} />
            <DisplacedMediaPlane
              imageSrc={imageSrc}
              adjustments={adjustments}
              rotation={rotation}
              flipH={flipH}
              flipV={flipV}
            />
            <Floating3DObjectLayer selectedObject={adjustments.selected3DObject} />
            <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.6} minPolarAngle={Math.PI / 3} />
          </Canvas>
        </Suspense>
      </ErrorBoundary3D>
    </div>
  );
};
