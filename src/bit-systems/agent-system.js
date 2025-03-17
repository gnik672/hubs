import { addComponent, defineQuery, enterQuery, hasComponent, removeComponent, removeEntity } from "bitecs";
import { Agent, CursorRaycastable, Interacted } from "../bit-components";
import { PermissionStatus } from "../utils/media-devices-utils";
import {
  audioModules,
  intentionModule,
  dsResponseModule,
  vlModule,
  textModule,
  RecordQuestion,
  stopRecording
} from "../utils/ml-adapters";
import { COMPONENT_ENDPOINTS } from "../utils/component-types";
import { AgentEntity } from "../prefabs/agent";
import { SnapDepthPOV, SnapPOV } from "../utils/vlm-adapters";
import { navSystem } from "./routing-system";
import { renderAsEntity } from "../utils/jsx-entity";
import { UpdatePanelSize, GetTextSize, GetObjSize } from "../utils/interactive-panels";
import { agentDialogs } from "../utils/localization";
import { Logger } from "../utils/logging_systems";
import { Quaternion, Vector3 } from "three";
import { roomPropertiesReader } from "../utils/rooms-properties";
import { GetObjectives, GetResolved, GetValids, MakeObjectiveResolved } from "./progress-tracker";
import { paths } from "../systems/userinput/paths";
import { languageCodes, selectedLanguage } from "./localization-system";

const agentQuery = defineQuery([Agent]);
const enterAgentQuery = enterQuery(agentQuery);
const PANEL_PADDING = 0.05;
let trargetCounter = 0;
const MAX_PANEL_LENGTH = 0.5;

function clicked(eid) {
  return hasComponent(APP.world, Interacted, eid);
}

export function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

export function AgentSystem(t, userinput) {
  enterAgentQuery(APP.world).forEach(eid => {
    virtualAgent.Setup(eid);
  });
  agentQuery(APP.world).forEach(_ => {
    virtualAgent.ButtonInteractions();
    virtualAgent.Animations(t);
    virtualAgent.UpdatePanel(userinput);
    virtualAgent.agentParent.obj.updateWorldMatrix();
  });
}

export class objElement {
  constructor() {
    this.eid = null;
    this.obj = null;
    this.size = null;
  }

  update(eid) {
    this.eid = eid;
    this.obj = APP.world.eid2obj.get(eid);
  }
}

class textElement extends objElement {
  constructor() {
    super();
    this.value = null;
  }

  set text(message) {
    this.value = message;
    this.obj.text = message;
    this.obj.updateMatrix();
  }
}
class SuggestionElement extends textElement {
  constructor() {
    super();
    this.intention = null;
    this.index = -1;
  }
}

export default class VirtualAgent {
  constructor() {
    this.allowed = null;

    this.agent = new objElement();
    this.nextArrow = new objElement();
    this.prevArrow = new objElement();
    this.infoPanel = new objElement();
    this.snapButton = new objElement();
    this.suggestionL = new objElement();
    this.suggestionR = new objElement();
    this.clearButton = new objElement();
    this.agentParent = new objElement();

    this.panel = new objElement();
    this.displayedText = new textElement();
    this.suggLText = new SuggestionElement();
    this.suggRText = new SuggestionElement();

    this.textArray = [];
    this.diplayedSenteceIndex = null;
    this.clippingPlaneUp = null;
    this.clippingPlaneDown = null;

    this.currentOccasion = null;
    this.waitingForResponse = null;

    this.micStatus = false;
    this.loadingObj = null;
    this.isProccessing = false;
    this.isListening = false;
    this.successResult = false;
    this.listeners = new Map();
    this.onClear = this.onClear.bind(this);
    this.UpdatePlanes = this.UpdatePanel.bind(this);
    this.onToggle = this.onToggle.bind(this);
    this.setMicStatus = this.setMicStatus.bind(this);
    this.OnDisplaytextUpdate = this.OnDisplaytextUpdate.bind(this);

    this.occasions = {
      greetings: ["greetings"],
      success: ["success", "anythingElse"],
      cleared: ["anythingElse"],
      error: ["error"]
    };
  }

