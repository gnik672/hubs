import { addComponent, defineQuery, enterQuery, hasComponent, removeComponent, removeEntity } from "bitecs";
import {
  Agent,
  CursorRaycastable,
  HeldHandLeft,
  HeldHandRight,
  HeldRemoteLeft,
  HeldRemoteRight,
  Hidden,
  Interacted,
  LookAtUser
} from "../bit-components";
import { UpdateTextSystem, lowerIndex, raiseIndex } from "./agent-slideshow-system";
import { PermissionStatus } from "../utils/media-devices-utils";
import { stageUpdate } from "../systems/single-action-button-system";
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
import { oldTranslationSystem } from "./old-translation-system";
import { UpdatePanelSize, GetTextSize, GetObjSize } from "../utils/interactive-panels";
import { agentDialogs } from "../utils/localization";
import { Logger } from "../utils/logging_systems";
import { AxesHelper, BoxHelper, Mesh, Plane, Quaternion, Vector3 } from "three";
import { roomPropertiesReader } from "../utils/rooms-properties";
import { GetObjectives, GetResolved, GetValids, MakeObjectiveResolved, RoomObjectives } from "./progress-tracker";
import { off } from "process";
import { paths } from "../systems/userinput/paths";
import { labelOrganizer } from "./room-labels-system";
import { languageCodes, selectedLanguage } from "./localization-system";

const agentQuery = defineQuery([Agent]);
const enterAgentQuery = enterQuery(agentQuery);
const PANEL_PADDING = 0.05;
let trargetCounter = 0;
const MAX_PANEL_LENGTH = 0.5;

