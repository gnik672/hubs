/** @jsx createElementEntity */
import { createElementEntity, renderAsEntity, Ref, createRef, EntityDef, ArrayVec3 } from "../utils/jsx-entity";
import spotSrc from "../assets/images/pointer.png";
import { textureLoader } from "../utils/media-utils";
import nametagSrc from "../assets/hud/nametag.9.png";
import { BUTTON_TYPES, StaticButton3D, TextButton3D } from "./button3D";
import { ProjectionMode } from "../utils/projection-mode";
import { AlphaMode } from "../utils/create-image-mesh";
import { TextureCache } from "../utils/texture-cache";
import { degToRad, radToDeg } from "three/src/math/MathUtils";
import { FollowFov } from "../bit-components";
import { roomPropertiesReader } from "../utils/rooms-properties";

const tutorialSchema = "https://kontopoulosdm.github.io/tutorial_";

export function HelpImagePanel(slides: Array<string>, ratio: number) {
  const textRef = createRef();
  const panelRef = createRef();
  const nextRef = createRef();
  const prevRef = createRef();
  const resetRef = createRef();
  const clickRef = createRef();

  const slideEntities = [] as Array<EntityDef>;

  const prevIcon = `${roomPropertiesReader.serverURL}/assets/prev_icon.png`;
  const nextIcon = `${roomPropertiesReader.serverURL}/assets/next_icon.png`;
  const resetIcon = `${roomPropertiesReader.serverURL}/assets/reset_icon.png`;
  const clickIcon = `${roomPropertiesReader.serverURL}/assets/click_icon.png`;

  slides.forEach((slide, index) => {
    slideEntities.push(
      <entity
        name={`slide_${index}`}
        image={{
          texture: textureLoader.load(slide),
          ratio: ratio,
          projection: ProjectionMode.FLAT,
          alphaMode: AlphaMode.Blend,
          cacheKey: TextureCache.key(slide, 1)
        }}
        visible={false}
      ></entity>
    );
  });

  return (
    <entity
      name="tutorialPanel"
      floatingTextPanel={{
        textRef: textRef,
        nextRef: nextRef,
        prevRef: prevRef,
        resetRef: resetRef,
        clickRef: clickRef
      }}
      ref={panelRef}
      followFov={{ offset: [0, 0, -2] }}
      scale={[1.5, 1.5, 1.5]}
    >
      {slideEntities}

      <StaticButton3D
        ref={nextRef}
        position={[0.57, 0, 0]}
        scale={[0.3, 0.3, 0.3]}
        name={"next_button"}
        width={0.2}
        height={0.2}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={nextIcon}
      />

      <StaticButton3D
        ref={prevRef}
        position={[-0.57, 0, 0]}
        scale={[0.3, 0.3, 0.3]}
        name={"prev_button"}
        width={0.2}
        height={0.2}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={prevIcon}
      />
    </entity>
  );
}