  Init(reset) {
    if (reset && this.allowed) {
      APP.scene.removeEventListener("agent-toggle", this.onToggle);
      APP.scene.removeEventListener("clear-scene", this.onClear);
      this.Remove();
    }

    if (!roomPropertiesReader.AllowsAgent) {
      this.allowed = false;
      console.warn("Virtual Agent is not enabled in this room");
      return;
    }

    this.allowed = true;

    APP.scene.addEventListener("agent-toggle", this.onToggle);
    APP.scene.addEventListener("clear-scene", this.onClear);
    this.navProperties = roomPropertiesReader.navProps;

    this.Instantiate();
  }

  Enable() {
    this.displayedText.obj.addEventListener("synccomplete", this.OnDisplaytextUpdate);
    this.suggLText.obj.addEventListener("synccomplete", this.listeners.get(this.suggLText));
    this.suggRText.obj.addEventListener("synccomplete", this.listeners.get(this.suggRText));

    this.UpdateWithRandomPhrase("greetings");
    APP.dialog.on("mic-state-changed", this.setMicStatus);
    APP.scene.addState("agent");

    this.FetchSuggestions();
    this.ToggleRays(true);
    this.agent.obj.position.copy(this.AgentInitialPosition);
    this.agent.obj.rotation.set(0, 0, 0);
    this.agentParent.obj.visible = true;
    this.agentParent.obj.updateWorldMatrix();
  }

  FetchSuggestions() {
    const types = [];
    const texts = [this.suggLText, this.suggRText];
    const objs = [this.suggestionL.obj, this.suggestionR.obj];

    objs.forEach(obj => {
      obj.visible = true;
      obj.updateMatrix();
    });

    GetObjectives().forEach((objective, index) => {
      const valids = GetValids();
      const resolved = GetResolved();
      if (valids[index] && !resolved[index]) {
        if (types.length === 2 || (types.length === 1 && types[0] === objective.type)) return;

        types.push(objective.type);

        texts[types.length - 1].text = objective.value;
        texts[types.length - 1].intention = objective.type;
        texts[types.length - 1].index = index;
      }
    });

    objs.forEach((obj, index) => {
      if (index >= types.length) {
        obj.visible = false;
        obj.updateMatrix();
      }
    });
  }

  Disable() {
    this.displayedText.obj.removeEventListener("synccomplete", this.OnDisplaytextUpdate);
    this.suggLText.obj.removeEventListener("synccomplete", this.listeners.get(this.suggLText));
    this.suggRText.obj.removeEventListener("synccomplete", this.listeners.get(this.suggRText));
    APP.dialog.off("mic-state-changed", this.setMicStatus);
    APP.scene.removeState("agent");
    this.agentParent.obj.visible = false;
    this.agentParent.obj.position.set(100, 100, 100);
    this.agentParent.obj.updateWorldMatrix();
    this.ToggleRays(false);
  }

  ToggleRays(show) {
    const action = show ? addComponent : removeComponent;
    action(APP.world, CursorRaycastable, this.agent.eid);
    action(APP.world, CursorRaycastable, this.clearButton.eid);
    action(APP.world, CursorRaycastable, this.nextArrow.eid);
    action(APP.world, CursorRaycastable, this.prevArrow.eid);
    action(APP.world, CursorRaycastable, this.panel.eid);
    action(APP.world, CursorRaycastable, this.displayedText.eid);
    action(APP.world, CursorRaycastable, this.agentParent.eid);
    action(APP.world, CursorRaycastable, this.infoPanel.eid);
    if (this.suggLText.eid) action(APP.world, CursorRaycastable, this.suggLText.eid);
    if (this.suggRText.eid) action(APP.world, CursorRaycastable, this.suggRText.eid);
    if (this.suggestionL.eid) action(APP.world, CursorRaycastable, this.suggestionL.eid);
    if (this.suggestionR.eid) action(APP.world, CursorRaycastable, this.suggestionR.eid);
  }

