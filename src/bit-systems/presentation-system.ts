import { AxesHelper, Color, Object3D, Vector3 } from "three";
import { roomPropertiesReader, Translation } from "../utils/rooms-properties";
import { AElement } from "aframe";
import { renderAsEntity } from "../utils/jsx-entity";
import { FixedText } from "../prefabs/fixed-panel";
import { degToRad } from "three/src/math/MathUtils";
import { removeEntity } from "bitecs";
import { audioModules, textModule } from "../utils/ml-adapters";
import { COMPONENT_ENDPOINTS } from "../utils/component-types";
import { UpdateFixedPanelText, UpdatePanelColor } from "./fixed-panel-system";
import { languageCodes, voxLanugages } from "./localization-system";
import HubChannel from "../utils/hub-channel";

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
  properties: Translation;
  mylanguage: voxLanugages | null;
  active: boolean;
  questionQueue: string[];
  raisedHand: boolean;
  canUnmute: boolean;
  presenterColor: Color;
  audienceColor: Color;
  devCounter: number;
  handTimeout: NodeJS.Timeout;

  constructor() {
    this.presenter = "";
    this.presenterColor = new Color(255, 255, 255);
    this.audienceColor = new Color(255, 255, 0);
    this.allowed = false;
    this.presenterState = false;
    this.active = false;
    this.devCounter = 0;
    this.raisedHand = false;
    this.canUnmute = false;
    this.questionQueue = [];

    this.ToggleHand = this.ToggleHand.bind(this);
    this.ToggleSubtitles = this.ToggleSubtitles.bind(this);
    this.OnToggleHand = this.OnToggleHand.bind(this);
  }

  Init(reset: boolean) {
    this.allowed = roomPropertiesReader.AllowPresentation;

    if (reset) {
      APP.scene!.removeEventListener("toggle_translation", this.ToggleSubtitles);
      APP.scene!.removeEventListener("ask-toggle", this.OnToggleHand);
    }

    if (!this.allowed) {
      console.warn("Room not in presentation mode");
      return;
    }

    APP.scene!.addEventListener("toggle_translation", this.ToggleSubtitles);
    APP.scene!.addEventListener("ask-toggle", this.OnToggleHand);
    this.peerId = APP.dialog._clientId;
    this.properties = roomPropertiesReader.roomProps.translations[0];
    this.presenterBorders = this.properties.type_data;
    this.avatarObj = (document.querySelector("#avatar-pov-node")! as AElement).object3D;
    this.mylanguage = "english";

    APP.scene!.emit("toggle_translation");

    raiseTime = Date.now();
    lowerTime = Date.now();
    respondTime = Date.now();

    APP.dialog.enableMicrophone(false);
  }

  Tick() {
    if (!this.allowed || !APP.scene!.is("entered")) return;

    this.CheckPresenterState();
    if (this.presenterState) this.PresenterActions(); // TODO: remove this after integrating trans model
  }

  ToggleSubtitles() {
    if (this.active) {
      APP.scene!.removeState("translation");
      if (this.panelObj) this.HidePresenterPanel();
    } else {
      APP.scene!.addState("translation");
      if (this.presenter && this.presenter !== this.peerId) this.ShowPresenterPanel();
    }
    this.active = APP.scene!.is("translation");
  }

  ProccessRaisedHandRequest(from: string, raised: boolean) {
    const includes = this.questionQueue.includes(from);
    if (!raised && includes) {
      this.questionQueue.splice(this.questionQueue.indexOf(from), 1);
      console.log(`removing ${from} from q&a list`, this.questionQueue);
    } else if (raised && !includes) {
      this.questionQueue.push(from);
      console.log(`adding ${from} to q&a list`, this.questionQueue);
    }
  }

  RespondToHandRequest(result: boolean, peer: string) {
    // if (Date.now() - respondTime > 3000) {

    console.log(peer, this.questionQueue);

    if (this.questionQueue.includes(peer)) {
      APP.dialog.RespondToHandRequest(true, peer);
      this.questionQueue.splice(this.questionQueue.indexOf(peer), 1);
    }

    // }
  }

  OnToggleHand() {
    this.ToggleHand();
  }

  CountMuteSec() {
    if (this.handTimeout !== null) {
      clearTimeout(this.handTimeout);
    }

    this.handTimeout = setTimeout(() => {
      if (this.raisedHand) this.LowerHand();
    }, 15000);
  }

  ToggleHand(raise: boolean | null = null) {
    if (!this.allowed || this.presenterState) return;

    let shouldRaise = raise !== null ? raise : !this.raisedHand;

    if (shouldRaise === this.raisedHand) return;

    if (shouldRaise) this.RaiseHand();
    else this.LowerHand();
  }

  RaiseHand() {
    APP.hubChannel!.raiseHand();
    this.raisedHand = true;
    if (!APP.scene!.is("handraise")) APP.scene!.addState("handraise");
    APP.dialog.sendHandRequest(this.raisedHand);
  }

  LowerHand() {
    APP.hubChannel!.lowerHand();
    if (this.canUnmute) this.canUnmute = false;
    this.raisedHand = false;
    if (APP.scene!.is("handraise")) APP.scene!.removeState("handraise");
    APP.dialog.sendHandRequest(this.raisedHand);
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
      this.questionQueue = [];
      if (this.presenterState) lastLoggedTime = Date.now();

      this.presenterState = isPresenter;
      this.canUnmute = isPresenter;
      // APP.scene!.addEventListener("toggle_translation", this.ToggleHand);
    }
  }

  UpdatePresenterInfo(newPresenter: string) {
    if (this.presenter === newPresenter) return;
    this.presenter = newPresenter;
    console.log(`New presenter: ${newPresenter ? newPresenter : "None"} `);
    if (this.presenter && this.presenter !== this.peerId && !this.panelObj) this.ShowPresenterPanel();
    else if (!this.presenter && this.panelObj) this.HidePresenterPanel();
  }

  UpdateLanguage(newLanguage: voxLanugages) {
    this.mylanguage = newLanguage;
  }

  ShowPresenterPanel() {
    if (this.panelObj) return;
    const pos = this.properties.panel_data;
    const eid = renderAsEntity(APP.world, FixedText(pos));
    this.panelObj = APP.world.eid2obj.get(eid) as Object3D;
    this.panelObj.rotation.set(0, degToRad(180), 0);
    this.panelRef = eid;
    APP.world.scene.add(this.panelObj);
    APP.scene!.addState("presenter_panel");
  }

  HidePresenterPanel() {
    APP.world.scene.remove(this.panelObj!);
    removeEntity(APP.world, this.panelRef!);
    this.panelObj = null;
    this.panelRef = null;
    APP.scene!.removeState("presenter_panel");
  }

  async ProccessAvailableTranscription(transcription: string, language: voxLanugages, producer: string) {
    if (!this.allowed || !this.active) return;
    console.log(
      `available transcription: "${transcription}" with language code: "${language}" from producer: "${producer}"`
    );
    const translation = await this.InferenceTranscription(transcription, language);
    if (translation) this.UpdateTranslation(translation, producer);
  }

  async InferenceTranscription(transcription: string, senderLanugage: voxLanugages) {
    try {
      const inferenceParams = {
        source_language: languageCodes[senderLanugage],
        target_language: languageCodes[this.mylanguage!],
        return_transcription: "false"
      };

      const translateRespone = await textModule(COMPONENT_ENDPOINTS.TRANSLATE_TEXT, transcription, inferenceParams);
      return translateRespone.data?.translations![0]!;
    } catch (error) {
      console.log(`fetch aborted`);
      return transcription;
    }
  }

  UpdateTranslation(data: string, producer: string) {
    let newColor = producer === this.presenter ? this.presenterColor : this.audienceColor;
    if (!this.panelObj) this.ShowPresenterPanel();
    UpdatePanelColor(newColor);
    UpdateFixedPanelText(data);
  }

  PresenterActions() {
    const currentTime = Date.now();
    console.log(this.devCounter, lastLoggedTime);

    if (currentTime - lastLoggedTime >= 3000) {
      this.devCounter++;
      const randomEnglishPhrase = generateRandomSentence();
      console.log(`sending phrase: ${randomEnglishPhrase}`);
      lastLoggedTime = currentTime;
      APP.dialog.SendTranscription(randomEnglishPhrase, this.mylanguage);
    }
  }

  AudienceActions() {
    const currentTime = Date.now();

    // if (currentTime - lastLoggedTime >= 3000) {
    //   const randomEnglishPhrase = generateRandomSentence();
    //   lastLoggedTime = currentTime;
    //   APP.dialog.SendTranscription(randomEnglishPhrase, this.mylanguage);
    // }

    if (currentTime - raiseTime >= 10000 && raiseFlag) {
      this.ToggleHand(true);
      raiseFlag = false;
    }
    // if (currentTime - lowerTime >= 20000 && lowerFlag) {
    //   APP.dialog.sendHandRequest(false);
    //   lowerFlag = false;
    // }
  }
}

export const presentationSystem = new PresentationSystem();

let lastLoggedTime = 0;
let raiseTime = 0;
let lowerTime = 0;
let respondTime = 0;
let raiseFlag = true;
let lowerFlag = true;
export function generateRandomSentence() {
  const subjects = ["The cat", "A dog", "The teacher", "A student", "The scientist", "The musician"];
  const verbs = ["runs", "jumps", "plays", "studies", "teaches", "sings"];
  const objects = ["in the park", "on the stage", "at school", "in the lab", "with a guitar", "under the tree"];

  const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
  const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
  const randomObject = objects[Math.floor(Math.random() * objects.length)];

  return `${randomSubject} ${randomVerb} ${randomObject}.`;
}
