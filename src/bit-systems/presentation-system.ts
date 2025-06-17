import { AxesHelper, Color, Object3D, Vector3 } from "three";
import { roomPropertiesReader, Translation } from "../utils/rooms-properties";
import { AElement } from "aframe";
import { renderAsEntity } from "../utils/jsx-entity";
import { FixedText } from "../prefabs/fixed-panel";
import { degToRad } from "three/src/math/MathUtils";
import { removeEntity } from "bitecs";
import { audioModules, textModule } from "../utils/ml-adapters";
import { COMPONENT_ENDPOINTS, getAIUrls } from "../utils/component-types";
import { UpdateFixedPanelText, UpdatePanelColor } from "./fixed-panel-system";
import { languageCodes, voxLanugages } from "./localization-system";
import HubChannel from "../utils/hub-channel";
import { presentationTranslationSystem } from "./presentation-translation-system";
// import slide1 from "../assets/images/Screenshot.png";


import * as THREE from "three";
import { addEntity } from "bitecs";
import { addObject3DComponent } from "../utils/jsx-entity";





export class PresentationSystem {
  presenterState: boolean;
  panelShown: boolean;
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
  mylanguage: voxLanugages;
  active: boolean;
  questionQueue: string[];
  raisedHand: boolean;
  canUnmute: boolean;
  presenterColor: Color;
  audienceColor: Color;
  devCounter: number;
  handTimeout: NodeJS.Timeout;
  webSocket: WebSocket;


  blackSquareCanvas: HTMLCanvasElement | null = null;
blackSquareCtx: CanvasRenderingContext2D | null = null;
blackSquareTexture: THREE.Texture | null = null;

blackSquareMesh: THREE.Mesh | null = null;
blackTextSprite: THREE.Sprite | null = null;

  subtitleEl: HTMLElement | null = null;
  subtitleInterval: NodeJS.Timeout | null = null;

  //George start
  wordBuffer: string[] = [];
bufferUpdateInterval: NodeJS.Timeout | null = null;
maxWords: number = 10;
//George end

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
    this.panelShown = false

