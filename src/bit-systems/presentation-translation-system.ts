import { Object3D } from "three";
import { generateRandomSentence } from "./presentation-system";
import { roomPropertiesReader, Translation } from "../utils/rooms-properties";
import { AElement } from "aframe";
import { audioModules, stopRecording, textModule } from "../utils/ml-adapters";
import { COMPONENT_ENDPOINTS, getAIUrls } from "../utils/component-types";
import { setLocale } from "../utils/i18n";
import { languageCodes, voxLanugages } from "./localization-system";

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
  translateTextUrl: string;

  constructor() {}

  Init() {
    this.targets = {};
    this.consumers = [];
    this.allowed = roomPropertiesReader.AllowTrans;

    if (!this.allowed) return;

    const transProps = roomPropertiesReader.roomProps.translations[0];
    console.log(transProps);
    this.wsUrl = transProps.url;
    this.translateTextUrl = roomPropertiesReader.roomProps.urls.file_translation_url;

    this.properties = transProps;
    this.avatarObj = (document.querySelector("#avatar-pov-node") as AElement).object3D;
    this.peerId = APP.dialog._clientId;
    this.wsActive = false;

    this.websocket_listeners = {};
  }

  onFixedPanelTextUpdate?: (text: string, from: string) => void;


  AddSubscriber(consumerId: string) {
    let message = "";
    const prevSubscibers = this.consumers.length;

    if (this.consumers.includes(consumerId)) {
      message = "consumer already included";
    } else {
      this.consumers.push(consumerId);
      message = `Adding peer: "${consumerId}" to susbcribers`;
    }

    console.log(message);
    this.UpdateTranscriptionStatus(prevSubscibers);
  } 

  IsPeerSubscribed(peerId: string) {
    return this.consumers.indexOf(peerId) >= 0;
  }

  IsPeerTarget(peerId: string) {
    return !!this.targets[peerId];
  }

  UpdateTranscriptionStatus(prevStatus: number) {
    const prevSubscibers = prevStatus;
    let flag = false;
    let flagMessage = "";

    if (prevSubscibers === 0 && this.consumers.length > 0) {
      flagMessage = "Starting to transcribe text";
      this.OpenWs();
    } else if (prevSubscibers > 0 && this.consumers.length === 0) {
      this.StopTranscription();
      flagMessage = "Stop transcribing text";
    }

    console.log(
      `Transcription request: new subscribers amount: ${this.consumers.length} ${
        flag ? ": " + flagMessage : flagMessage
      }`
    );

    //logic to start transcribing
  }

  PresentationTranscription(start: boolean) {
    console.log("Presentation transcription")
    let flagMessage;
    if (start) {
      flagMessage = " Starting to transcribe text";
      this.OpenWs();
    } else {
      this.StopTranscription();
      flagMessage = " Stop transcribing text";
    } 
    console.log(`Presentation Presenter: ${flagMessage}`);
  }
  AudienceListenSocket(presenterId:any) {
    this.OpenAudienceWsListen(presenterId)
    console.log("Presentation transcription")
    // let flagMessage;
    // if (start) {
    //   flagMessage = "Presenter: Starting to transcribe text";
    //   this.OpenWs();
    // } else {
    //   this.StopTranscription();
    //   flagMessage = "Presenter: Stop transcribing text";
    // }

    // console.log(`Presentation Presenter: ${flagMessage}`);
  }
  StopSocket() {
    this.StopTranscription()
    console.log("close socket")
   
  }
  AudienceTranscription(start: boolean) {
    console.log("audience transcriptio")
    let flagMessage;

    if (start) {
      flagMessage = "Audience: Starting to transcribe text";
      this.OpenWs();
    } else {
      this.StopTranscription();
      flagMessage = "Audience: Stop transcribing text";
    }

    console.log(`Presentation Audience: ${flagMessage}`);
  }


 

  SendTranscription(message: string) {
    console.log(`sending transcribed message: ${message}`);
    APP.dialog.SendTranscription(message, this.mylanguage);
  }

  SentTestTranscription() {
    const currentTime = Date.now();

    if (currentTime - lastLoggedTime >= 3000) {
      const randomEnglishPhrase = generateRandomSentence();
      lastLoggedTime = currentTime;
      APP.dialog.SendTranscription(randomEnglishPhrase, this.mylanguage);
    }
  }

  async StartTranscription() {
    console.log(this.peerId, APP.dialog._clientId);
    const mediaStream: MediaStream = await APP.dialog.getMediaStream(this.peerId);
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
    this.websocket?.close();

    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null; // Remove event listener
      this.processor = null;
    }

    if (this.context) {
      this.context.close().then(() => (this.context = null));
    }
    if (this.websocket) {
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.close(1000, "Closing connection"); // Normal closure
        console.log("WebSocket connection closed");
      }
    }

    this.wsActive = false;

    this.processor = null;
    this.context = null;
    this.websocket = null;

    console.log("Cleanup completed");
  } 

  ProcessAudio(event: AudioProcessingEvent) {
    const inputSampleRate = this.context!.sampleRate;
    const outputSampleRate = 16000; // Target sample rate

    const left = event.inputBuffer.getChannelData(0);
    const downsampledBuffer = DownsampleBuffer(left, inputSampleRate, outputSampleRate);
    const audioData = ConvertFloat32ToInt16(downsampledBuffer);

    // console.log(">>>>>>>>> " + audioData);
    if (this.websocket && this.websocket.readyState == 1) {
      this.websocket.send(audioData);
    }
  } 



  async TranslateText(message: string, language: voxLanugages) {
    if (language === this.mylanguage) return message;
    else {
      const nmtTextParams = {
        source_language: languageCodes[language],
        target_language: languageCodes[this.mylanguage],
        return_transcription: "false"
      };
      return await textModule(message, nmtTextParams);
    }
  }

  OpenWs() {
    console.log(`openinig websocket`, getAIUrls().transcribe_audio);
    console.log(this.peerId, APP.dialog._clientId);
    console.log('this.peerId, APP.dialog._clientId');
    this.websocket = new WebSocket(getAIUrls().transcribe_audio  + "presentation");
 
  
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
      if (this.wsActive) this.OpenWs();
      console.log({ event: "onclose" });
    };

    this.websocket.onerror = error => {
      console.log({ event: "onerror", error });
    }; 
  }
  OpenWsListen(targetId: string) {
   setTimeout(()=>{    const url = getAIUrls().transcribe_audio_listen  +  targetId + "/en"
  //  +APP.store.state.preferences.locale
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
   ;} , 3000)

  }
  OpenAudienceWsListen(targetId: string) {
    setTimeout(()=>{    const url = getAIUrls().transcribe_audio_listen  +  "presentation" + "/en"
   //  +APP.store.state.preferences.locale
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
       
      //  this.targets[targetId].UpdateText({id: targetId ,  message:  eventDataNew.translation  });
   
      if (this.onFixedPanelTextUpdate) {
        this.onFixedPanelTextUpdate(eventDataNew.translation, targetId);
      }
      console.log(this.targets)
     } catch (e) {
       console.warn(`Invalid message from ${targetId}:`, event.data);
     }
   };
  
    ws.onclose = () => {
      console.log(`WebSocket closed for target ${targetId}`);
      // if (this.onFixedPanelTextUpdate) {
      //   this.onFixedPanelTextUpdate("eventDataNew.translation", targetId);
      // }
      // delete this.websocket_listeners[targetId];
    };
  
    ws.onerror = (err) => {
      console.error(`WebSocket error for target ${targetId}`, err);
    };
  
    // this.websocket_listeners[targetId] = ws;
  } , 1000)
 
   } 

  Tick() {
    if (!this.allowed || !APP.scene!.is("entered")) return;
    // if (this.consumers.length > 0) this.TranscribeText();
  }
}

let lastLoggedTime = 0;

export const presentationTranslationSystem = new TranslationSystem();

// helping functions

function DownsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }
  var sampleRateRatio = inputSampleRate / outputSampleRate;
  var newLength = Math.round(buffer.length / sampleRateRatio);
  var result = new Float32Array(newLength);
  var offsetResult = 0;
  var offsetBuffer = 0;
  while (offsetResult < result.length) {
    var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    var accum = 0,
      count = 0;
    for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function ConvertFloat32ToInt16(buffer: Float32Array) {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7fff;
  }
  return buf.buffer;
}
