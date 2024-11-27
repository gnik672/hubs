import { Object3D, Vector3 } from "three";
import { roomPropertiesReader, TranslationProperties } from "../utils/rooms-properties";
import { AElement } from "aframe";
import { renderAsEntity } from "../utils/jsx-entity";
import { FixedText } from "../prefabs/fixed-panel";
import { degToRad } from "three/src/math/MathUtils";
import { removeEntity } from "bitecs";
import { audioModules, textModule } from "../utils/ml-adapters";
import { COMPONENT_ENDPOINTS } from "../utils/component-types";
import { UpdateFixedPanelText } from "./fixed-panel-system";
import { languageCodes, voxLanugages } from "./localization-system";

export class PresentationSystem {
  presenterState: boolean;
  presenter: string;
  peerId: string;
  presenterLanguage: voxLanugages | null;
  avatarPos: Vector3;
  avatarObj: Object3D;
  panelObj: Object3D | null;
  panelRef: number | null;
  allowed: boolean;
  presenterBorders: number[];
  properties: TranslationProperties;
  mylanguage: voxLanugages | null;
  active: boolean;

  constructor() {
    this.presenter = "";
    this.allowed = false;
    this.presenterState = false;
    this.active = false;

    this.ToggleSubtitles = this.ToggleSubtitles.bind(this);
  }

  Init() {
    this.allowed =
      roomPropertiesReader.AllowTrans && roomPropertiesReader.transProps.conversation!.type === "presentation";

    if (!this.allowed) {
      console.warn("Room not in presentation mode");
      return;
    }

    APP.scene!.addEventListener("toggle_translation", this.ToggleSubtitles);
    this.peerId = APP.dialog._clientId;
    this.properties = roomPropertiesReader.transProps;
    this.presenterBorders = this.properties.conversation?.data!;
    this.avatarObj = (document.querySelector("#avatar-pov-node")! as AElement).object3D;
    this.mylanguage = "english";

    APP.scene!.emit("toggle_translation");
  }

  Tick() {
    if (!this.allowed || !APP.scene!.is("entered")) return;

    this.CheckPresenterState();
    if (this.presenterState) this.PresenterActions();
  }

  ToggleSubtitles() {
    if (this.active) {
      APP.scene!.removeState("translation");
      if (this.panelObj) this.HidePresenterPanel();
    } else {
      APP.scene!.addState("translation");
    }
    this.active = APP.scene!.is("translation");
  }

  CheckPresenterState() {
    const avatarPos = this.avatarObj.getWorldPosition(new Vector3());
    const isPresenter =
      avatarPos.x > this.presenterBorders[0] &&
      avatarPos.x < this.presenterBorders[1] &&
      avatarPos.z > this.presenterBorders[2] &&
      avatarPos.z < this.presenterBorders[3];

    if (isPresenter != this.presenterState) {
      APP.dialog.sendPresenterInfo(isPresenter);
      this.UpdatePresenterInfo(isPresenter ? this.peerId : "");
    }

    this.presenterState = isPresenter;

    if (this.presenterState) {
      console.log("i am the presenter");
      lastLoggedTime = Date.now();
    }
  }

  UpdatePresenterInfo(newPresenter: string) {
    this.presenter = newPresenter;
    console.log("Updating presenter info");
  }

  UpdateLanguage(newLanguage: voxLanugages) {
    this.mylanguage = newLanguage;
  }

  ShowPresenterPanel() {
    const pos = this.properties.panel!.data!;
    const eid = renderAsEntity(APP.world, FixedText({ pos }));
    this.panelObj = APP.world.eid2obj.get(eid) as Object3D;
    this.panelObj.rotation.set(0, degToRad(180), 0);
    console.log("rendering panel");
    this.panelRef = eid;
    APP.world.scene.add(this.panelObj);
    APP.scene!.addState("presenter_panel");
  }

  HidePresenterPanel() {
    APP.world.scene.remove(this.panelObj!);
    removeEntity(APP.world, this.panelRef!);
    console.log("hiding panel");
    this.panelObj = null;
    this.panelRef = null;
    APP.scene!.removeState("presenter_panel");
  }

  ProccessAvailableTranscription(transcription: string, language: voxLanugages, producer: string) {
    if (!this.allowed) return;
    console.log(
      `available transcription: "${transcription}" with language code: "${language}" from producer: "${producer}"`
    );
    if (!this.panelObj) return;
    if (producer === this.presenter) this.InferenceTranscription(transcription, language);
  }

  async InferenceTranscription(transcription: string, senderLanugage: voxLanugages) {
    try {
      const inferenceParams = {
        source_language: languageCodes[senderLanugage],
        target_language: languageCodes[this.mylanguage!],
        return_transcription: "false"
      };

      const translateRespone = await textModule(COMPONENT_ENDPOINTS.TRANSLATE_TEXT, transcription, inferenceParams);
      const translation = translateRespone.data?.translations![0]!;
      UpdateFixedPanelText(translation);
    } catch (error) {
      console.log(`fetch aborted`);
    }
  }

  PresenterActions() {
    const currentTime = Date.now();

    if (currentTime - lastLoggedTime >= 3000) {
      const randomEnglishPhrase = generateRandomSentence();
      lastLoggedTime = currentTime;
      APP.dialog.SendTranscription(randomEnglishPhrase, this.mylanguage);
    }
  }
}

export const presentationSystem = new PresentationSystem();

let lastLoggedTime = 0;
export function generateRandomSentence() {
  const subjects = ["The cat", "A dog", "The teacher", "A student", "The scientist", "The musician"];
  const verbs = ["runs", "jumps", "plays", "studies", "teaches", "sings"];
  const objects = ["in the park", "on the stage", "at school", "in the lab", "with a guitar", "under the tree"];

  const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
  const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
  const randomObject = objects[Math.floor(Math.random() * objects.length)];

  return `${randomSubject} ${randomVerb} ${randomObject}.`;
}
