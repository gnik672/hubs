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
      console.log("eventData")
      console.log(this.name)
      console.log(eventData)
      APP.scene!.emit("update_avatar_panel", { id: eventData.id, message: eventData.message });
      // APP.scene!.emit("update_avatar_panel", { id: eventData.id, message: eventData.message });
    // APP.scene!.emit("panel_text_update", { id: eventData.id, message: eventData.message });
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
  // this.subtitleBuffer = new SubtitleBuffer((line1, line2) => {
  //   if (this.onFixedPanelTextUpdate) {
  //     this.onFixedPanelTextUpdate(`${line1}\n${line2}`, "presentation");
  //   }
  // });
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

  // PresentationTranscription(start: boolean) {
  //   console.log("Presentation transcription")
  //   let flagMessage;
  //   if (start) {
  //     flagMessage = " Starting to transcribe text";
  //     this.OpenWs();
  //   } else {
  //     this.StopTranscription();
  //     flagMessage = " Stop transcribing text";
  //   } 
  //   console.log(`Presentation Presenter: ${flagMessage}`);
  // }

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
    this.StopTranscription()
    console.log("close socket")
  }  
  async StartTranscription() {
    // APP.dialog.enableMicrophone(true)
    console.log(this.peerId, APP.dialog._clientId);
    // const mediaStream: MediaStream = await APP.dialog.getMediaStream(APP.dialog._clientId);
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log(mediaStream);

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

    console.log("AudioContext state:", this.context.state);
    console.log("MediaStreamSource connected:", input.numberOfInputs);
    console.log("Processor connected:", this.processor.numberOfInputs);
  }

  StopTranscription() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close(1000, "Closing connection");
      console.log("WebSocket connection closed");
    }

    if (this.listenerSocket && this.listenerSocket.readyState === WebSocket.OPEN) {
      this.listenerSocket.close(1000, "Closing listener socket");
      this.listenerSocket = null;
    }
    this.stopPing();
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

  // ProcessAudio(event: AudioProcessingEvent) {
  //   const inputSampleRate = this.context!.sampleRate;
  //   const outputSampleRate = 16000; // Target sample rate

  //   const left = event.inputBuffer.getChannelData(0);
  //   const downsampledBuffer = DownsampleBuffer(left, inputSampleRate, outputSampleRate);
  //   const audioData = ConvertFloat32ToInt16(downsampledBuffer);

  //   // console.log(">>>>>>>>> " + audioData);
  //   if (this.websocket && this.websocket.readyState == 1) {
  //     this.websocket.send(audioData);
  //   }
  // }  
  
  ProcessAudio(event: AudioProcessingEvent) {
    if (!this.context || !this.websocket) return;
  
    const inputSampleRate = this.context.sampleRate;
    const outputSampleRate = 16000;
  
    const left = event.inputBuffer.getChannelData(0);
    const downsampledBuffer = DownsampleBuffer(left, inputSampleRate, outputSampleRate);
    const audioData = ConvertFloat32ToInt16(downsampledBuffer);
  
    if (this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(audioData);
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
        console.log({ event: "onerror", error });
        resolve(); // resolve anyway to not block
      };
  
      // this.websocket.onclose = () => {
      //   if (this.wsActive) this.OpenWs(id);
      //   console.log({ event: "onclose" });
      // };
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
      console.log("connected to websocket");
      // this.SendAudioConfig();
      this.StartTranscription();
      // this.wsActive = true;
    };

    //George start
    // this.websocket.onmessage = (event: MessageEvent) => {
    //   const eventData = JSON.parse(event.data) as WsData;
    //   console.log("Message from trans server:", eventData);
    //   APP.dialog.SendTranscription(eventData.text, this.mylanguage);
    // };

    this.websocket.onclose = () => {
      if (this.wsActive) this.OpenWs(id);
      console.log({ event: "onclose" });
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
      console.log(eventData)
      console.log(eventDataNew)
      console.log(`Message from ${targetId}:`, eventData.text);
      console.log(`Message from ${targetId}:`, eventData );
      this.targets[targetId].UpdateText({id: targetId ,  message:  eventDataNew.translation  });
     
      console.log(this.targets)
    } catch (e) {
      console.warn(`Invalid message from ${targetId}:`, event.data);
    }
  };
 
   ws.onclose = () => {
     console.log(`WebSocket closed for target ${targetId}`);
    //  delete this.websocket_listeners[targetId];
   };
 
   ws.onerror = (err) => {
     console.error(`WebSocket error for target ${targetId}`, err);
   };
 
  //  this.websocket_listeners[targetId] = ws
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
    // setTimeout(()=>{  
      
        const url = getAIUrls().transcribe_audio_listen  +  targetId + "/"   +APP.store.state.preferences.locale
  
    //  const url = getAIUrls().transcribe_audio_listen  +  "3432-34320-3322-336" + "/"   +APP.store.state.preferences.locale
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
      // this.startPing(ws);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const eventData = JSON.parse(event.data);
        const text = eventData.translation;
        const eventDataNew = JSON.parse(event.data)  
        this.subtitleBuffer.addText(eventDataNew.translation);
        // const maybeLines = this.subtitleBuffer.addText(text);
        // const now = Date.now();
    
        // Flush due to word limit
        // if (maybeLines) {
        //   this.flushSubtitleLines(targetId, maybeLines);
        // } else {
        //   // Set up a timeout to flush what we have after 2s if nothing else triggers it
        //   if (!this.subtitleQueueTimer) {
        //     this.subtitleQueueTimer = window.setTimeout(() => {
        //       const lines = this.subtitleBuffer.flushLine(true); // force flush
        //       this.flushSubtitleLines(targetId, lines);
        //       this.subtitleQueueTimer = null;
        //     }, 1200);
        //   }
        // }
      } catch (e) {
        console.warn(`Invalid message from ${targetId}:`, event.data);
      }
    };
    
  
  