  Remove() {
    if (APP.scene.is("agent")) this.Disable;
    removeEntity(APP.world, this.agentParent.eid);
    removeEntity(APP.world, this.agent.eid);
    APP.scene.removeState("agent");
    APP.scene.remove(this.agentParent.obj);
  }

  Instantiate() {
    if (APP.scene.is("agent")) this.Remove();
    const eid = renderAsEntity(APP.world, AgentEntity());
    const obj = APP.world.eid2obj.get(eid);
    APP.world.scene.add(obj);
    this.agentParent.update(eid);
  }

  Setup(agentEid) {
    this.agent.update(agentEid);
    this.nextArrow.update(Agent.nextRef[agentEid]);
    this.prevArrow.update(Agent.prevRef[agentEid]);
    this.infoPanel.update(Agent.micRef[agentEid]);
    this.clearButton.update(Agent.navRef[agentEid]);
    this.panel.update(Agent.panelRef[agentEid]);
    this.displayedText.update(Agent.textRef[agentEid]);
    this.snapButton.update(Agent.snapRef[agentEid]);
    this.suggestionL.update(Agent.suggestionLRef[agentEid]);
    this.suggestionR.update(Agent.suggestionRRef[agentEid]);
    this.suggLText.obj = this.suggestionL.obj.getObjectByName(`${this.suggestionL.obj.name} Label`);
    this.suggRText.obj = this.suggestionR.obj.getObjectByName(`${this.suggestionR.obj.name} Label`);

    this.isProccessing = false;
    this.isListening = false;
    this.successResult = false;
    this.micStatus = false;
    this.waitingForResponse = false;
    APP.mediaDevicesManager.micEnabled = false;
    this.AgentInitialPosition = this.agent.obj.position.clone();
    // this.agentParent.obj.visible = false;
    // this.agentParent.obj.updateWorldMatrix();

    const suggestionTextSyncHandler = (textObj, panelElem) => {
      return () => {
        const size = GetTextSize(textObj);
        size[0] += 2 * PANEL_PADDING;
        size[1] += 2 * PANEL_PADDING;
        panelElem.size = size;
        UpdatePanelSize(panelElem.eid, size);
      };
    };

    this.listeners.set(this.suggLText, suggestionTextSyncHandler(this.suggLText.obj, this.suggestionL));
    this.listeners.set(this.suggRText, suggestionTextSyncHandler(this.suggRText.obj, this.suggestionR));
    this.AddAnimationDots();
    this.clippingPlaneUp = new THREE.Plane(new Vector3(0, -1, 0), 0);
    this.clippingPlaneDown = new THREE.Plane(new Vector3(0, 1, 0), 0);
    this.displayedText.obj.material.clippingPlanes = [this.clippingPlaneUp, this.clippingPlaneDown];
    this.Disable();
  }

  UpdatePanel(userinput) {
    if (!this.clippingPlaneUp || !this.clippingPlaneDown || !this.panel.obj) return;

    const panelSize = this.panel.size || GetObjSize(this.panel.obj);
    const textSize = GetTextSize(this.displayedText.obj);
    const worldQuaternion = this.panel.obj.getWorldQuaternion(new Quaternion());
    const yGlobal = new Vector3(0, 1, 0).applyQuaternion(worldQuaternion).normalize();
    const worldPosition = this.panel.obj.getWorldPosition(new Vector3());
    const umidPoint = new Vector3().addVectors(
      worldPosition,
      yGlobal.clone().multiplyScalar(MAX_PANEL_LENGTH / 2 - PANEL_PADDING)
    );
    const dmidPoint = new Vector3().addVectors(
      worldPosition,
      yGlobal.clone().multiplyScalar(-MAX_PANEL_LENGTH / 2 + PANEL_PADDING)
    );

    this.clippingPlaneUp.constant = umidPoint.y;
    this.clippingPlaneDown.constant = -dmidPoint.y;
    const movement = userinput.get(paths.actions.cursor.right.scrollPanel)
      ? userinput.get(paths.actions.cursor.right.scrollPanel)
      : userinput.get(paths.actions.cursor.left.scrollPanel)
      ? userinput.get(paths.actions.cursor.left.scrollPanel)
      : 0;

    const initPos = this.displayedText.obj.position;
    const upBarrier = textSize[1] / 2 - panelSize[1] / 2 + PANEL_PADDING;

    if ((initPos.y <= upBarrier && movement > 0) || (initPos.y >= -upBarrier && movement < 0)) {
      this.displayedText.obj.position.setY(initPos.y + movement);
      this.displayedText.obj.updateMatrix();
    }
  }

