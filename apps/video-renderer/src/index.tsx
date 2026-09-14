import { Composition, registerRoot } from "remotion";
import { EmployeePlusVideo } from "./EmployeePlusVideo";
import { DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from "./script";

export const RemotionRoot = () => (
  <Composition
    id="EmployeePlusVideo"
    component={EmployeePlusVideo}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ voiceFile: undefined }}
  />
);

registerRoot(RemotionRoot);
