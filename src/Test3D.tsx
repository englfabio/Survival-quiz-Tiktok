import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

export const Test3D = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: '#22262b'}}>
      <ThreeCanvas width={width} height={height} camera={{position: [0, 1, 6], fov: 40}}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <mesh rotation={[0.4, frame * 0.03, 0]}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#f5c400" flatShading />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
