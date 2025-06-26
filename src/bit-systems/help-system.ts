import { AScene } from "aframe";
import { Object3D } from "three";
import { renderAsEntity } from "../utils/jsx-entity";
import { HelpImagePanel } from "../prefabs/help-panel";
import { HelpSlide, roomPropertiesReader } from "../utils/rooms-properties";
import { FloatingTextPanel, Interacted } from "../bit-components";
import { hasComponent, removeEntity } from "bitecs";
import { HubsWorld } from "../app";
import { Logger } from "../utils/logging_systems";
import { logger } from "./logging-system";
class HelpButton {
  Ascene: AScene;
  slidesCount: number;
  panelRef: number;
  prevRef: number;
  nextRef: number;
  clickRef: number;
  activeSlideIndex: number;

  panelObj: Object3D;
  prevObj: Object3D;
  nextObj: Object3D;
  testObj: Object3D;

  slideLinks: Array<string>;
  slidesObjs: Array<Object3D>;
  slides: HelpSlide[];

  constructor() {
    this.activeSlideIndex = 0;
    this.onToggle = this.onToggle.bind(this);
    this.onClear = this.onClear.bind(this);
  }

  NextSlide() {
    this.SetSlide(this.activeSlideIndex + 1);
  }

  PrevSlide() {
    this.SetSlide(this.activeSlideIndex - 1);
  }

  SetSlide(newIndex: number) {
    this.activeSlideIndex = newIndex;

    this.nextObj.visible = true;
    this.prevObj.visible = true;

    if (newIndex === this.slidesObjs.length - 1) this.nextObj.visible = false;
    if (newIndex === 0) this.prevObj.visible = false;
    this.RenderActiveSlide();
  }

  RenderActiveSlide() {
    this.slidesObjs.forEach(slide => {
      slide.visible = false;
    });
    this.slidesObjs[this.activeSlideIndex].visible = true;
  }

  Init(reset: boolean) {
    console.log(`hello local`);
    if (reset) {
      APP.scene!.removeEventListener("help-toggle", this.onToggle);
      APP.scene!.removeEventListener("clear-scene", this.onClear);
    }

    const helpSlides = roomPropertiesReader.roomProps.help;

    this.slidesCount = helpSlides.length;
    this.slideLinks = [];
    this.slidesObjs = [];
    this.slides = helpSlides;

    APP.scene!.addEventListener("help-toggle", this.onToggle);
    APP.scene!.addEventListener("clear-scene", this.onClear);
  }

  RenderPanel() {
    this.panelRef = renderAsEntity(APP.world, HelpImagePanel(this.slides));
    this.panelObj = APP.world.eid2obj.get(this.panelRef)!;
    APP.world.scene.add(this.panelObj);

    this.prevRef = FloatingTextPanel.prevRef[this.panelRef];
    this.nextRef = FloatingTextPanel.nextRef[this.panelRef];
    this.clickRef = FloatingTextPanel.clickRef[this.panelRef];

    this.prevObj = APP.world.eid2obj.get(this.prevRef)!;
    this.nextObj = APP.world.eid2obj.get(this.nextRef)!;

    for (let i = 0; i < this.slides.length; i++) this.slidesObjs.push(this.panelObj.getObjectByName(`slide_${i}`)!);

    (APP.scene as AScene).addState("help");

    this.SetSlide(0);
  }

  RemovePanel() {
    removeEntity(APP.world, this.panelRef);
    APP.world.scene.remove(this.panelObj);
    this.slidesObjs = [];

    (APP.scene as AScene).removeState("help");
  }

  Tick(world: HubsWorld) {
    if (hasComponent(world, Interacted, this.nextRef)) this.NextSlide();
    if (hasComponent(world, Interacted, this.prevRef)) this.PrevSlide();
  }

  onToggle() {
    if ((APP.scene as AScene).is("help")) {
      this.RemovePanel();
       logger.AddUiInteraction("help_toggle", "deactivate_help");
    } else {
      (APP.scene as AScene).emit("clear-scene");
       logger.AddUiInteraction("help_toggle", "activate_help");
      this.RenderPanel();
    }
  }

  onClear() {
    if ((APP.scene as AScene).is("help")) {
      this.RemovePanel();
    }
  }
}

export const helpButton = new HelpButton();
