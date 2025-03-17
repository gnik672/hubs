/** @jsx createElementEntity */

import { createElementEntity, renderAsEntity, Ref, createRef, EntityDef } from "../utils/jsx-entity";
import nametagSrc from "../assets/hud/nametag.9.png";
import { textureLoader } from "../utils/media-utils";
import { TextButton3D, BUTTON_TYPES, StaticButton3D } from "./button3D";
import { IconButton } from "./icon-button";

const panelTexture = textureLoader.load(nametagSrc);

export interface PanelParams {
  text: Array<string>;
  panelRef: Ref;
  micRef: Ref;
  nextRef?: Ref;
  prevRef?: Ref;
  snapRef?: Ref;
  maxSlideCount?: number;
  textRef?: Ref;
}

export interface SimplePanelParams {
  panelRef: Ref;
  textRef: Ref;
  listenRef: Ref;
  navRef: Ref;
}

interface InteractivePanelParams {
  panelRef: Ref;
  textRef: Ref;
  dotsRef: Ref;
  clearRef: Ref;
  nextRef: Ref;
  prevRef: Ref;
  suggestionR: Ref;
  suggestionL: Ref;
}

export function AgentPanel({ text, panelRef, nextRef, prevRef, micRef, snapRef, maxSlideCount }: PanelParams) {
  const buttonScale = [0.4, 0.4, 0.4];
  const buttonHeight = 0.2;
  let slidesArray = [];

  for (let i = 0; i < maxSlideCount!; i++) {
    slidesArray.push(
      <entity
        name={`slide ${i}`}
        panelIndex={{ index: i }}
        position={[0, 0, 0.01]}
        text={{
          value: "",
          color: "#000000",
          textAlign: "center",
          anchorX: "center",
          anchorY: "middle",
          fontSize: 0.05,
          maxWidth: 0.5
        }}
      />
    );
  }

  return (
    <entity>
      <entity
        name="agentPanel"
        ref={panelRef}
        rotation={[0, 0, 0]}
        slice9={{ size: [0.6, 0.3], insets: [64, 66, 64, 66], texture: panelTexture }}
        position={[0, -0.35, 0.1]}
        scale={[1.0, 1.0, 1.0]}
      >
        {slidesArray}
      </entity>
      <TextButton3D
        ref={prevRef}
        scale={[buttonScale[0], buttonScale[1], buttonScale[2]]}
        type={BUTTON_TYPES.DEFAULT}
        position={[-0.3, 0, 0.03]}
        width={buttonHeight}
        height={buttonHeight}
        text={"<"}
      />

      <StaticButton3D
        ref={nextRef}
        position={[0.3, 0, 0.03]}
        scale={[buttonScale[0], buttonScale[1], buttonScale[2]]}
        name={"next_button"}
        type={BUTTON_TYPES.DEFAULT}
        width={buttonHeight}
        height={buttonHeight}
        ratio={1}
        image={"nextIcon"}
      />

      {/* <IconButton
        ref={nextRef}
        scale={[buttonScale[0], buttonScale[1], buttonScale[2]]}
        type={BUTTON_TYPES.DEFAULT}
        position={[0.3, 0, 0.03]}
        width={buttonHeight}
        height={buttonHeight}
      /> */}
      <IconButton
        ref={micRef}
        scale={[buttonScale[0], buttonScale[1], buttonScale[2]]}
        type={BUTTON_TYPES.MIC}
        position={[0.25, 0.15, 0]}
        width={buttonHeight}
        height={buttonHeight}
      />

      <IconButton
        ref={snapRef}
        scale={[buttonScale[0], buttonScale[1], buttonScale[2]]}
        type={BUTTON_TYPES.CAMERA}
        position={[-0.25, 0.15, 0]}
        width={buttonHeight}
        height={buttonHeight}
      />
    </entity>
  );
}

