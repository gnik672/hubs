import { Object3D } from "three";
// import { generateRandomSentence } from "./presentation-system";
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
//buffer code
  buffer: string[] = [];
  // displayTimer: number | null = null;
  // displayDelay: number = 500; // milliseconds
  maxWords: number = 10;

  constructor(peerId: string) {
    this.id = peerId;
    APP.scene!.emit("", { id: this.id });
  }
 
  // // UpdateText(newText: string) {
  //   UpdateText(eventData:any) {
  //     console.log("eventData")
  //     console.log(this.name)
  //     console.log(eventData)
  //     APP.scene!.emit("update_avatar_panel", { id: eventData.id, message: eventData.message });
  //     // APP.scene!.emit("update_avatar_panel", { id: eventData.id, message: eventData.message });
  //   // APP.scene!.emit("panel_text_update", { id: eventData.id, message: eventData.message });
  // }

  // UpdateText(eventData: any) {
  //   const incomingText = eventData.message;
  //   const newWords = incomingText.split(/\s+/);
  //   this.messageBuffer.push(...newWords);

  //   if (!this.displayTimer) {
  //     this.displayTimer = window.setInterval(() => this.flushBuffer(), this.displayDelay);
  //   }
  // }
  UpdateText(eventData: any) {
    const newWords = eventData.message.split(/\s+/).filter((w: string) => w.length > 0);
    this.buffer.push(...newWords);

    // Keep only the most recent `maxWords` in buffer
    if (this.buffer.length > this.maxWords) {
      this.buffer = this.buffer.slice(this.buffer.length - this.maxWords);
    }

    const currentLine = this.buffer.join(" ");
    APP.scene!.emit("update_avatar_panel", { id: this.id, message: currentLine });
  }

  // flushBuffer() {
  //   if (this.messageBuffer.length === 0) {
  //     clearInterval(this.displayTimer!);
  //     this.displayTimer = null;
  //     return;
  //   }

  //   const wordsToDisplay = this.messageBuffer.splice(0, this.maxWords);
  //   const text = wordsToDisplay.join(" ");
  //   APP.scene!.emit("update_avatar_panel", { id: this.id, message: text });
  // }




   Close() {
    APP.scene!.emit("remove_translate_target", { id: this.id });
   }


  // Close() {
  //   if (this.displayTimer) clearInterval(this.displayTimer);
  //   APP.scene!.emit("remove_translate_target", { id: this.id });
  // }




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

  RemoveSubscriber(consumerId: string) {
    let message = "";
    const prevSubscibers = this.consumers.length;

    const consumerIndex = this.consumers.indexOf(consumerId);

    if (consumerIndex < 0) {
      message = "consumer  not included";
    } else {
      this.consumers.splice(consumerIndex, 1);
      message = `Removing peer: "${consumerId}" to susbcribers`;
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
      flagMessage = "Presenter: Starting to transcribe text";
      this.OpenWs();
    } else {
      this.StopTranscription();
      flagMessage = "Presenter: Stop transcribing text";
    }

    console.log(`Presentation Presenter: ${flagMessage}`);
  }
  AudienceListenSocket(presenterId:any) {
    this.OpenAudienceWsListen(presenterId)
    console.log("Presentation transcription") 
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

    // if (currentTime - lastLoggedTime >= 3000) {
    //   const randomEnglishPhrase = generateRandomSentence();
    //   lastLoggedTime = currentTime;
    //   APP.dialog.SendTranscription(randomEnglishPhrase, this.mylanguage);
    // }
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

  UpdateMyLanguage(newLanguage: voxLanugages) {
    this.mylanguage = newLanguage;
    APP.store.update({ preferences: { locale: languageCodes[newLanguage] } });
    setLocale(languageCodes[newLanguage]);
  }

  SendAudioConfig() {
    let processingArgs = {};

    processingArgs = {
      chunk_length_seconds: 3.0,
      accumulation_chunk_length_seconds: 1.0,
      chunk_offset_seconds: 0.1
    };

    const audioConfig = {
      type: "config",
      data: {
        model_name: "openai/whisper-tiny",
        language: languageCodes[this.mylanguage],
        processing_args: processingArgs
      }
    };

    const data = JSON.stringify(audioConfig);
    console.log("audio_data_goerge");
    console.log(data);
    this.websocket?.send(data);
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

  UpdateTraget(targetId: string, add: boolean) {
    //George
    console.log("targetId")
    console.log(targetId)
    if (add) this._addTarget(targetId);
    else this._removeTarget(targetId);
  }

  _addTarget(targetId: string) {
    if (this.targets[targetId]) return;

    this.targets[targetId] = new TranslationTarget(targetId);
    console.log(`target added: "${targetId}"`);
//Here is the websocket listen George
this.OpenWsListen(targetId)
// George End
    APP.scene!.emit("show_avatar_panel", targetId);
  }

  _removeTarget(targetId: string) {
    if (!this.targets[targetId]) return;
//George start

    if (this.websocket_listeners[targetId]) {
      this.websocket_listeners[targetId].close();
      delete this.websocket_listeners[targetId];
    }
  //George end


    this.targets[targetId].Close();
    delete this.targets[targetId];
    console.log(`target removed: "${targetId}"`);
    APP.scene!.emit("hide_avatar_panel", targetId);
  }

  async ProccessIncomingTranscription(message: string, language: voxLanugages, from: string) {
    if (!this.allowed || !this.targets[from]) return;

    console.log(`received transcription from: "${from}". Message: ${message}`);
 
    let newMessage="good morning"
//     const translatedMessage = await this.TranslateText(message, language);
// let newMessage="good morning"
    APP.scene!.emit("update_avatar_panel", { id: from, message: newMessage });
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
    this.websocket = new WebSocket(getAIUrls().transcribe_audio  + APP.dialog._clientId);
 
  
    // new WebSocket(getAIUrls().transcribe_audio  + APP.dialog._clientId+ "/en");
    
    if (!this.peerId) this.peerId = APP.dialog._clientId;

   this.websocket.onopen = () => {
      console.log("connected to websocket");
      // this.SendAudioConfig();
      this.StartTranscription();
      // this.wsActive = true;
    };

   

    this.websocket.onclose = () => {
      if (this.wsActive) this.OpenWs();
      console.log({ event: "onclose" });
    };

    this.websocket.onerror = error => {
      console.log({ event: "onerror", error });
    }; 
  }

  getMappedLocale(locale: string): string {
    const localeMap: Record<string, string> = {
      es: "sp", // Spanish -> sp (your custom code) 
    };
  
    return localeMap[locale] || locale;
  }

  OpenWsListen(targetId: string) {
   setTimeout(()=>{    const url = getAIUrls().transcribe_audio_listen  +  targetId + "/"  + APP.store.state.preferences.locale
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
     delete this.websocket_listeners[targetId];
   };
 
   ws.onerror = (err) => {
     console.error(`WebSocket error for target ${targetId}`, err);
   };
 
   this.websocket_listeners[targetId] = ws;} , 1000)

  }
  OpenAudienceWsListen(targetId: string) {
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
      delete this.websocket_listeners[targetId];
    };
  
    ws.onerror = (err) => {
      console.error(`WebSocket error for target ${targetId}`, err);
    };
  
    // this.websocket_listeners[targetId] = ws;
  } , 1000)
 
   }

  ClosePeer(peerId: string) {
    if (!this.allowed || !APP.scene!.is("entered")) return;
    if (this.IsPeerSubscribed(peerId)) this.RemoveSubscriber(peerId);
    if (this.IsPeerTarget(peerId)) this._removeTarget(peerId);
  }

  Tick() {
    if (!this.allowed || !APP.scene!.is("entered")) return;
    // if (this.consumers.length > 0) this.TranscribeText();

    // for (const targetId of Object.keys(this.targets)) {
    //   // this.checkTranslationDistance(targetId);
    // }
   
  }
}

let lastLoggedTime = 0;

export const translationSystem = new TranslationSystem();

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
