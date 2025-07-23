import { Object3D } from "three"; 
import { roomPropertiesReader, Translation } from "../utils/rooms-properties";
import { AElement } from "aframe";
import { audioModules, stopRecording, textModule } from "../utils/ml-adapters";
import { COMPONENT_ENDPOINTS, getAIUrls } from "../utils/component-types";
import { setLocale } from "../utils/i18n";
import { languageCodes, voxLanugages } from "./localization-system";
import { DownsampleBuffer, ConvertFloat32ToInt16 } from "../utils/audio-utils";
import { SubtitleBuffer } from "../utils/subtitle-buffer";
interface WsData {
  text: string;
  processing_time: number;
}

class TranslationTarget {
  panelRef: number;
  panelObj: Object3D;
  avatarObj: Object3D;
  avatarRef: number;
  name?: string;
  id: string;

  constructor(peerId: string) {
    this.id = peerId;
    APP.scene!.emit("", { id: this.id });
  }
 
  // UpdateText(newText: string) {
    UpdateText(eventData:any) { 
      APP.scene!.emit("update_avatar_panel", { id: eventData.id, message: eventData.message });
    }

  Close() {
    APP.scene!.emit("remove_translate_target", { id: this.id });
  }
}

export class TranslationSystem {
  allowed: boolean;
  properties: Translation;
  targets: Record<string, TranslationTarget>;
  consumers: string[];
  avatarObj: Object3D;
  peerId: string;
  mylanguage: voxLanugages;
  context: AudioContext | null;
  websocket: WebSocket | null;
  websocket_listeners: Record<string, WebSocket>;
  processor: ScriptProcessorNode | null;
  gainNode: GainNode;
  mediaRecorder: MediaRecorder | null;
  wsActive: boolean;
  wsUrl: string; 
  listenerSocket: WebSocket | null;
  subtitleBuffer: SubtitleBuffer;
   subtitleQueueTimer: number | null = null;
 lastFlushTime: number = 0;


 pingInterval: number | null 
 constructor() {
 
}

  Init() {
    this.targets = {};
    this.consumers = [];
    this.allowed = roomPropertiesReader.AllowTrans;

    if (!this.allowed) return;

    const transProps = roomPropertiesReader.roomProps.translations[0];
    console.log(transProps);
    this.wsUrl = transProps.url; 

    this.properties = transProps;
    this.avatarObj = (document.querySelector("#avatar-pov-node") as AElement).object3D;
    this.peerId = APP.dialog._clientId;
    this.wsActive = false;

    this.websocket_listeners = {};
    // this.subtitleBuffer = new SubtitleBuffer(2, 2)
  }