export function SimplePanel({ panelRef, textRef, listenRef, navRef }: SimplePanelParams) {
  const buttonScale = [0.4, 0.4, 0.4];
  const buttonHeight = 0.2;
  return (
    <entity>
      <entity
        name="agentPanel"
        ref={panelRef}
        slice9={{ size: [0.8, 0.6], insets: [64, 66, 64, 66], texture: panelTexture }}
        position={[0, -0.3, 0.3]}
      >
        <entity
          name={`text`}
          position={[0, 0, 0.01]}
          ref={textRef}
          text={{
            value: "Simple panel: This should never be visible",
            color: "#000000",
            textAlign: "center",
            anchorX: "center",
            anchorY: "middle",
            fontSize: 0.05,
            maxWidth: 1
          }}
        />

        <TextButton3D
          ref={navRef}
          scale={[buttonScale[0], buttonScale[1], buttonScale[2]]}
          width={0.5}
          height={buttonHeight}
          type={BUTTON_TYPES.DEFAULT}
          text={"Clear"}
          visible={false}
        />
      </entity>

      <TextButton3D
        ref={listenRef}
        scale={[buttonScale[0], buttonScale[1], buttonScale[2]]}
        position={[0, -0.3, 0.3]}
        width={0.5}
        height={buttonHeight}
        type={BUTTON_TYPES.DEFAULT}
        text={"Ask"}
      />
    </entity>
  );
}

export function InteractivePanel({
  panelRef,
  clearRef,
  dotsRef,
  nextRef,
  prevRef,
  textRef,
  suggestionR,
  suggestionL
}: InteractivePanelParams) {
  const buttonScale = [0.4, 0.4, 0.4];
  const buttonHeight = 0.2;

  return (
    <entity>
      <entity
        name={`panel`}
        ref={panelRef}
        slice9={{ size: [0.8, 0.6], insets: [64, 66, 64, 66], texture: panelTexture }}
        position={[0, -0.3, 0.3]}
      >
        <StaticButton3D
          ref={clearRef}
          position={[0.7, 0, 0]}
          scale={[buttonScale[0], buttonScale[1], buttonScale[2]]}
          name="reset"
          type={BUTTON_TYPES.DEFAULT}
          width={buttonHeight}
          height={buttonHeight}
          ratio={1}
          image={"resetIcon"}
        />
        <StaticButton3D
          ref={nextRef}
          position={[0.7, 0, 0]}
          scale={[0.5, 0.5, 0.5]}
          name="next"
          type={BUTTON_TYPES.DEFAULT}
          width={buttonHeight}
          height={buttonHeight}
          ratio={1}
          image={"nextIcon"}
        />

        <StaticButton3D
          ref={prevRef}
          position={[0.7, 0, 0]}
          scale={[0.5, 0.5, 0.5]}
          name="prev"
          type={BUTTON_TYPES.DEFAULT}
          width={buttonHeight}
          height={buttonHeight}
          ratio={1}
          image={"prevIcon"}
        />

        <entity
          name={`text`}
          position={[0, 0, 0.01]}
          ref={textRef}
          text={{
            value: "Interactive panel: This should never be visible",
            color: "#000000",
            textAlign: "center",
            anchorX: "center",
            anchorY: "middle",
            fontSize: 0.05,
            maxWidth: 1
          }}
        />

        <TextButton3D
          name="suggestion_l"
          text="Suggestion Left: This should never be visible"
          ref={suggestionL}
          position={[-0.4, 0.4, 0.01]}
          width={1}
          height={1}
          maxWidth={0.4}
          textSize={0.04}
          type={BUTTON_TYPES.ACTION}
        />
        <TextButton3D
          name="suggestion_r"
          text="Suggestion Right: This should never be visible"
          ref={suggestionR}
          position={[0.4, 0.4, 0.01]}
          width={1}
          height={1}
          maxWidth={0.4}
          textSize={0.04}
          type={BUTTON_TYPES.ACTION}
        />

        {/* <entity
          name={`text`}
          position={[0.3, -1, 0.01]}
          ref={suggestionR}
          text={{
            value: "Suggestion Right: This should never be visible",
            color: "#000000",
            textAlign: "center",
            anchorX: "center",
            anchorY: "middle",
            fontSize: 0.05,
            maxWidth: 0.4
          }}
        /> */}
      </entity>

      <TextButton3D
        name="dots"
        ref={dotsRef}
        scale={[buttonScale[0], buttonScale[1], buttonScale[2]]}
        position={[0, -0.3, 0.3]}
        width={0.5}
        height={buttonHeight}
        type={BUTTON_TYPES.DEFAULT}
        visible={false}
        text={"this should not be visible"}
      />
    </entity>
  );
}