  onClear() {
    if (APP.scene.is("agent")) {
      this.Disable();
    }
  }

  onToggle() {
    if (!APP.scene.is("agent")) {
      APP.scene.emit("clear-scene");
      this.Enable();
      // logger.AddUiInteraction("agent_toggle", "activate_agent");
    } else {
      this.Disable();
      // logger.AddUiInteraction("agent_toggle", "deactivate_agent");
    }
  }

  OnDisplaytextUpdate() {
    const size = GetTextSize(this.displayedText.obj);
    const arrowSize = GetObjSize(this.nextArrow.obj);
    const clearSize = GetObjSize(this.clearButton.obj);

    const panelSize = size.map(sizeElem => sizeElem + 2 * PANEL_PADDING);
    if (panelSize[1] > MAX_PANEL_LENGTH) panelSize[1] = MAX_PANEL_LENGTH;

    UpdatePanelSize(this.panel.eid, panelSize);
    this.panel.size = panelSize;

    if (this.successResult) {
      this.clearButton.obj.position.copy(new Vector3(0, -((panelSize[1] + clearSize[1]) / 2 + PANEL_PADDING), 0));
      this.clearButton.obj.visible = true;
    } else this.clearButton.obj.visible = false;
    this.clearButton.obj.updateMatrix();

    const offset = size[1] / 2 - panelSize[1] / 2 + PANEL_PADDING;
    const initPos = this.displayedText.obj.position.clone();

    this.nextArrow.obj.position.copy(new Vector3((panelSize[0] + arrowSize[0]) / 2 + PANEL_PADDING, 0, 0));
    this.prevArrow.obj.position.copy(new Vector3(-((panelSize[0] + arrowSize[0]) / 2 + PANEL_PADDING), 0, 0));
    this.displayedText.obj.position.copy(new Vector3(initPos.x, -offset, initPos.z));
    this.displayedText.obj.updateMatrix();
    this.nextArrow.obj.updateMatrix();
    this.prevArrow.obj.updateMatrix();

    this.agentParent.obj.visible = true;
    this.panel.obj.visible = true;
    this.agentParent.obj.updateWorldMatrix();
  }

  UpdateTextArray(newTextArray) {
    this.textArray = newTextArray;
    this.slideIndex = 0;
    this.RenderSlide();
  }

  SegmentText(text) {
    const sentences = text.split("\n");
    return sentences.filter(sentence => {
      return sentence !== "" && sentence !== " ";
    });
  }

  NextSentence() {
    this.slideIndex += 1;
    this.nextArrow.obj.visible = this.slideIndex !== this.textArray.length - 1;
    this.RenderSlide();
  }

  PrevSentence() {
    this.slideIndex -= 1;
    this.prevArrow.obj.visible = this.slideIndex !== 0;
    this.RenderSlide();
  }

  RenderSlide() {
    this.nextArrow.obj.visible = this.slideIndex !== this.textArray.length - 1;
    this.prevArrow.obj.visible = this.slideIndex !== 0;
    this.displayedText.obj.text = this.textArray[this.slideIndex];
    this.agentParent.obj.updateWorldMatrix();
  }

