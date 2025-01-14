/** @jsx createElementEntity */
import { createElementEntity, renderAsEntity, Ref, createRef, EntityDef, ArrayVec3 } from "../utils/jsx-entity";
import spotSrc from "../assets/images/pointer.png";
import { textureLoader } from "../utils/media-utils";
import { BUTTON_TYPES, StaticButton3D, TextButton3D } from "./button3D";
import { ProjectionMode } from "../utils/projection-mode";
import { AlphaMode } from "../utils/create-image-mesh";
import { TextureCache } from "../utils/texture-cache";
import { HelpSlide, roomPropertiesReader } from "../utils/rooms-properties";

export function HelpImagePanel(slides: HelpSlide[]) {
  const textRef = createRef();
  const panelRef = createRef();
  const nextRef = createRef();
  const prevRef = createRef();
  const resetRef = createRef();
  const clickRef = createRef();

  const slideEntities = [] as Array<EntityDef>;

  const prevIcon = `${roomPropertiesReader.serverURL}/file/prev_icon.png`;
  const nextIcon = `${roomPropertiesReader.serverURL}/file/next_icon.png`;

  slides.forEach((slide, index) => {
    const slideUrl = `${roomPropertiesReader.serverURL}/file/${slide.filename}`;
    slideEntities.push(
      <entity
        name={`slide_${index}`}
        image={{
          texture: textureLoader.load(slideUrl),
          ratio: slide.ratio,
          projection: ProjectionMode.FLAT,
          alphaMode: AlphaMode.Blend,
          cacheKey: TextureCache.key(slideUrl, 1)
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
