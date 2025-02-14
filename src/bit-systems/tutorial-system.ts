import { Object3D, Vector3 } from "three";
import { HubsWorld } from "../app";
import { Room, roomPropertiesReader, Tutorial, TutorialSlide } from "../utils/rooms-properties";
import { AElement, AScene } from "aframe";
import { ArrayVec3, renderAsEntity } from "../utils/jsx-entity";
import { MovingTutorialImagePanel, StaticTutorialImagePanel } from "../prefabs/tutorial-panels";
import { Text } from "troika-three-text";
import { CursorRaycastable, FloatingTextPanel, Interacted } from "../bit-components";
import {
  addComponent,
  defineQuery,
  enterQuery,
  entityExists,
  hasComponent,
  removeComponent,
  removeEntity
} from "bitecs";
import { oldTranslationSystem } from "./old-translation-system";
import { changeHub } from "../change-hub";
import { languageCodes } from "./localization-system";
import { popToBeginningOfHubHistory } from "../utils/history";
import { touchscreenUserBindings } from "../systems/userinput/bindings/touchscreen-user";
import { avatarDirection, avatarPos } from "./agent-system";
// import { logger } from "./logging-system";

const CONGRATS_SLIDE_COUNT = 4;
const DISTANCE_THRESH = 1.5;
const ANGLE_THRESH = 44;
const changeTime = 10000;
const floatingPanelQuery = defineQuery([FloatingTextPanel]);

interface TutorialDict {
  lobby: RoomTutorial;
  "conference room"?: RoomTutorial;
  "main area"?: RoomTutorial;
  unknown?: RoomTutorial;
  "business room"?: RoomTutorial;
  "social area"?: RoomTutorial;
}

interface TutorialChapter {
  name: string;
  agent?: boolean;
  map?: boolean;
  translation?: boolean;
  steps: Array<Step>;
  slides?: number[];
}
interface Step {
  openingFunc?: Function;
  loopFunc?: Function;
  exitFunc?: Function;
}

interface RoomTutorial {
  chapters: TutorialChapter[];
  resetFunc: Function;
  clickFunc: Function;
}

class TutorialManager {
  Ascene: AScene;
  allowed: boolean;
  wellDoneStep: boolean;
  showArrows: boolean;

  initPosition: Vector3;
  initDir: Vector3;

  chapters: Step[][];
  activeChapter: Step[];
  activeSlide: Step;
  slideIndex: number;
  chapterIndex: number;

  roomSteps: RoomTutorial;
  tutorial: Tutorial;

  panelRef: number;
  prevRef: number;
  nextRef: number;
  resetRef: number;
  clickRef: number;

  slideArray: Object3D[][];
  congratsSlides: Object3D[];
  avatarHead: Object3D;
  panelObj: Object3D;
  prevObj: Object3D;
  nextObj: Object3D;
  resetButtonObj: Object3D;
  clickButtonObj: Object3D;
  centerButtonText: Text;

  resetButtonFunc: Function;
  clickButtonFunc: Function;

  room: string;
  changeRoomID: string;

  activeTimeout: NodeJS.Timeout | null;
  redirectionTimeout: NodeJS.Timeout;

  constructor() {
    this.allowed = false;
    this.slideIndex = 0;
    this.chapterIndex = 0;
    this.onTaskToggle = this.onTaskToggle.bind(this);
    this.onClearToggle = this.onClearToggle.bind(this);
  }

  Init(reset: boolean) {
    const avatarheadElement = document.querySelector("#avatar-pov-node") as AElement;
    this.Ascene = document.querySelector("a-scene") as AScene;
    this.avatarHead = avatarheadElement.object3D;

    if (reset) {
      if (this.panelRef && entityExists(APP.world, this.panelRef)) {
        this.RemovePanel();
      }

      if (this.activeTimeout) clearTimeout(this.activeTimeout);
      if (this.redirectionTimeout) clearTimeout(this.redirectionTimeout);
    }

    if (!roomPropertiesReader.AllowsTutorial) {
      this.allowed = false;
      console.warn(`Tutorial is not allowed in this room`);
      return;
    }

    const tutorial = roomPropertiesReader.roomProps.tutorials[0];
    tutorial.name = roomPropertiesReader.roomProps.name;
    this.tutorial = tutorial;
    // this.chapters = chaptersDict[tutorial.name].chapters.map(chapter => chapter.steps);
    this.allowed = true;
    this.AddTutorialPanel(tutorial);
    this.onMicEvent = this.onMicEvent.bind(this);
  }