  setMicStatus() {
    const permissionsGranted = APP.mediaDevicesManager.getPermissionsStatus("microphone") === PermissionStatus.GRANTED;
    const changedMicStatus = this.micStatus !== (permissionsGranted && APP.mediaDevicesManager.isMicEnabled);

    trargetCounter++;
    if (changedMicStatus) {
      this.micStatus = permissionsGranted && APP.mediaDevicesManager.isMicEnabled;
      if (this.micStatus && !this.waitingForResponse) {
        this.AskAgent();
      } else {
        stopRecording();
        // navSystem.CreateVLDataset();
      }
    }
  }

  async ButtonInteractions() {
    if (clicked(this.clearButton.eid)) {
      navSystem.StopNavigating();
      this.successResult = false;
      this.UpdateWithRandomPhrase("cleared");
    }

    if (clicked(this.nextArrow.eid)) {
      this.NextSentence();
    }
    if (clicked(this.prevArrow.eid)) {
      this.PrevSentence();
    }
    if (clicked(this.suggestionL.eid)) {
      this.AskAgent({
        query: this.suggLText.value,
        intention: this.suggLText.intention,
        index: this.suggRText.index
      }).then(() => {
        this.FetchSuggestions();
      });
    }
    if (clicked(this.suggestionR.eid)) {
      this.AskAgent({
        query: this.suggRText.value,
        intention: this.suggRText.intention,
        index: this.suggRText.index
      }).then(() => {
        this.FetchSuggestions();
      });
    }
  }

  AddAnimationDots() {
    this.infoPanel.obj.children[0].text = "";
    const dotGeometry = new THREE.CircleBufferGeometry(0.02, 12);
    this.loadingObj = new THREE.Group();
    this.loadingObj.position.set(0, 0, 0.01);
    for (let i = 0; i < 5; i++) {
      const dot = new THREE.Mesh(
        dotGeometry,
        new THREE.MeshBasicMaterial({ transparent: true, color: 0x000000, depthWrite: false })
      );
      dot.position.x = i * 0.07 - 0.14;
      this.loadingObj.add(dot);
    }
    this.infoPanel.obj.add(this.loadingObj);
  }

  Animations(t) {
    this.loadingObj.visible = true;
    if (this.isListening) this.ListeningAnimation(t);
    else if (this.isProccessing) this.ProccessingAnimation(t);
    else this.loadingObj.visible = false;
  }

  ProccessingAnimation(t) {
    let typingAnimTime = 0;
    typingAnimTime = t;
    this.loadingObj.lookAt(avatarPos());
    this.loadingObj.traverse(o => {
      if (o.material) {
        o.material.opacity = (Math.sin(typingAnimTime / 150) + 1) / 2;
        typingAnimTime -= 150;
      }
    });
  }

  ListeningAnimation(t) {
    let typingAnimTime = 0;
    typingAnimTime = t * 0.8;
    this.loadingObj.lookAt(avatarPos());
    this.loadingObj.traverse(o => {
      if (o.material) o.material.opacity = (Math.sin(typingAnimTime / 150) + 1) / 2;
    });
  }