//     ws.onmessage = (event: MessageEvent) => {
//      console.log(`[WS LISTENER RAW] ${event.data}`);
//      try {
//        const eventData = JSON.parse(event.data) as WsData;
//        const eventDataNew = JSON.parse(event.data)  
       
//       //  this.targets[targetId].UpdateText({id: targetId ,  message:  eventDataNew.translation  });
//    console.log(eventDataNew)
//    console.log(this.subtitleBuffer)
//       const visibleLines = this.subtitleBuffer.addText(eventDataNew.translation);
//       console.log(this.subtitleBuffer)
//       console.log(eventDataNew.translation)
//       console.log(visibleLines)
// if (this.onFixedPanelTextUpdate) {
//   this.onFixedPanelTextUpdate(visibleLines.join("\n"), targetId);
// }


//       // if (this.onFixedPanelTextUpdate) {
//       //   this.onFixedPanelTextUpdate(eventDataNew.translation, targetId);
//       // }
//       console.log(this.targets)
//      } catch (e) {
//        console.warn(`Invalid message from ${targetId}:`, event.data);
//      }
//    };
  
    // ws.onclose = () => {
      // console.log(`WebSocket closed for target ${targetId}`);
      // if (this.onFixedPanelTextUpdate) {
      //   this.onFixedPanelTextUpdate("eventDataNew.translation", targetId);
      // }
      // delete this.websocket_listeners[targetId];

      // console.warn(`WebSocket closed for ${targetId}`, e);
      // const sessionId = sessionStorage.getItem("presentation_session_id");
      // // const stillActive = APP.scene?.hasState("translation");
  
      // if (  sessionId === targetId) {
      //   console.log(`Reconnecting listener for ${targetId}...`);
      //   setTimeout(() => this.OpenAudienceWsListen(targetId), 2000); // retry after delay
      // }
    // };

    ws.onclose = (event) => {
      console.log(`WebSocket closed for target ${targetId}`, event);
      // this.stopPing();

      // Always clear
      this.listenerSocket = null;
    
      // Reconnect only if it closed abnormally
      if (event.code !== 1000 && event.code !== 1001) {
        console.warn(`Abnormal close (${event.code}). Reconnecting in 1s...`);
        setTimeout(() => this.OpenAudienceWsListen(targetId), 1000);
      }
    };
  
    ws.onerror = (err) => {
      console.error(`WebSocket error for target ${targetId}`, err);
    };
  
    // this.websocket_listeners[targetId] = ws;
  // } , 1000)
 
   }
   
  

  Tick() {
    if (!this.allowed || !APP.scene!.is("entered")) return;
    // if (this.consumers.length > 0) this.TranscribeText();
  }
}

let lastLoggedTime = 0;

export const presentationTranslationSystem = new TranslationSystem();