  Tick(world: HubsWorld) {
    if (!this.allowed) return;

    console.log(avatarPos().toArray().toString(), avatarDirection().toArray().toString());

    floatingPanelQuery(world).forEach(_ => {
      if (hasComponent(world, Interacted, this.nextRef)) this.Next();
      if (hasComponent(world, Interacted, this.prevRef)) this.Prev();
      if (hasComponent(world, Interacted, this.resetRef)) {
        this.Next();
      }
      if (hasComponent(world, Interacted, this.clickRef)) {
        this.Next(true);
      }

      if (this.activeSlide["loopFunc"]) this.activeSlide.loopFunc();
    });
  }

  async AddTutorialPanel(tutorial: Tutorial) {
    const position = tutorial.position as ArrayVec3;
    const rotation = tutorial.rotation as ArrayVec3;
    const ratio = tutorial.ratio;

    if (!Object.keys(chaptersDict).includes(tutorial.name!)) return;
    const chapters = chaptersDict[tutorial.name!]!.chapters;
    this.chapters = [];
    const slideUrls: string[][][] = [];
    const congratsUrls: string[] = [];

    chapters.forEach((chapter, _) => {
      let newRow = true;
      let includeChapter = false;
      let chapterInd: number;
      tutorial.tutorialSlides.forEach(tSlide => {
        if (tSlide.name === "congrats") congratsUrls.push(`${roomPropertiesReader.serverURL}/file/${tSlide.filename}`);
        else if (tSlide.name === chapter.name) {
          if (newRow) {
            chapterInd = slideUrls.push([]) - 1;
            newRow = false;
          }
          const ind = slideUrls[chapterInd].push([`${roomPropertiesReader.serverURL}/file/${tSlide.filename}`]) - 1;
          includeChapter = true;
          tutorial.tutorialMaterials.forEach(material => {
            if (material.name === tSlide.name && material.index === tSlide.index)
              slideUrls[chapterInd][ind].push(`${roomPropertiesReader.serverURL}/file/${material.filename}`);
          });
        }
      });

      if (includeChapter) this.chapters.push(chapter.steps);
    });

    let tutorialPanelEntity;

    if (tutorial.type === "moving")
      tutorialPanelEntity = await MovingTutorialImagePanel(slideUrls, congratsUrls, position, rotation, ratio, 2);
    else tutorialPanelEntity = await StaticTutorialImagePanel(slideUrls, congratsUrls, position, rotation, ratio, 4);

    this.panelRef = renderAsEntity(APP.world, tutorialPanelEntity);
    this.panelObj = APP.world.eid2obj.get(this.panelRef)!;
    APP.world.scene.add(this.panelObj);

    this.prevRef = FloatingTextPanel.prevRef[this.panelRef];
    this.nextRef = FloatingTextPanel.nextRef[this.panelRef];
    this.resetRef = FloatingTextPanel.resetRef[this.panelRef];
    this.clickRef = FloatingTextPanel.clickRef[this.panelRef];

    this.prevObj = APP.world.eid2obj.get(this.prevRef) as Object3D;
    this.nextObj = APP.world.eid2obj.get(this.nextRef) as Object3D;
    this.resetButtonObj = APP.world.eid2obj.get(this.resetRef) as Object3D;
    this.clickButtonObj = APP.world.eid2obj.get(this.clickRef) as Object3D;
    this.slideArray = [];

    this.chapters.forEach((chapter, chapterIndex) => {
      const ind = this.slideArray.push([]) - 1;
      for (let slideIndex = 0; slideIndex < chapter.length; slideIndex++)
        this.slideArray[ind].push(this.panelObj.getObjectByName(`slide_${chapterIndex}_${slideIndex}`)!);
    });

    this.congratsSlides = [];
    for (let i = 0; i < congratsUrls.length; i++)
      this.congratsSlides.push(this.panelObj.getObjectByName(`congrats_slide_${i}`)!);

    this.activeChapter = this.chapters[this.chapterIndex];
    this.activeSlide = this.activeChapter[this.slideIndex];
    this.showArrows = true;
    this.Ascene.addState("task");
    APP.scene!.addEventListener("task-toggle", this.onTaskToggle);
    APP.scene!.addEventListener("clear-scene", this.onClearToggle);
    this.RenderSlide();
    this.RunInitFunc();
  }