// const suggestions = [
//   { type: "navigation", value: "How can I go to the conference room?", done: false },
//   { type: "navigation", value: "How can I go to the business room?", done: false },
//   { type: "navigation", value: "How can I go to the booth 1?", done: false },
//   { type: "navigation", value: "How can I go to the social area?", done: false },
//   { type: "summarization", value: "Summarize the content of the main presentation", done: false },
//   { type: "tradeshows", value: "΅Who will I find in the tradeshows?", done: false },
//   { type: "schedule", value: "Who is presenting in the morning?", done: false }
// ];

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
    virtualAgent.agent.obj.updateMatrix();
    virtualAgent.UpdatePanel(userinput);
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
  }

  FetchSuggestions() {
    const types = [];
    const texts = [this.suggLText, this.suggRText];
    const objs = [this.suggestionL.obj, this.suggestionR.obj];

    objs.forEach(obj => {
      obj.visible = true;
    });

    GetObjectives().forEach((objective, index) => {
      const valids = GetValids();
      const resolved = GetResolved();
      console.log(valids, resolved, index);
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

    console.log(this.suggestionL, this.suggestionR, this.suggLText, this.suggRText); //done working

    this.isProccessing = false;
    this.isListening = false;
    this.successResult = false;
    this.micStatus = false;
    this.waitingForResponse = false;
    APP.mediaDevicesManager.micEnabled = false;
    this.agent.obj.visible = true;
    this.infoPanel.obj.visible = false;
    this.agentParent.obj.visible = false;

    this.AgentInitialPosition = this.agent.obj.position.clone();

    const suggestionTextSyncHandler = (textObj, panelElem) => {
      return () => {
        console.log(`sugg button update`);
        const size = GetTextSize(textObj);
        size[0] += 2 * PANEL_PADDING;
        size[1] += 2 * PANEL_PADDING;
        UpdatePanelSize(panelElem.eid, size);
        panelElem.size = size;
      };
    };

    this.listeners.set(this.suggLText, suggestionTextSyncHandler(this.suggLText.obj, this.suggestionL));
    this.listeners.set(this.suggRText, suggestionTextSyncHandler(this.suggRText.obj, this.suggestionR));

    this.AddAnimationDots();
    this.ToggleRays(false);

    this.clippingPlaneUp = new THREE.Plane(new Vector3(0, -1, 0), 0);
    this.clippingPlaneDown = new THREE.Plane(new Vector3(0, 1, 0), 0);
    this.displayedText.obj.material.clippingPlanes = [this.clippingPlaneUp, this.clippingPlaneDown];
  }

  UpdatePanel(userinput) {
    if (!this.clippingPlaneUp || !this.clippingPlaneDown || !this.panel.obj) return;

    const panelSize = this.panel.size || GetObjSize(this.panel.obj);
    const textSize = GetTextSize(this.displayedText.obj);

    const worldQuaternion = this.panel.obj.getWorldQuaternion(new Quaternion());

    // const xGlobal = new Vector3(1, 0, 0).applyQuaternion(worldQuaternion).normalize();
    const yGlobal = new Vector3(0, 1, 0).applyQuaternion(worldQuaternion).normalize();
    // const zGlobal = new Vector3(0, 0, 1).applyQuaternion(worldQuaternion).normalize();
    const worldPosition = this.panel.obj.getWorldPosition(new Vector3());

    const umidPoint = new Vector3().addVectors(
      worldPosition,
      yGlobal.clone().multiplyScalar(MAX_PANEL_LENGTH / 2 - PANEL_PADDING)
    );
    const dmidPoint = new Vector3().addVectors(
      worldPosition,
      yGlobal.clone().multiplyScalar(-MAX_PANEL_LENGTH / 2 + PANEL_PADDING)
    );

    // const ulPoint = new Vector3().addVectors(umidPoint, xGlobal.clone().multiplyScalar(-MAX_PANEL_LENGTH / 2));
    // const urPoint = new Vector3().addVectors(umidPoint, xGlobal.clone().multiplyScalar(MAX_PANEL_LENGTH / 2));
    // const dlPoint = new Vector3().addVectors(dmidPoint, xGlobal.clone().multiplyScalar(-MAX_PANEL_LENGTH / 2));
    // const drPoint = new Vector3().addVectors(dmidPoint, xGlobal.clone().multiplyScalar(MAX_PANEL_LENGTH / 2));

    // const upThirdPoint = new Vector3().addVectors(umidPoint, zGlobal.clone());
    // const downThirdPoint = new Vector3().addVectors(dmidPoint, zGlobal.clone());

    // this.clippingPlaneUp.setFromCoplanarPoints(ulPoint, urPoint, upThirdPoint);
    // this.clippingPlaneDown.setFromCoplanarPoints(drPoint, dlPoint, downThirdPoint);

    this.clippingPlaneUp.constant = umidPoint.y;
    this.clippingPlaneDown.constant = -dmidPoint.y;

    const movement = userinput.get(paths.actions.cursor.right.scrollPanel)
      ? userinput.get(paths.actions.cursor.right.scrollPanel)
      : 0;

    const initPos = this.displayedText.obj.position;
    const downBarrier = panelSize[1] / 2 - textSize[1] / 2 - PANEL_PADDING;
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
    if (panelSize[1] > MAX_PANEL_LENGTH) {
      panelSize[1] = MAX_PANEL_LENGTH;
      console.log(`resizing panel to max allowed width`);
    }

    UpdatePanelSize(this.panel.eid, panelSize);
    this.panel.size = panelSize;

    if (this.successResult) {
      this.clearButton.obj.position.copy(new Vector3(0, -((panelSize[1] + clearSize[1]) / 2 + PANEL_PADDING), 0));
      this.clearButton.obj.updateMatrix();
      this.clearButton.obj.visible = true;
    } else {
      this.clearButton.obj.visible = false;
    }

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
    // this.setMicStatus();

    // const agentDataObj = [];
    try {
      const langCode = languageCodes[selectedLanguage] || "en";
      this.isProccessing = true;
      let nmtResponse;
      if (!query) {
        const recordedQuestion = await RecordQuestion(); // question recording
        const nmtAudioParams = { source_language: langCode, target_language: "en", return_transcription: "true" };
        nmtResponse = (
          await audioModules(COMPONENT_ENDPOINTS.TRANSLATE_AUDIO_FILES, recordedQuestion.data.file, nmtAudioParams)
        ).data.translations[0]; // sending to ASR/NMT
      } else nmtResponse = query;

      const intentResponse = !!intention ? intention : (await intentionModule(nmtResponse)).data.intent; // retrieving intention
      const dsResponse = (await dsResponseModule(nmtResponse, intentResponse, "")).data.response; // retrieving ds response (in case of nav: send also instructions)

      if (langCode === "en") {
        this.UpdateTextArray([dsResponse]); //print result if language is english
      } else {
        const nmtTextParams = { source_language: "en", target_language: langCode };
        const translatedResponse = (await textModule(COMPONENT_ENDPOINTS.TRANSLATE_TEXT, sentence, nmtTextParams)).data
          .translations[0]; // translate if language is not english
        this.UpdateTextArray([translatedResponse]); // print the translated response
      }

      if (intentResponse.includes("navigation") && navigation.valid) {
        this.successResult = true;
        navSystem.RenderCues(navigation); // if intent=nav with a valid destination render ques
      } else if (intentResponse.includes("program_info") || intentResponse.includes("trade_show")) {
        this.successResult = true;
      } else {
        this.successResult = false;
      }

      console.log(`results: ${this.successResult} for index: ${index}`);
      if (this.successResult && index >= 0) {
        MakeObjectiveResolved(index, true);
      }
    } catch (error) {
      console.log("error", error);
      this.UpdateWithRandomPhrase("error");
      this.UpdateTextArray([
        `1914 translation by H. Rackham

"But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness. No one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain, but because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it? But who has any right to find fault with a man who chooses to enjoy a pleasure that has no annoying consequences, or one who avoids a pain that produces no resultant pleasure?"
Section 1.10.33 of "de Finibus Bonorum et Malorum", written by Cicero in 45 BC

"At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat."
1914 translation by H. Rackham

"On the other hand, we denounce with righteous indignation and dislike men who are so beguiled and demoralized by the charms of pleasure of the moment, so blinded by desire, that they cannot foresee the pain and trouble that are bound to ensue; and equal blame belongs to those who fail in their duty through weakness of will, which is the same as saying through shrinking from toil and pain. These cases are perfectly simple and easy to distinguish. In a free hour, when our power of choice is untrammelled and when nothing prevents our being able to do what we like best, every pleasure is to be welcomed and every pain avoided. But in certain circumstances and owing to the claims of duty or the obligations of business it will frequently occur that pleasures have to be repudiated and annoyances accepted. The wise man therefore always holds in these matters to this principle of selection: he rejects pleasures to secure other greater pleasures, or else he endures pains to avoid worse pains."`
      ]); // display error message on error
    } finally {
      this.isProccessing = false;
      this.infoPanel.obj.visible = false;
      this.panel.obj.visible = true;
      this.waitingForResponse = false;
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

  async SnapActions() {
    try {
      const responses = await Promise.all([SnapPOV(this.agent.obj, false), SnapDepthPOV(false)]);
      const vlResponse = await vlModule(responses[0], COMPONENT_ENDPOINTS.LXMERT);
      console.log(vlResponse);
    } catch (error) {
      console.log(error);
    }
  }

  HandleArrows(renderArrows) {
    this.nextArrow.obj.visible = renderArrows;
    this.prevArrow.obj.visible = renderArrows;
  }

  UpdateWithRandomPhrase(occasion) {
    const phrases = [];

    this.occasions[occasion].forEach(occasionKey => {
      const availablePhrases = agentDialogs[occasionKey][selectedLanguage];

      const randomIndex = Math.floor(Math.random() * availablePhrases.length);

      phrases.push(availablePhrases[randomIndex]);
    });

    this.UpdateTextArray(phrases.length === 1 ? [phrases[0]] : [phrases.join(" ")]);
    this.currentOccasion = occasion;
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
