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
  presentationSessionId: string;
  waitingDotsInterval: NodeJS.Timeout | null = null;
  dotStage: number = 0;

  presenterColorLine1: Color;
presenterColorLine2: Color;
audienceColorLine1: Color;
audienceColorLine2: Color;

  fixedPanelWaitingDotsInterval: NodeJS.Timeout | null = null;
fixedPanelDotStage: number = 0;

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
    this.presenterColorLine1 = new Color(0.5, 0.5, 0.5);
    this.audienceColorLine1 =  new Color(0.5, 0.5, 0);
    this.presenterColorLine2 = new Color(1, 1, 1);
    this.audienceColorLine2  = new Color(1, 1, 0);
    this.allowed = false;
    this.presenterState = false;
    this.active = false;
    this.devCounter = 0;
    this.raisedHand = false;
    this.canUnmute = false;
    this.questionQueue = [];
    this.panelShown = false
    this.presentationSessionId= ""

    this.ToggleHand = this.ToggleHand.bind(this);
    this.ToggleSubtitles = this.ToggleSubtitles.bind(this);
    this.OnToggleHand = this.OnToggleHand.bind(this);
  }
 
  Init(reset: boolean) {
    this.allowed = roomPropertiesReader.AllowPresentation;

    if (!this.allowed) {
      console.warn("Room not in presentation mode");
      presentationTranslationSystem.Deactivate()
      return;
    }
    // presentationTranslationSystem.onFixedPanelTextUpdate = (text, from) => {
    //   console.log("Translation received for panel:", text, from);
    //   this.UpdateTranslation(text, from);
    // }; 

    // presentationTranslationSystem.onFixedPanelTextUpdate = (text, from) => {
    //   const [line1 = "", line2 = ""] = text.split("\n");
    
    //   this.UpdateTranslation([
    //     { text: line1, color: this.presenterColor },
    //     { text: line2, color: this.audienceColor }
    //   ], from);
    // };

    presentationTranslationSystem.onFixedPanelTextUpdate = (text, from) => {
      const [line1 = "", line2 = ""] = text.split("\n");
    
      const isPresenter = from === this.presenter;
    
      const lines = isPresenter
        ? [
            { text: line1, color: this.presenterColorLine1 },
            { text: line2, color: this.presenterColorLine2 }
          ]
        : [
            { text: line1, color: this.audienceColorLine1 },
            { text: line2, color: this.audienceColorLine2 }
          ];
    
      this.UpdateTranslation(lines, from);
    };

    APP.dialog.on("speakerInfo", (data: { speakerId: string }) => { 
     
    });

    if (reset) {
      APP.scene!.removeEventListener("toggle_translation", this.ToggleSubtitles);
      APP.scene!.removeEventListener("ask-toggle", this.OnToggleHand);
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

    this.checkSpeakerOnJoin()
    
  }

  Tick() {
    if (!this.allowed || !APP.scene!.is("entered")) return;

    this.CheckPresenterState();
    // if (this.presenterState) this.PresenterActions(); // TODO: remove this after integrating trans model
 
 
  } 
  
  checkSpeakerOnJoin() {
    console.log("🔍 Checking for any speaking peer on join...");
  
    const consumers = APP.dialog._consumers;
    if (!consumers || consumers.size === 0) {
      console.log("No active consumers yet.");
      return;
    }
  
    for (const consumer of consumers.values()) {
      if (consumer.kind === "audio" && !consumer.paused) {
        const peerId = consumer.appData?.peerId;
        if (peerId) {
          console.log("🎤 Found peer with mic on:", peerId);
          this.UpdateSpeakerInfo(peerId);
          break; // Stop at the first speaking peer
        }
      }
    }
  }
   

  ToggleSubtitles() {
    const turningOn = !this.active;
    this.active = turningOn;
    
    if (turningOn) {
      APP.scene!.addState("translation");

      // Enable either presenter or audience view
      if (this.presenter === this.peerId) {
        if (!this.blackSquareCanvas) addBlackSquareToCamera(this); 
        presentationTranslationSystem.AudienceListenSocket(this.presentationSessionId)
      } else {
         this.ShowPresenterPanel(); 
         presentationTranslationSystem.AudienceListenSocket(this.presentationSessionId)
 
      presentationTranslationSystem.AudienceListenSocket(this.peerId);
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
    if (!peer || typeof peer !== "string") {
      console.warn("❌ Invalid peer ID when calling RespondToHandRequest:", peer);
      return;
    }
  
    if (this.questionQueue.includes(peer)) {
      APP.dialog.RespondToHandRequest(result, peer);
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
 
    console.log(`New presenter: ${newPresenter ? newPresenter : "None"} `);
    if (this.presenter && this.presenter !== this.peerId && !this.panelObj){ 
      this.ShowPresenterPanel() 
      } 
    else if (!this.presenter && this.panelObj) this.HidePresenterPanel();
  }
  UpdateSpeakerInfo(newSpeaker: string) { 
    console.log(newSpeaker)  
    this.presentationSessionId = newSpeaker;
    // sessionStorage.setItem("presentation_session_id",newSpeaker);
    this.ShowPresenterPanel(); 
    presentationTranslationSystem.AudienceListenSocket(this.presentationSessionId) 
    console.log(`New speaker: ${newSpeaker} `);
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
 

  // UpdateTranslation(data: string, producer: string) {
    UpdateTranslation(lines: { text: string, color: Color }[], producer: string){
      this.StopWaitingDots();
      this.StopFixedPanelWaitingDots();
    
      if (!this.panelShown && !this.presenterState) {
        return;
      }
    
      if (!this.panelObj) this.ShowPresenterPanel();
    
      if (this.panelShown) {
        UpdateFixedPanelText(lines);
      } else {
        UpdateFixedPanelText([]);
      }
    
      if (this.presenterState && this.blackSquareCtx && this.blackSquareTexture) {
        const combinedText = lines.map(l => l.text).join(" ");
        const newWords = combinedText.split(/\s+/).filter(w => w.length > 0);
        this.wordBuffer.push(...newWords);
    
        if (!this.bufferUpdateInterval) {
          this.bufferUpdateInterval = setInterval(() => this.updateBlackSquareText(), 300);
        }
      }
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

   

  AudienceEventOld = async (e: { enabled: boolean }) => {
    console.log("Mic state changed:", e);
  
    if (e.enabled) {
      // sessionStorage.setItem("presentation_session_id",this.peerId);
      this.presentationSessionId = this.peerId
      await presentationTranslationSystem.PresentationTranscription(true);
      if (!this.blackSquareCanvas) addBlackSquareToCamera(this); 
      presentationTranslationSystem.AudienceListenSocket(this.presentationSessionId)
 
   console.log("async")
      APP.dialog.sendSpeakerInfo(this.peerId);
    } else {
      console.log("closing...")
      presentationTranslationSystem.PresentationTranscription(false);
    }
  };


  AudienceEvent = async (e: { enabled: boolean }) => {
    if(roomPropertiesReader.AllowPresentation){
    console.log("Mic state changed:", e);
  
    if (e.enabled) {
      if (!this.peerId) {
        console.warn("❗️ peerId not set yet.");
        return;
      }
  
      this.presentationSessionId = this.peerId;
  
      if (!this.presentationSessionId) {
        console.error("❗️ Cannot start socket: presentationSessionId is empty.");
        return;
      }
  
      await presentationTranslationSystem.PresentationTranscription(true);
  
      if (this.presenter === this.peerId && !this.blackSquareCanvas) addBlackSquareToCamera(this);
      this.StartWaitingDots();
      console.log("🎤 Starting translation socket with session ID:", this.presentationSessionId);
     presentationTranslationSystem.AudienceListenSocket(this.presentationSessionId);
  
      APP.dialog.sendSpeakerInfo(this.peerId);
    } else {
      this.StartFixedPanelWaitingDots()
      console.log("🎤 Stopping translation (mic off)");
      presentationTranslationSystem.PresentationTranscription(false);
      presentationTranslationSystem.StopSocket?.(); // Just in case
    }}else{console.log("nothing")}
  };

  StartWaitingDots() {
    if (!this.blackSquareCtx || !this.blackSquareTexture) return;
  
    this.StopWaitingDots(); // Ensure no double interval
    this.dotStage = 0;
  
    this.waitingDotsInterval = setInterval(() => {
      const dots = ".".repeat((this.dotStage % 4) + 1);
      this.dotStage++;
  
      this.blackSquareCtx!.clearRect(0, 0, 1024, 128);
      this.blackSquareCtx!.font = "bold 48px Arial";
      this.blackSquareCtx!.fillStyle = "white";
      this.blackSquareCtx!.textAlign = "center";
      this.blackSquareCtx!.textBaseline = "middle";
      this.blackSquareCtx!.fillText(`${dots}`, 512, 64);
      this.blackSquareTexture!.needsUpdate = true;
    }, 500); // every half second
  }
  
  StopWaitingDots() {
    if (this.waitingDotsInterval) {
      clearInterval(this.waitingDotsInterval);
      this.waitingDotsInterval = null;
    }
  }

  // StartFixedPanelWaitingDots() {
  //   this.StopFixedPanelWaitingDots(); // Prevent double intervals
  //   this.fixedPanelDotStage = 0;
  
  //   this.fixedPanelWaitingDotsInterval = setInterval(() => {
  //     const dots = ".".repeat((this.fixedPanelDotStage % 4) + 1);
  //     this.fixedPanelDotStage++;
  //     // UpdateFixedPanelText(`${dots}`);
  //     UpdateFixedPanelText([
  //       { text: `${dots}`, color: this.presenterColorLine1 },
  //       { text: "", color: this.presenterColorLine2 }
  //     ]);
  //   }, 500);
  // }

  StartFixedPanelWaitingDots() {
    this.StopFixedPanelWaitingDots(); // Prevent double intervals
    this.fixedPanelDotStage = 0;
  
    this.fixedPanelWaitingDotsInterval = setInterval(() => {
      const dots = ".".repeat((this.fixedPanelDotStage % 4) + 1);
      this.fixedPanelDotStage++;
  
      UpdateFixedPanelText([
        { text: "", color: this.presenterColorLine1 }, // empty top line
        { text: dots, color: this.presenterColorLine2 } // dots in bottom line
      ]);
    }, 500);
  }
  
  StopFixedPanelWaitingDots() {
    if (this.fixedPanelWaitingDotsInterval) {
      clearInterval(this.fixedPanelWaitingDotsInterval);
      this.fixedPanelWaitingDotsInterval = null;
    }
  }

}

export const presentationSystem = new PresentationSystem();

let lastLoggedTime = 0;
let raiseTime = 0;
let lowerTime = 0;
let respondTime = 0;
let raiseFlag = true;
let lowerFlag = true;
 