  onTaskToggle() {
    if (this.Ascene.is("task")) {
      this.panelObj.visible = false;
      this.Ascene.removeState("task");
      // logger.AddUiInteraction("task_toggle", "deactivate_task");
    } else {
      APP.scene!.emit("clear-scene");
      this.panelObj.visible = true;
      this.Ascene.addState("task");
      // logger.AddUiInteraction("task_toggle", "activate_task");
    }
  }

  onClearToggle() {
    if (this.tutorial.name === "lobby") return;
    if (this.Ascene.is("task")) {
      this.panelObj.visible = false;
      this.Ascene.removeState("task");
    }
  }

  RemovePanel() {
    APP.world.scene.remove(this.panelObj);
    [this.panelRef, this.prevRef, this.nextRef, this.panelRef].forEach(ref => {
      removeEntity(APP.world, ref!);
    });
  }

  RenderSlide(slideno: number = -1) {
    this.slideArray.forEach(chapter => {
      chapter.forEach(slide => {
        slide.visible = false;
      });
    });
    this.congratsSlides.forEach(cSlide => {
      cSlide.visible = false;
    });

    this.ToggleArrowVisibility(this.showArrows);
    APP.scene!.emit("clear-scene");
    this.Ascene.addState("task");
    if (slideno !== -1) this.congratsSlides[slideno].visible = true;
    else this.slideArray[this.chapterIndex][this.slideIndex].visible = true;
    this.panelObj.visible = true;
  }

  ClearTimeOut() {
    if (this.activeTimeout !== null) clearTimeout(this.activeTimeout);
    this.activeTimeout = null;
  }

  RunCleanupFunc() {
    if (this.activeSlide) {
      const cleanupFunc = this.activeSlide.exitFunc;
      if (cleanupFunc) cleanupFunc();
    }
  }

  Next(congratulate = false) {
    this.ClearTimeOut();
    this.RunCleanupFunc();

    if (congratulate) this.NextChapter(congratulate);
    else if (this.slideIndex === this.activeChapter.length - 1) this.NextChapter();
    else this.AddStep(1);
  }

  Prev() {
    this.ClearTimeOut();
    this.RunCleanupFunc();
    if (this.slideIndex === 0) this.ChangeChapterByIndex(this.chapterIndex - 1);
    else this.AddStep(-1);
  }

  AddStep(offset: number) {
    this.SetStep(this.slideIndex + offset);
  }

  SetStep(number: number) {
    this.slideIndex = number;
    this.activeSlide = this.activeChapter[this.slideIndex];
    this.RunInitFunc();
    this.RenderSlide();
  }

  ChangeChapter(chapter: Step[]) {
    this.activeChapter = chapter;
    this.SetStep(0);
  }

  ChangeChapterByIndex(index: number) {
    if (index === this.chapters.length || index < 0) this.chapterIndex = 0;
    else this.chapterIndex = index;
    this.ChangeChapter(this.chapters[this.chapterIndex]);
  }

  NextChapter(congratulate = false) {
    if (congratulate) this.Congratulate();
    else this.ChangeChapterByIndex(this.chapterIndex + 1);
  }

