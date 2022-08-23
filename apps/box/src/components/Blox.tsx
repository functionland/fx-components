import React, { useMemo, useRef, useState } from 'react';
import {
  Canvas,
  useFrame,
  MeshProps,
  Vector3,
  useThree,
  Euler,
} from '@react-three/fiber/native';
import * as THREE from 'three';
import { FxTheme, useFxTheme } from '@functionland/component-library';
import { mockTowerData as data } from '../api/tower';
import { a, useSpring } from '@react-spring/three';

interface TowerMeshProps extends MeshProps {
  towerId?: string;
  defaultColor: string;
  selectedColor?: string;
  selectedTowerId: string | null;
  setSelectedTowerId: (value: string | null) => void;
}

const TowerMesh = ({
  towerId,
  defaultColor,
  selectedColor,
  selectedTowerId,
  setSelectedTowerId,
  position,
  ...rest
}: TowerMeshProps) => {
  const isSelected = selectedTowerId === towerId;
  const color = isSelected ? selectedColor : defaultColor;
  const noSelectedTower = selectedTowerId === null;
  const opacity = noSelectedTower || isSelected || !towerId ? 1 : 0.25;
  const height = !towerId ? 0 : 6;
  const y = !towerId ? -3 : 0;

  const onClick = (event) => {
    event.stopPropagation();
    if (!towerId) return;
    else if (noSelectedTower) setSelectedTowerId(towerId);
    else setSelectedTowerId(null);
  };

  return (
    <mesh {...rest} position={[position[0], y, position[2]]}>
      <boxGeometry args={[1.5, height, 1.5]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} />
      <mesh position={[0, 3, 0]} onClick={onClick}>
        <boxGeometry args={[1.55, 0, 1.55]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
      {!!towerId && (
        <mesh position={[0, 3.001, 0]}>
          <boxGeometry args={[1.5, 0, 1.5]} />
          <meshStandardMaterial
            color={selectedColor}
            transparent
            opacity={noSelectedTower ? 1 : 0}
          />
        </mesh>
      )}
    </mesh>
  );
};

const BackgroundMesh = (props: MeshProps) => {
  const { camera } = useThree();
  return (
    <mesh {...props} rotation={camera.rotation} position={[-2, -2, -2]}>
      <planeGeometry args={[100, 100, 100]} />
      <meshStandardMaterial transparent opacity={0} />
    </mesh>
  );
};

const positions: Vector3[] = [
  [0, 0, 0],
  [-2, 0, 0],
  [2, 0, 0],
  [0, 0, -2],
  [0, 0, 2],
  [-2, 0, -2],
  [2, 0, -2],
  [-2, 0, 2],
  [2, 0, 2],
];

interface BloxMeshProps {
  colors: FxTheme['colors'];
}

const BloxMesh = ({ colors }: BloxMeshProps) => {
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const isPanning = useRef(false);
  const rotationRef = useRef(null);
  const offset = useRef({ x: 0, y: 0 });
  const euler = useMemo(() => new THREE.Euler(), []);
  const [spring, set] = useSpring(() => ({
    config: {
      mass: 1,
      tension: 100,
      friction: 25,
    },
    rotation: [0, 0, 0],
  }));
  const lazySusan = useRef(true);
  const towers = useMemo(
    () =>
      positions.map((position, i) => ({
        towerId: data[i]?.id,
        position: position,
        defaultColor: colors.backgroundPrimary,
        selectedColor: data[i]?.settings.color,
        selectedTowerId,
        setSelectedTowerId,
      })),
    [colors, selectedTowerId]
  );

  useFrame(
    () => lazySusan.current && (rotationRef.current.rotation.y -= 0.005)
  );

  const handleTowerDeselection = () => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    setSelectedTowerId(null);
  };

  const onPointerDown = (event) => {
    const { offsetX: x, offsetY: y } = event.changedTouches[0];
    offset.current = { x, y };
    euler.y = rotationRef.current.rotation.y;
    euler.x = rotationRef.current.rotation.x;
    set.start({ rotation: euler.toArray().slice(0, 3), immediate: true });
    if (lazySusan.current) lazySusan.current = false;
  };

  const onPointerMove = (event) => {
    const { offsetX: x, offsetY: y } = event.changedTouches[0];
    const speed = 0.75;
    const dy = offset.current.y - y;
    const dx = offset.current.x - x;

    isPanning.current = true;
    offset.current = { x, y };
    euler.y -= THREE.MathUtils.degToRad(dx * speed);
    euler.x -= THREE.MathUtils.degToRad(dy * speed);
    euler.x = THREE.MathUtils.clamp(euler.x, 0, Math.PI / 6);
    set.start({ rotation: euler.toArray().slice(0, 3) });
  };

  return (
    <>
      <BackgroundMesh
        onClick={handleTowerDeselection}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      />
      <a.group ref={rotationRef} rotation={spring.rotation as unknown as Euler}>
        {towers.map((props, i) => (
          <TowerMesh key={`tower-${i}`} {...props} />
        ))}
      </a.group>
    </>
  );
};

export const Blox = () => {
  const { colors } = useFxTheme();

  return (
    <Canvas camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 7, 10] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 1.5, 5]} />
      <pointLight position={[5, 1.5, 10]} intensity={0.5} />
      <BloxMesh colors={colors} />
    </Canvas>
  );
};
