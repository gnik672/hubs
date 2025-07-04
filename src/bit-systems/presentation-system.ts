import * as THREE from "three"; 
import { AxesHelper, Color, Object3D, Vector3 } from "three";
import { roomPropertiesReader, Translation } from "../utils/rooms-properties";
import { AElement } from "aframe";
import { renderAsEntity } from "../utils/jsx-entity";
import { FixedText } from "../prefabs/fixed-panel";
import { degToRad } from "three/src/math/MathUtils";
import { removeEntity } from "bitecs"; 
import { UpdateFixedPanelText, UpdatePanelColor } from "./fixed-panel-system";
import { languageCodes, voxLanugages } from "./localization-system";
import HubChannel from "../utils/hub-channel";
import { presentationTranslationSystem } from "./presentation-translation-system";
import {
  addBlackSquareToCamera,
  removeBlackSquareFromCamera,
  clearBlackSquareText,
} from "./black-square-system";
// import slide1 from "../assets/images/Screenshot.png"; 

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
  
    // addBlackSquareToCamera(this)
  }

  Tick() {
    if (!this.allowed || !APP.scene!.is("entered")) return;

    this.CheckPresenterState();
    // if (this.presenterState) this.PresenterActions(); // TODO: remove this after integrating trans model
 
 
  } 

   

  ToggleSubtitles() {
    const turningOn = !this.active;
    this.active = turningOn;
    
    if (turningOn) {
      APP.scene!.addState("translation");

      // Enable either presenter or audience view
      if (this.presenter === this.peerId) {
        if (!this.blackSquareCanvas) addBlackSquareToCamera(this); 
        presentationTranslationSystem.AudienceListenSocket(localStorage.getItem("presentation_session_id"))
      } else {
         this.ShowPresenterPanel(); 
         presentationTranslationSystem.AudienceListenSocket(localStorage.getItem("presentation_session_id"))
 
        //  presentationTranslationSystem.AudienceListenSocket(this.peerId);
      }
    } else {
      APP.scene!.removeState("translation");
  
      // Hide UI
      if (this.presenter === this.peerId) {
        removeBlackSquareFromCamera(this); // Optional: or remove object3D if needed
      } else {
        this.HidePresenterPanel();
      }
  
      // ❗️Properly stop socket
      // presentationTranslationSystem.StopSocket();
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
      const sessionId = "crypto.randomUUID()"; // Or some scoped ID
 
      this.UpdatePresenterInfo(isPresenter ? this.peerId : "");
      this.questionQueue = [];
      if (this.presenterState) lastLoggedTime = Date.now();
      this.presenterState = isPresenter;
      this.canUnmute = isPresenter;
      // presentationTranslationSystem.PresentationTranscription(isPresenter);
      // this.RegisterAudienceEvents(!isPresenter);
      console.log(9)
      // addBlackSquareToCamera(this)
      // APP.scene!.addEventListener("toggle_translation", this.ToggleHand);
    }
  }

  UpdatePresenterInfo(newPresenter: string) {
    if (this.presenter === newPresenter) return;
    this.presenter = newPresenter;
    sessionStorage.setItem("presentation_session_id", newPresenter);
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
// for the aditors we have these event if  mic on or off
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
    this.blackSquareCtx.clearRect(0, 0, 1024, 128);
    this.blackSquareCtx.font = "bold 32px Arial";
    // this.blackSquareCtx.fillText(textToShow, 512, 128); // new center
    this.blackSquareCtx.fillText(textToShow, 512, 64); 
    // Remove shown words
    this.wordBuffer.splice(0, currentWords.length);
  }

  // AudienceEvent(e: any) {
  //   console.log("audience event", e);
  //   //start auditors transcription
  //   presentationTranslationSystem.AudienceTranscription(e.enabled);
  // }  

  AudienceEvent = (e: { enabled: boolean }) => {
    console.log("Mic state changed:", e);
    if (e.enabled) {
     
      presentationTranslationSystem.PresentationTranscription(true);
    } else {
     
      presentationTranslationSystem.PresentationTranscription(false);
    }
  };

}

export const presentationSystem = new PresentationSystem();

let lastLoggedTime = 0;
let raiseTime = 0;
let lowerTime = 0;
let respondTime = 0;
let raiseFlag = true;
let lowerFlag = true;
 
