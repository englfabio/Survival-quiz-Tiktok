import {Composition} from 'remotion';
import {Test3D} from './Test3D';

export const RemotionRoot = () => {
  return (
    <>
      <Composition id="Test3D" component={Test3D} durationInFrames={60} fps={30} width={1080} height={1920} />
    </>
  );
};
