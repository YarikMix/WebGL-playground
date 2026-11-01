import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { sampleFlight, samplePose, type AuthFlight } from '../auth/flight';
import AuthPlanet from './AuthPlanet';
import FirstFrame from './FirstFrame';

interface AuthSceneProps {
  flight: AuthFlight;
  motion: boolean;
  switchRef: RefObject<HTMLButtonElement | null>;
  onArrive: (startedAt: number) => void;
  onReady: () => void;
}

export default function AuthScene({ flight, motion, switchRef, onArrive, onReady }: AuthSceneProps) {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const arrived = useRef<number | null>(null);
  const size = useThree(s => s.size);
  const gl = useThree(s => s.gl);
  const point = useMemo(() => new THREE.Vector3(), []);
  const stars = useMemo(() => {
    let seed = 17;
    const rnd = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    const positions = new Float32Array(1100 * 3);
    for (let i = 0; i < 1100; i++) positions.set([(rnd() - .5) * 100, (rnd() - .5) * 65, -4 - rnd() * 90], i * 3);
    return positions;
  }, []);

  useFrame(() => {
    const cam = camera.current;
    if (!cam) return;
    const sample = sampleFlight(flight, performance.now());
    const pose = samplePose(sample.progress);
    cam.position.set(...pose.eye);
    cam.lookAt(...pose.lookAt);
    cam.updateMatrixWorld();
    if (sample.done && flight.startedAt !== null && arrived.current !== flight.startedAt) {
      arrived.current = flight.startedAt;
      onArrive(flight.startedAt);
    }
    const button = switchRef.current;
    if (!button || flight.startedAt !== null) return;
    const other = flight.mode === 'login' ? 8 : -8;
    point.set(other, 0, 0).project(cam);
    const canvasRect = gl.domElement.getBoundingClientRect();
    const parentRect = button.offsetParent?.getBoundingClientRect();
    const diameter = 1.65 / (cam.position.distanceTo(new THREE.Vector3(other, 0, 0)) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) * size.height;
    button.style.left = `${canvasRect.left - (parentRect?.left ?? 0) + (point.x * .5 + .5) * size.width}px`;
    button.style.top = `${canvasRect.top - (parentRect?.top ?? 0) + (-point.y * .5 + .5) * size.height}px`;
    button.style.width = button.style.height = `${Math.max(44, diameter)}px`;
  });

  return <>
    <PerspectiveCamera ref={camera} makeDefault fov={size.width < 700 ? 82 : 44} near={.1} far={200} />
    <AuthPlanet position={[-8, 0, 0]} cool={false} motion={motion} />
    <AuthPlanet position={[8, 0, 0]} cool motion={motion} />
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[stars, 3]} /></bufferGeometry>
      <pointsMaterial color="#d8ceff" size={.065} sizeAttenuation transparent opacity={.68} depthWrite={false} />
    </points>
    <FirstFrame onReady={onReady} />
  </>;
}