  Congratulate() {
    const randomCongrats = Math.floor(Math.random() * this.congratsSlides.length);

    this.activeSlide = {};
    this.RenderSlide(randomCongrats);
    this.ToggleArrowVisibility(false);
    this.activeTimeout = setTimeout(() => {
      this.Next();
      this.ToggleArrowVisibility(true);
    }, 1500);
  }

  RunInitFunc() {
    const initFunc = this.activeSlide["openingFunc"];
    if (initFunc) initFunc();
  }

  onMicEvent() {
    this.NextChapter();
  }

  HidePanel() {
    this.panelObj.visible = false;
    this.Ascene.removeState("task");
  }

  ToggleArrowVisibility(show: boolean = false) {
    this.prevObj.visible = show;
    this.nextObj.visible = show;
    const action = show ? addComponent : removeComponent;

    action(APP.world, CursorRaycastable, this.nextRef);
    action(APP.world, CursorRaycastable, this.prevRef);
  }
}

export const tutorialManager = new TutorialManager();

const CongratsChapter = (): Step[] => {
  return [
    {
      openingFunc: () => {
        tutorialManager.ToggleArrowVisibility(false);
        tutorialManager.activeTimeout = setTimeout(() => {
          tutorialManager.Next();
          tutorialManager.ToggleArrowVisibility(true);
        }, 1500);
      }
    }
  ];
};

const MicUnMutedChapter = (): TutorialChapter => {
  const onMuting = () => tutorialManager.Next(true);

  return {
    name: "mic_unmuted",
    steps: [
      {
        openingFunc: () => tutorialManager.Ascene.addEventListener("action_disable_mic", onMuting, { once: true }),
        exitFunc: () => tutorialManager.Ascene.removeEventListener("action_disable_mic", onMuting)
      }
    ]
  };
};

const onUnmuting = () => tutorialManager.ChangeChapter(MicUnMutedChapter().steps);

const OnMapToggle = () => {
  APP.scene!.addEventListener(
    "map-toggle",
    () => {
      tutorialManager.Next(true);
    },
    { once: true }
  );
};

const timeOutChapter: TutorialChapter = {
  name: "timeout",
  steps: [
    {
      openingFunc: () => {
        // tutorialManager.HidePanel(); //this need to be changed
        setTimeout(() => {
          // logger.AddAnnouncementInteraction("room redirection", "to conference room");

          changeHub("AxFm4cE"); ///provide correct ID in prod
        }, changeTime);
      }
    }
  ]
};

const MapPanelSteps: Array<Step> = [
  { openingFunc: () => {} },
  {
    openingFunc: () => {
      APP.scene!.addEventListener("map-toggle", OnMapToggle, { once: true });
    },
    exitFunc: () => {
      APP.scene!.removeEventListener("map-toggle", OnMapToggle);
    }
  }
];
let targetPos: Vector3;

