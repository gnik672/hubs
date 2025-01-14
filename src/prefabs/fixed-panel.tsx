/** @jsx createElementEntity */

import { createElementEntity, createRef, Ref, renderAsEntity } from "../utils/jsx-entity";
import nametagSrc from "../assets/hud/nametag.9.png";
import { textureLoader } from "../utils/media-utils";
import { HubsWorld } from "../app";

const panelTexture = textureLoader.load(nametagSrc);

export interface FixedPanelParams {
  pos: [number, number, number];
}

export function FixedPanel({ pos }: FixedPanelParams) {
  const panelRef = createRef();
  const textRef = createRef();
  return (
    <entity
      name="fixedPanel"
      ref={panelRef}
      slice9={{ size: [9.35, 1.95], insets: [60, 60, 60, 60], texture: panelTexture }}
      position={pos}
    >
      <entity
        name={`text`}
        position={[0, 0, 0.01]}
        ref={textRef}
        text={{
          value: "This is a test",
          color: "#ffffff",
          textAlign: "center",
          anchorX: "center",
          anchorY: "middle",
          fontSize: 0.35,
          maxWidth: 9
        }}
      />
    </entity>
  );
}
export function FixedText(pos: [number, number, number]) {
  const textRef = createRef();
  return (
    <entity
      name={`text`}
      position={pos}
      fixedTextPanel={{ textRef: textRef }}
      ref={textRef}
      text={{
        value: "",
        color: "#ffffff",
        textAlign: "center",
        anchorX: "center",
        anchorY: "middle",
        fontSize: 0.35,
        outlineColor: "ffffff",
        outlineOpacity: 1,
        outlineWidth: 0.001,
        maxWidth: 9
      }}
    />
  );
}
