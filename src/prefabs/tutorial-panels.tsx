/** @jsx createElementEntity */
import { createElementEntity, renderAsEntity, Ref, createRef, EntityDef, ArrayVec3 } from "../utils/jsx-entity";
import spotSrc from "../assets/images/pointer.png";
import { resolveMediaInfo, textureLoader } from "../utils/media-utils";
import nametagSrc from "../assets/hud/nametag.9.png";
import { BUTTON_TYPES, TextButton3D, StaticButton3D } from "./button3D";
import { ProjectionMode } from "../utils/projection-mode";
import { AlphaMode } from "../utils/create-image-mesh";
import { TextureCache } from "../utils/texture-cache";
import { degToRad, radToDeg } from "three/src/math/MathUtils";
import { FollowFov } from "../bit-components";
import { createTexture, loadTexture, loadTextureFromCache } from "../utils/load-texture";
import { createKTX2Texture } from "../utils/create-basis-texture";
import { preload } from "../utils/preload";
import { Label, roomPropertiesReader } from "../utils/rooms-properties";

const url = "https://repo.vox.lab.synelixis.com";
const prevIcon = `${url}/file/prev_icon.png`;
const nextIcon = `${url}/file/next_icon.png`;
const closeIcon = `${url}/file/close_icon.png`;
const clickIcon = `${url}/file/click_icon.png`;
const resetIcon = `${url}/file/reset_icon.png`;

export async function MovingTutorialImagePanel(
  slides: string[][][],
  cSlides: Array<string>,
  pos: ArrayVec3,
  rot: ArrayVec3,
  ratio: number,
  scale: number
) {
  const textRef = createRef();
  const panelRef = createRef();
  const nextRef = createRef();
  const prevRef = createRef();
  const resetRef = createRef();
  const clickRef = createRef();

  const rads = rot.map(deg => degToRad(deg)) as ArrayVec3;

  const [slideEntities, cSlideEntities] = await TutorialPanelInit(slides, cSlides, ratio, scale);
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
      position={pos}
      rotation={rads}
      followFov={{ offset: [0, 0, -2] }}
    >
      {slideEntities}
      {cSlideEntities}

      <StaticButton3D
        ref={resetRef}
        position={[0, -ratio - 0.1, 0.1]}
        name={"reset_button"}
        width={0.2}
        height={0.2}
        scale={[0.5, 0.5, 0.5]}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={closeIcon}
      />
      <StaticButton3D
        ref={clickRef}
        position={[0, -2, 0]}
        name={"click_button"}
        width={0.2}
        height={0.2}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={clickIcon}
        visible={false}
      />
      <StaticButton3D
        ref={prevRef}
        position={[0, -2, 0]}
        name={"prev_button"}
        width={0.2}
        height={0.2}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={prevIcon}
        visible={false}
      />
      <StaticButton3D
        visible={false}
        ref={nextRef}
        position={[0, -2, 0]}
        name={"next_button"}
        width={0.2}
        height={0.2}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={nextIcon}
      />
    </entity>
  );
}