  startPing(ws: WebSocket) {
    this.stopPing(); // Clear any existing interval
    this.pingInterval = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 15000); // every 15 seconds
  }
  
  stopPing() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  

  onFixedPanelTextUpdate?: (text: string, from: string) => void; 
 
  async PresentationTranscription(start: boolean) {
    console.log("Presentation transcription");
  
    if (start) {
      console.log(" Starting to transcribe text");
      await this.OpenWs(start); // 🔁 Await here too
    } else {
      this.StopTranscription();
      console.log(" Stop transcribing text");
    }
  
    console.log(`Presentation Presenter: ${start ? "Started" : "Stopped"}`);
  }


  PresentationTranscriptionNotAsyn(start: boolean) {
    console.log("Presentation transcription")
    let flagMessage;
    if (start) {
      flagMessage = " Starting to transcribe text";
      this.OpenWs(start);
    } else {
      this.StopTranscription();
      flagMessage = " Stop transcribing text";
    } 
    console.log(`Presentation Presenter: ${flagMessage}`);
  }
  AudienceListenSocket(presenterId:any) {
    this.OpenAudienceWsListen(presenterId)
    console.log("Presentation transcription")

  }
  StopSocket() {
    console.log("stop socket triggered")
    this.StopTranscription()
   
  }  
  async StartTranscription() {
  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
 
    const tracks = mediaStream.getAudioTracks();
 
    this.context = new window.AudioContext();
    console.log(`audio context created with state: ${this.context.state}`);
    await this.context.resume();

    const input = this.context.createMediaStreamSource(mediaStream);
    this.gainNode = this.context.createGain();
    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = event => this.ProcessAudio(event);

    input.connect(this.processor);
    this.processor.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);
 
  }

  StopTranscription() {
    console.log(" close socket for transcription triggered ")
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close(1000, "Closing connection");
      console.log("WebSocket connection closed");
    }

    if (this.listenerSocket && this.listenerSocket.readyState === WebSocket.OPEN) {
      this.listenerSocket.close(1000, "Closing listener socket");
      this.listenerSocket = null;
    }
    // this.stopPing();
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
  
    // if (this.context) {
    //   this.context.close().then(() => (this.context = null));
    // }
    if (this.context && this.context.state !== "closed") {
      this.context.close()
        .then(() => {
          console.log("AudioContext closed safely.");
          this.context = null;
        })
        .catch((err) => {
          console.warn("Error closing AudioContext:", err);
        });
    } else {
      console.log("AudioContext already closed or not initialized.");
      this.context = null; // clean up anyway
    }
  
    this.wsActive = false;
    this.websocket = null;
  
    console.log("Cleanup completed");
  }

 
  ProcessAudio(event: AudioProcessingEvent) {
    if (!this.context || !this.websocket) return;
  
    const inputSampleRate = this.context.sampleRate;
    const outputSampleRate = 16000;
  
    const left = event.inputBuffer.getChannelData(0);
    const downsampledBuffer = DownsampleBuffer(left, inputSampleRate, outputSampleRate);
    const audioData = ConvertFloat32ToInt16(downsampledBuffer);

 
  try {
    if (this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(audioData);
      // if ( allowedSeconds.includes(currentSecond)  && currentMs <= 100 ){

   
      // } else   {

      //   // console.log("not right time")
      // }
    } else {
      console.warn("⚠️ Tried to send but WebSocket is not open");
    }
  } catch (e) {
    console.error("❌ Error sending audio chunk:", e);
  }
  }

  OpenWs(id: any): Promise<void> {
    return new Promise(resolve => {
      this.wsActive = true; 
    this.websocket = new WebSocket(getAIUrls().transcribe_audio + APP.dialog._clientId);
      this.websocket.onopen = () => { 
        console.log("connected to websocket"); 
        this.StartTranscription().then(resolve); // only resolve after StartTranscription
      };
  
      this.websocket.onerror = error => {
        console.log({ event:  error });
        resolve(); // resolve anyway to not block
      };
      this.websocket.onclose = (e) => {
        console.log(e)
        console.log({ event: "onclose" }); 
      };
      this.websocket.onmessage = (e) => {
        console.log('message '+  e) 
      }; 
    });
  }


  OpenWsOld(id:any) {
    console.log(`openinig websocket`, getAIUrls().transcribe_audio);
    console.log(this.peerId, APP.dialog._clientId);
    console.log('this.peerId, APP.dialog._clientId');
    this.websocket = new WebSocket(getAIUrls().transcribe_audio  +   APP.dialog._clientId);
 
   // this.websocket = new WebSocket(getAIUrls().transcribe_audio  + "presentation");
    // new WebSocket(getAIUrls().transcribe_audio  + APP.dialog._clientId+ "/en");
    
    if (!this.peerId) this.peerId = APP.dialog._clientId;

   this.websocket.onopen = () => { 
      this.StartTranscription(); 
    };
 
    this.websocket.onclose = () => {
      console.log({ event: "onclose" }); 
      if (this.wsActive){
        console.log("reconnecting");
      } this.OpenWs(id); 
    };

    this.websocket.onerror = error => {
      console.log({ event: "onerror", error });
    }; 
  }  
  
  OpenWsListen(targetId: string) {
   setTimeout(()=>{    const url = getAIUrls().transcribe_audio_listen  +  targetId + "/" +APP.store.state.preferences.locale
   console.log("Opening listener WebSocket for", targetId, "URL:", url);
 
   const ws = new WebSocket(url);
 
   ws.onopen = () => {
     console.log(`WebSocket opened for target ${targetId}`);
   };
 
 
   ws.onmessage = (event: MessageEvent) => {
    console.log(`[WS LISTENER RAW] ${event.data}`);
    try {
      const eventData = JSON.parse(event.data) as WsData;
      const eventDataNew = JSON.parse(event.data)  
      this.targets[targetId].UpdateText({id: targetId ,  message:  eventDataNew.translation  });
      
    } catch (e) {
      console.warn(`Invalid message from ${targetId}:`, event.data);
    }
  };
 
   ws.onclose = (event) => {
     console.log(`WebSocket closed for target ${targetId}`); 
    console.log(`event code (${event})`); 
   };
 
   ws.onerror = (err) => {
     console.error(`WebSocket error for target ${targetId}`, err);
   }; 
   ;} , 1000)

  }

  flushSubtitleLines(targetId: string, lines: string[]) {
    const now = Date.now();
    const timeSinceLast = now - this.lastFlushTime;
  
    const delay = Math.max(0, 1400 - timeSinceLast); // ensure 2s visibility
  
    setTimeout(() => {
      if (this.onFixedPanelTextUpdate) {
        this.onFixedPanelTextUpdate(lines.join("\n"), targetId);
      }
      this.lastFlushTime = Date.now();
    }, delay);
  }
  
  OpenAudienceWsListen(targetId: string) { 
        const url = getAIUrls().transcribe_audio_listen  +  targetId + "/"   +APP.store.state.preferences.locale
       console.log("Opening listener WebSocket for", targetId, "URL:", url);
  
    this.listenerSocket = new WebSocket(url);
    const ws = this.listenerSocket;
    
    this.subtitleBuffer = new SubtitleBuffer((line1, line2) => {
      if (this.onFixedPanelTextUpdate) {
        this.onFixedPanelTextUpdate(`${line1}\n${line2}`, targetId);
      }
    });

  
    ws.onopen = () => {
      console.log(`WebSocket opened for target ${targetId}`); 
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const eventData = JSON.parse(event.data);
        const text = eventData.translation;
        const eventDataNew = JSON.parse(event.data)  
        this.subtitleBuffer.addText(eventDataNew.translation);
     
      } catch (e) {
        console.warn(`Invalid message from ${targetId}:`, event.data);
      }
    };
    

    ws.onclose = (event) => {
      console.log(`WebSocket closed for target ${targetId}`, event);
 
      this.listenerSocket = null;
    console.warn(`Abnormal close (${event.code})`);
 
    };
  
    ws.onerror = (err) => {
      console.error(`WebSocket error for target ${targetId}`, err);
    }; 
   } 
  Tick() {
    if (!this.allowed || !APP.scene!.is("entered")) return; 
  }
}

let lastLoggedTime = 0;

export const presentationTranslationSystem = new TranslationSystem();