  async AskAgent({ query, intention, index } = { query: "", intention: "", index: -1 }) {
    this.panel.obj.visible = false;
    this.infoPanel.obj.visible = true;
    this.waitingForResponse = true;
    this.successResult = false;
    this.ToggleRays(false);

    try {
      const langCode = languageCodes[selectedLanguage] || "en";
      this.isProccessing = true;
      let nmtResponse;
      if (!query) {
        const recordedQuestion = await RecordQuestion(); // question recording
        const nmtAudioParams = { source_language: langCode, target_language: "en", return_transcription: "true" };
        nmtResponse = await audioModules(
          COMPONENT_ENDPOINTS.TRANSLATE_AUDIO_FILES,
          recordedQuestion.data.file,
          nmtAudioParams
        );
        // sending to ASR/NMT
      } else nmtResponse = query;

      let intentResponse;
      let destination;

      if (!!intention) intentResponse = intention;
      else {
        const int = await intentionModule(nmtResponse);
        destination = int.destination;
        intentResponse = int.intention;
      }

      let voxyResponse;
      try {
        if (intentResponse.includes("navigation")) {
          try {
            const instPath = navSystem.GetInstructionsGraphics(destination);
            if (instPath.length > 0) navSystem.RenderCues(instPath);
            voxyResponse = await vlModule(destination, COMPONENT_ENDPOINTS.LOCAL_VLM);
          } catch (error) {
            console.error({ vlModuleError: error.message });
            voxyResponse = "Follow the green line to reach your destination";
          }
        } else {
          voxyResponse = await dsResponseModule(nmtResponse, intentResponse, "");
        }
      } catch (error) {
        console.error({ dsError: error.message });
        voxyResponse = this.GetRandomPhrase("error");
      }

      if (langCode === "en") {
        this.UpdateTextArray([voxyResponse]); //print result if language is english
      } else {
        const nmtTextParams = { source_language: "en", target_language: langCode };
        const translatedResponse = await textModule(COMPONENT_ENDPOINTS.TRANSLATE_TEXT, sentence, nmtTextParams); // translate if language is not english
        this.UpdateTextArray([translatedResponse]); // print the translated response
      }

      if (
        (intentResponse.includes("navigation") && navSystem.dest.active) ||
        intentResponse.includes("program_info") ||
        intentResponse.includes("trade_show")
      ) {
        this.successResult = true;
      } else {
        this.successResult = false;
      }

      if (this.successResult && index >= 0) {
        MakeObjectiveResolved(index, true);
      }
    } catch (error) {
      console.log({ askAgentError: error.message });
      this.UpdateWithRandomPhrase("error"); // display error message on error
    } finally {
      this.isProccessing = false;
      this.infoPanel.obj.visible = false;
      this.panel.obj.visible = true;
      this.waitingForResponse = false;
      this.ToggleRays(true);
    }
  }

  DatasetCreate() {
    const destNames = ["conference room", "business room", "social area", "booth 1", "booth 2", "booth 3", "booth 4"];
    const randomInt = Math.floor(Math.random() * destNames.length);
    const navigation = navSystem.GetInstructions("business room");
    navigation.destination = destNames[randomInt];
    navSystem.RenderCues(navigation);
    return navigation;
  }

  HandleArrows(renderArrows) {
    this.nextArrow.obj.visible = renderArrows;
    this.prevArrow.obj.visible = renderArrows;
  }

  GetRandomPhrase(occasion) {
    const phrases = [];

    this.occasions[occasion].forEach(occasionKey => {
      const availablePhrases = agentDialogs[occasionKey][selectedLanguage];

      const randomIndex = Math.floor(Math.random() * availablePhrases.length);

      phrases.push(availablePhrases[randomIndex]);
    });

    return phrases.length === 1 ? [phrases[0]] : [phrases.join(" ")];
  }

  UpdateWithRandomPhrase(occasion) {
    this.UpdateTextArray([this.GetRandomPhrase(occasion)]);
  }

  GetTypingObj() {
    return typingObj;
  }

  get exists() {
    return !!this.agent.eid;
  }
}

export const virtualAgent = new VirtualAgent();
export const agentLogger = new Logger();

export function avatarPos() {
  const avatarPos = new THREE.Vector3();
  const avatarPovObj = document.querySelector("#avatar-pov-node").object3D;
  avatarPovObj.getWorldPosition(avatarPos);
  return avatarPos;
}

export function avatarDirection() {
  const avatarPovObj = document.querySelector("#avatar-pov-node").object3D;
  // const avatarPovObj = document.querySelector("#avatar-rig").object3D;
  const playerForward = new THREE.Vector3();
  avatarPovObj.getWorldDirection(playerForward);
  return playerForward.multiplyScalar(-1);
}
export function avatarIgnoreYDirection() {
  const avatarPovObj = document.querySelector("#avatar-pov-node").object3D;
  // const avatarPovObj = document.querySelector("#avatar-rig").object3D;
  const playerForward = new THREE.Vector3();
  avatarPovObj.getWorldDirection(playerForward);

  playerForward.setY(0);
  return playerForward.multiplyScalar(-1);
}