export async function StaticTutorialImagePanel(
  slides: string[][][],
  cSlides: Array<string>,
  pos: ArrayVec3,
  rot: ArrayVec3,
  ratio: number,
  scale: number
) {
  const textRef = createRef();
  const panelRef = createRef();
  const nextRef = createRef();
  const prevRef = createRef();
  const resetRef = createRef();
  const clickRef = createRef();

  const rads = rot.map(deg => degToRad(deg)) as ArrayVec3;

  const [slideEntities, cSlideEntities] = await TutorialPanelInit(slides, cSlides, ratio, scale);

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
      position={pos}
      rotation={rads}
    >
      {slideEntities}
      {cSlideEntities}
      <entity
        name={`text`}
        position={[0, 0, -0.03]}
        ref={textRef}
        text={{
          value: "This should not be visible",
          color: "#000000",
          textAlign: "center",
          anchorX: "center",
          anchorY: "middle",
          fontSize: 0.05,
          maxWidth: 1
        }}
        visible={false}
      />
      <StaticButton3D
        ref={nextRef}
        position={[2.25, 0, 0]}
        name={"next_button"}
        width={0.2}
        height={0.2}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={nextIcon}
      />
      <StaticButton3D
        ref={prevRef}
        position={[-2.25, 0, 0]}
        name={"prev_button"}
        width={0.2}
        height={0.2}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={prevIcon}
      />
      <StaticButton3D
        ref={resetRef}
        position={[0, -1, 0.3]}
        name={"reset_button"}
        width={0.2}
        height={0.2}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={resetIcon}
      />
      <StaticButton3D
        ref={clickRef}
        position={[0, -1, 0.3]}
        name={"click_button"}
        width={0.2}
        height={0.2}
        type={BUTTON_TYPES.DEFAULT}
        ratio={1}
        image={clickIcon}
      />
    </entity>
  );
}

async function TutorialPanelInit(chapters: string[][][], congratsSlides: Array<string>, ratio: number, scale: number) {
  const slideEntities = [] as Array<EntityDef>;
  const cSlideEntities = [] as Array<EntityDef>;

  console.log(chapters);

  for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
    const chapter = chapters[chapterIndex];
    for (let slideIndex = 0; slideIndex < chapter.length; slideIndex++) {
      const slide = chapter[slideIndex][0];
      const texture = await createTexture("image/png", slide);

      console.log(`slide_${chapterIndex}_${slideIndex}`);

      const slideEntity: EntityDef = (
        <entity
          name={`slide_${chapterIndex}_${slideIndex}`}
          image={{
            texture: texture,
            ratio: ratio,
            projection: ProjectionMode.FLAT,
            alphaMode: AlphaMode.Blend,
            cacheKey: slide
          }}
          visible={false}
          scale={[scale, scale, scale]}
        ></entity>
      );

      if (chapter[slideIndex].length > 1) {
        const gifSlide = chapter[slideIndex][1];
        const gifTexture = await createTexture("image/gif", gifSlide);
        slideEntity.children.push(
          <entity
            name={`gif_slide_${chapterIndex}_${slideIndex}`}
            image={{
              texture: gifTexture,
              ratio: ratio,
              projection: ProjectionMode.FLAT,
              alphaMode: AlphaMode.Blend,
              cacheKey: slide
            }}
            visible={true}
            position={[0, 0, 0.001]}
          ></entity>
        );
      }

      slideEntities.push(slideEntity);
    }
  }

  for (let index = 0; index < congratsSlides.length; index++) {
    const cSlide = congratsSlides[index];

    const contentType = cSlide.includes(".gif") ? "image/gif" : "image/png";
    const texture = await createTexture(contentType, cSlide);
    // const { texture, cacheKey } = loadTextureFromCache(cSlide, 1);
    cSlideEntities.push(
      <entity
        name={`congrats_slide_${index}`}
        image={{
          texture: texture,
          ratio: ratio,
          projection: ProjectionMode.FLAT,
          alphaMode: AlphaMode.Blend,
          cacheKey: cSlide
        }}
        visible={false}
        scale={[scale, scale, scale]}
      ></entity>
    );
  }

  return [slideEntities, cSlideEntities];
}

export function SimpleImagePanel(item: Label) {
  const radRot = item.rotation.map(deg => degToRad(deg)) as ArrayVec3;
  return (
    <entity
      name={`name`}
      image={{
        texture: textureLoader.load(item.filename),
        ratio: item.ratio,
        projection: ProjectionMode.FLAT,
        alphaMode: AlphaMode.Blend,
        cacheKey: TextureCache.key(item.filename, 1)
      }}
      position={item.position}
      scale={[item.scale, item.scale, 1]}
      rotation={radRot}
    ></entity>
  );
}