    this.ToggleHand = this.ToggleHand.bind(this);
    this.ToggleSubtitles = this.ToggleSubtitles.bind(this);
    this.OnToggleHand = this.OnToggleHand.bind(this);
  }

  Init(reset: boolean) {
    this.allowed = roomPropertiesReader.AllowPresentation;

    presentationTranslationSystem.onFixedPanelTextUpdate = (text, from) => {
      console.log("Translation received for panel:", text, from);
      this.UpdateTranslation(text, from);
    };

    if (reset) {
      APP.scene!.removeEventListener("toggle_translation", this.ToggleSubtitles);
      APP.scene!.removeEventListener("ask-toggle", this.OnToggleHand);
    }

    if (!this.allowed) {
      console.warn("Room not in presentation mode");
      return;
    }
    console.log(1)
    APP.scene!.addEventListener("toggle_translation", this.ToggleSubtitles);
    APP.scene!.addEventListener("ask-toggle", this.OnToggleHand);
    this.peerId = APP.dialog._clientId;
    this.properties = roomPropertiesReader.roomProps.translations[0];
    this.presenterBorders = this.properties.type_data;
    this.avatarObj = (document.querySelector("#avatar-pov-node")! as AElement).object3D;

    // APP.scene!.emit("toggle_translation");

    raiseTime = Date.now();
    lowerTime = Date.now();
    respondTime = Date.now();

    APP.dialog.enableMicrophone(false);
    this.RegisterAudienceEvents(true);

      // this.StartMockCounting();
     // ✅ Inject black square in front of camera
     
   
    const povNode = document.querySelector("#avatar-pov-node");
    console.log("POV node:", povNode);
    // this.showTutorialSlide()
    // this.addBlackSquareToCamera()
  }

  Tick() {
    if (!this.allowed || !APP.scene!.is("entered")) return;

    this.CheckPresenterState();
    // if (this.presenterState) this.PresenterActions(); // TODO: remove this after integrating trans model
  } 

  addBlackSquareToCamera() {
    const cameraRig = document.querySelector("#avatar-pov-node");
  
    if (!cameraRig) {
      console.warn("❌ avatar-pov-node not found.");
      return;
    }
  
    const rig = (cameraRig as any).object3D;
  
    // 1. Black background bar
    const geometry = new THREE.PlaneGeometry(4, 0.3);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
    });
  
    const square = new THREE.Mesh(geometry, material);
    square.position.set(0, -1.4, -2);
    square.renderOrder = 9999;
    rig.add(square);

    this.blackSquareMesh = square;
  
    // 2. Shared canvas for text
    this.blackSquareCanvas = document.createElement("canvas");
    this.blackSquareCanvas.width = 512;
    this.blackSquareCanvas.height = 128;
  
    this.blackSquareCtx = this.blackSquareCanvas.getContext("2d")!;
    this.blackSquareCtx.font = "bold 64px Arial";
    this.blackSquareCtx.fillStyle = "white";
    this.blackSquareCtx.textAlign = "center";
    this.blackSquareCtx.textBaseline = "middle";
    this.blackSquareCtx.clearRect(0, 0, 512, 128);
    this.blackSquareCtx.fillText("Waiting...", 256, 64);
  
    this.blackSquareTexture = new THREE.CanvasTexture(this.blackSquareCanvas);
    this.blackSquareTexture.encoding = THREE.sRGBEncoding;
  
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.blackSquareTexture,
      transparent: true,
      depthTest: false,
    });
  
    const textSprite = new THREE.Sprite(spriteMaterial);
    textSprite.scale.set(2, 0.3, 1);
    textSprite.position.set(0, -1.4, -1.99);
    textSprite.renderOrder = 10000;
    rig.add(textSprite);

    this.blackTextSprite = textSprite;
  
    console.log("✅ Black square and dynamic text added.");
  }
    

  ToggleSubtitles() {
    const turningOn = !this.active;
    this.active = turningOn;
    
    if (turningOn) {
      APP.scene!.addState("translation");
  
      // Enable either presenter or audience view
      if (this.presenter === this.peerId) {
        if (!this.blackSquareCanvas) this.addBlackSquareToCamera();
        presentationTranslationSystem.AudienceListenSocket("presentation");
      } else {
         this.ShowPresenterPanel();
        presentationTranslationSystem.AudienceListenSocket("presentation");
      }
    } else {
      APP.scene!.removeState("translation");
  
      // Hide UI
      if (this.presenter === this.peerId) {
        this.removeBlackSquareFromCamera(); // Optional: or remove object3D if needed
      } else {
        this.HidePresenterPanel();
      }
  
      // ❗️Properly stop socket
      // presentationTranslationSystem.StopSocket();
    }
  }

  removeBlackSquareFromCamera() {
    const cameraRig = document.querySelector("#avatar-pov-node");
    if (!cameraRig) return;
  
    const rig = (cameraRig as any).object3D;
  
    if (this.blackSquareMesh) {
      rig.remove(this.blackSquareMesh);
      this.blackSquareMesh.geometry.dispose();
      (this.blackSquareMesh.material as THREE.Material).dispose();
      this.blackSquareMesh = null;
    }
  
    if (this.blackTextSprite) {
      rig.remove(this.blackTextSprite);
      (this.blackTextSprite.material as THREE.Material).dispose();
      this.blackTextSprite = null;
    }
  
    this.blackSquareCanvas = null;
    this.blackSquareCtx = null;
    this.blackSquareTexture = null;
  
    console.log("🗑️ Black square and text removed.");
  }

  ClearBlackSquareText() {
    if (this.blackSquareCtx && this.blackSquareTexture) {
      this.blackSquareCtx.clearRect(0, 0, 512, 128);
      this.blackSquareTexture.needsUpdate = true;
      console.log("🧼 Cleared black square text.");
    }
  } 

  ProccessRaisedHandRequest(from: string, raised: boolean) {
    console.log(4)
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
    console.log(6)
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
    // console.log(7)
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
      presentationTranslationSystem.PresentationTranscription(isPresenter);
      this.RegisterAudienceEvents(!isPresenter);
      console.log(9)
      // this.addBlackSquareToCamera()
      // APP.scene!.addEventListener("toggle_translation", this.ToggleHand);
    }
  }

  UpdatePresenterInfo(newPresenter: string) {
    if (this.presenter === newPresenter) return;
    this.presenter = newPresenter;
    console.log(`New presenter: ${newPresenter ? newPresenter : "None"} `);
    if (this.presenter && this.presenter !== this.peerId && !this.panelObj){
      
      this.ShowPresenterPanel()

      
      } 
    else if (!this.presenter && this.panelObj) this.HidePresenterPanel();
  }
  

   
  StopSubtitleOverlay() {
    if (this.subtitleInterval) clearInterval(this.subtitleInterval);
  
    if (this.subtitleEl) {
      this.subtitleEl.remove();
      this.subtitleEl = null;
    }
  }
  

  // UpdatePresenterInfo(presenterId: string) {
  //   this.presenter = presenterId;
  
  //   if (presenterId === APP.dialog._clientId) {
  //     this.StartDynamicSentences(); // 👈 ADD THIS
  //   } else {
  //     this.StopDynamicSentences(); // 👈 ADD THIS
  //   }
  // }

  UpdateLanguage(newLanguage: voxLanugages) {
    this.mylanguage = newLanguage;
  }

  ShowPresenterPanel() {
    this.panelShown = true
    console.log("showPresenterPanel")
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
    this.panelShown = false
    console.log("hidePresenterPanel")
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
    console.log(`my language: ${this.mylanguage}`);

    if(this.mylanguage === language)this.UpdateTranslation(transcription, producer);
    else {
    const translation = await this.InferenceTranscription(transcription, language);
    console.log("translation:", translation);
    this.UpdateTranslation(translation, producer);}

    console.log(19)
  }

  async InferenceTranscription(transcription: string, senderLanugage: voxLanugages) {
    try {
      const inferenceParams = {
        source_language: languageCodes[senderLanugage],
        target_language: languageCodes[this.mylanguage!],
        return_transcription: "false"
      };

      const translateRespone = await textModule(transcription, inferenceParams);
      return translateRespone
    } catch (error) {
      console.log(`fetch aborted`);
      return transcription;
    }
  }

  UpdateTranslation(data: string, producer: string) {
    console.log("p1")
    if (!this.panelShown && !this.presenterState) {
      return; // Skip only if no fixed panel AND not the presenter
    }
    let newColor = producer === this.presenter ? this.presenterColor : this.audienceColor;
    if (!this.panelObj) this.ShowPresenterPanel();
    UpdatePanelColor(newColor);
    if(this.panelShown){
      UpdateFixedPanelText(data); 
      console.log("p2")
    } else {
      console.log("p3")
      UpdateFixedPanelText("");
    }
    
    // if (this.blackSquareCtx && this.blackSquareTexture) {
  //  if (this.presenterState && this.blackSquareCtx && this.blackSquareTexture) {
  //     this.blackSquareCtx.clearRect(0, 0, 512, 128);
  //     this.blackSquareCtx.font = "bold 64px Arial";
  //     this.blackSquareCtx.fillStyle = "white";
  //     this.blackSquareCtx.textAlign = "center";
  //     this.blackSquareCtx.textBaseline = "middle";
  //     this.blackSquareCtx.fillText(data, 256, 64);
    
  //     this.blackSquareTexture.needsUpdate = true;
  //   } 

    if (this.presenterState && this.blackSquareCtx && this.blackSquareTexture) {
      console.log("p3")
      const newWords = data.split(/\s+/).filter((w: string) => w.length > 0);
      this.wordBuffer.push(...newWords);
    
      if (!this.bufferUpdateInterval) {
        console.log("p4")
        this.bufferUpdateInterval = setInterval(() => this.updateBlackSquareText(), 300);
      }
    }




    console.log(33)
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

  RegisterAudienceEvents(register: boolean) {
    if (register) {
      console.log("registering audience event"); 
      APP.dialog.on("mic-state-changed", this.AudienceEvent)
    }
    else {console.log(`unregistering event`); 
      APP.dialog.off("mic-state-changed", this.AudienceEvent);
    }
  }

  updateBlackSquareText() {
    if (!this.blackSquareCtx || !this.blackSquareTexture) return;
  
    if (this.wordBuffer.length === 0) {
      clearInterval(this.bufferUpdateInterval!);
      this.bufferUpdateInterval = null;
      return;
    }
  
    const currentWords = this.wordBuffer.slice(0, this.maxWords);
    const textToShow = currentWords.join(" ");
  
    this.blackSquareCtx.clearRect(0, 0, 512, 128);
    this.blackSquareCtx.font = "bold 64px Arial";
    this.blackSquareCtx.fillStyle = "white";
    this.blackSquareCtx.textAlign = "center";
    this.blackSquareCtx.textBaseline = "middle";
    this.blackSquareCtx.fillText(textToShow, 256, 64);
    this.blackSquareTexture.needsUpdate = true;
  
    // Remove shown words
    this.wordBuffer.splice(0, currentWords.length);
  }

  AudienceEvent(e: any) {
    console.log("audience event", e);
    presentationTranslationSystem.AudienceTranscription(e.enabled);
  }



  showTutorialSlide() {
    const cameraRig = document.querySelector("#avatar-pov-node") as AElement;
  
    if (!cameraRig) {
      console.warn("No camera rig found");
      return;
    }
  
    const rig = cameraRig.object3D;
  
    // // ✅ Create the A-Frame image entity
    // const image = document.createElement("a-image");
    // image.setAttribute("src", slide1); // 👈 use imported image
    // image.setAttribute("width", "1.5");
    // image.setAttribute("height", "1");
    // image.setAttribute("position", "0 0 -1"); // 👈 1m in front of user
    // image.setAttribute("transparent", "true");
    // image.setAttribute("look-at", "[camera]");
  
    // // Add to scene
    // cameraRig.appendChild(image);
    // console.log("✅ Tutorial slide shown.");
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