const lobbyChapters: Array<TutorialChapter> = [
  {
    name: "welcome_1",
    steps: [
      {
        openingFunc: () => {
          tutorialManager.resetButtonObj.visible = false;
          tutorialManager.clickButtonObj.visible = false;
          tutorialManager.prevObj.visible = false;
        },
        exitFunc: () => {
          tutorialManager.prevObj.visible = true;
        }
      }
    ]
  },
  {
    name: "welcome_2",
    steps: [
      {
        openingFunc: () => {}
      }
    ]
  },
  {
    name: "click",
    steps: [
      {
        openingFunc: () => {
          tutorialManager.activeTimeout = setTimeout(() => {
            tutorialManager.clickButtonObj.visible = true;
          }, 1000);
        },
        exitFunc: () => {
          tutorialManager.clickButtonObj.visible = false;
        }
      }
    ]
  },
  {
    name: "move",
    steps: [
      {
        openingFunc: () => {}
      },
      {
        openingFunc: () => {
          tutorialManager.initPosition = tutorialManager.avatarHead.getWorldPosition(new Vector3());
        },
        loopFunc: () => {
          const currentPos = tutorialManager.avatarHead.getWorldPosition(new Vector3());
          const distance = tutorialManager.initPosition.distanceTo(currentPos.setY(tutorialManager.initPosition.y));
          if (distance >= DISTANCE_THRESH) tutorialManager.Next(true);
        }
      }
    ]
  },
  {
    name: "teleport",
    steps: [
      {
        openingFunc: () => {
          tutorialManager.initPosition = tutorialManager.avatarHead.getWorldPosition(new Vector3());
        },
        loopFunc: () => {
          const currentPos = tutorialManager.avatarHead.getWorldPosition(new Vector3());
          const distance = tutorialManager.initPosition.distanceTo(currentPos.setY(tutorialManager.initPosition.y));
          if (distance >= DISTANCE_THRESH) tutorialManager.Next(true);
        }
      }
    ]
  },
  {
    name: "turn",
    steps: [
      {
        openingFunc: () => {
          tutorialManager.initDir = tutorialManager.avatarHead.getWorldDirection(new Vector3());
        },
        loopFunc: () => {
          const orientation = tutorialManager.avatarHead.getWorldDirection(new Vector3());
          const radAngle = tutorialManager.initDir.angleTo(orientation.setY(tutorialManager.initDir.y).normalize());
          const angle = THREE.MathUtils.radToDeg(radAngle);
          if (angle >= ANGLE_THRESH) tutorialManager.Next(true);
        }
      }
    ]
  },
  {
    name: "speak",
    agent: true,
    steps: [
      {
        openingFunc: () => {}
      },
      {
        openingFunc: () => {
          tutorialManager.Ascene.addEventListener("action_enable_mic", onUnmuting, { once: true });
        },
        exitFunc: () => {
          tutorialManager.Ascene.removeEventListener("action_enable_mic", onUnmuting);
        }
      }
    ]
  },
  {
    name: "panel",
    agent: true,
    steps: MapPanelSteps
  },

  {
    name: "finish",

    steps: [
      {
        openingFunc: () => {
          tutorialManager.resetButtonObj.visible = true;
          tutorialManager.nextObj.visible = false;
        },
        exitFunc: () => {
          tutorialManager.resetButtonObj.visible = false;
          tutorialManager.nextObj.visible = true;
        }
      }
    ]
  }
];

const tradeshowChapters: Array<TutorialChapter> = [
  {
    name: "welcome",
    steps: [
      {
        openingFunc: () => {
          tutorialManager.resetButtonObj.visible = true;
          tutorialManager.ToggleArrowVisibility(false);
          tutorialManager.activeTimeout = setTimeout(() => {
            tutorialManager.HidePanel();
          }, 30000);
        }
      }
    ]
  },
  {
    name: "welcome",
    steps: [
      {
        openingFunc: () => {
          tutorialManager.ToggleArrowVisibility(false);
          tutorialManager.resetButtonObj.visible = true;
          tutorialManager.activeTimeout = setTimeout(() => {
            tutorialManager.HidePanel();
          }, 30000);
        }
      }
    ]
  }
];

const conferenceChapters: Array<TutorialChapter> = [
  {
    name: "welcome",
    steps: [
      {
        openingFunc: () => {
          tutorialManager.resetButtonObj.visible = true;
          tutorialManager.ToggleArrowVisibility(false);
          tutorialManager.activeTimeout = setTimeout(() => {
            tutorialManager.HidePanel();
          }, changeTime);
        }
      }
    ]
  }
];

const chaptersDict: TutorialDict = {
  "conference room": {
    chapters: conferenceChapters,
    resetFunc: () => {
      tutorialManager.HidePanel();
      tutorialManager.resetButtonObj.visible = false;
    },
    clickFunc: () => {}
  },
  lobby: {
    chapters: lobbyChapters,
    resetFunc: () => {
      tutorialManager.Next();
      tutorialManager.resetButtonObj.visible = false;
    },
    clickFunc: () => {
      tutorialManager.Next(true);
      tutorialManager.clickButtonObj.visible = false;
    }
  },
  "main area": {
    chapters: tradeshowChapters,
    resetFunc: () => {
      tutorialManager.HidePanel();
      tutorialManager.resetButtonObj.visible = false;
    },
    clickFunc: () => {}
  }
};
