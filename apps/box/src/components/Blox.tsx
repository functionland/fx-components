import React, { useRef, useState } from 'react';
import { Canvas, useFrame, BoxGeometryProps } from '@react-three/fiber/native';

const Box = (props: BoxGeometryProps) => {
  const mesh = useRef(null);
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);
  useFrame(() => (mesh.current.rotation.x += 0.01));
  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? 1.5 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  );
};

export const Blox = () => {
  return (
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box position={[-1.2, 0, 0]} />
      <Box position={[1.2, 0, 0]} />
    </Canvas>
  );
};
