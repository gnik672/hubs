import { roomPropertiesReader } from "./rooms-properties";

export enum COMPONENT_ENDPOINTS {
  TRANSLATE_TEXT = "translate_text",
  TRANSLATE_AUDIO_FILES = "translate_audio_files",
  TRANSCRIBE_AUDIO = "e2e_listen",
  INTENTION = "intent_dest/",
  AGENT_RESPONSE = "response/",
  MEMORY_RESET = "clear_memory",
  NAVQA = "navqa"
}

export enum RECORDER_CODES {
  SUCCESSFUL,
  ERROR,
  STOP
}
export const RECORDER_TEXT: Record<RECORDER_CODES, string> = {
  [RECORDER_CODES.SUCCESSFUL]: "successful",
  [RECORDER_CODES.ERROR]: "media recorder error",
  [RECORDER_CODES.STOP]: "recording stopped"
};

export enum LANGUAGES {
  ENGLISH = "eng",
  GREEK = "ell",
  SPANISH = "spa",
  ITALIAN = "ita",
  DUTCH = "nld",
  GERMAN = "deu"
}

export interface ResponseData {
  status: {
    code: number;
    text: string;
  };
  data?: {
    file?: Blob;
    text_init?: string;
    text_en?: string;
    task_descript?: string;
    start?: number;
    dest?: number;
    descript?: any;
    transcriptions?: string[];
    translations?: string[];
    destination?: string;
    intent?: string;
    response?: string;
  };
}

export enum COMPONENT_CODES {
  Successful,
  FetchError,
  MediaRecorderError,
  RecordingStopped,
  NmtResponseError,
  UknownTask,
  UnknownDest
}

export const CODE_DESCRIPTIONS: Record<COMPONENT_CODES, string> = {
  [COMPONENT_CODES.Successful]: "Successfull",
  [COMPONENT_CODES.FetchError]: "Fetch fail",
  [COMPONENT_CODES.MediaRecorderError]: "Media Recorder Error",
  [COMPONENT_CODES.RecordingStopped]: "Recording Stopped",
  [COMPONENT_CODES.NmtResponseError]: "Error with the response of the NMT module",
  [COMPONENT_CODES.UknownTask]: "Uknown Task",
  [COMPONENT_CODES.UnknownDest]: "Uknown Destination"
};

export function getAIUrls() {
  const urls = {
    translate_audio_files: `https://${roomPropertiesReader.roomProps.urls.file_translation_url}/${COMPONENT_ENDPOINTS.TRANSLATE_AUDIO_FILES}`,
    trasnlate_text: `https://${roomPropertiesReader.roomProps.urls.file_translation_url}/${COMPONENT_ENDPOINTS.TRANSLATE_TEXT}`,
    // transcribe_audio: `ws://${roomPropertiesReader.roomProps.urls.translation_url}/ws/speaker/{speaker_id}${COMPONENT_ENDPOINTS.TRANSCRIBE_AUDIO}`,
    transcribe_audio: `wss://${roomPropertiesReader.roomProps.urls.translation_url}/ws/speaker/` ,
    transcribe_audio_listen: `wss://${roomPropertiesReader.roomProps.urls.translation_url}/ws/listener/` ,
  
    // ws/speaker/{speaker_id}${COMPONENT_ENDPOINTS.TRANSCRIBE_AUDIO}`,
    intent_dest: `https://${roomPropertiesReader.roomProps.urls.agent_url}/${COMPONENT_ENDPOINTS.INTENTION}`,
    agent_response: `https://${roomPropertiesReader.roomProps.urls.agent_url}/${COMPONENT_ENDPOINTS.AGENT_RESPONSE}`,
    clear_memory: `https://${roomPropertiesReader.roomProps.urls.agent_url}/${COMPONENT_ENDPOINTS.MEMORY_RESET}`,
    navqa: `https://${roomPropertiesReader.roomProps.urls.navqa_url}/${COMPONENT_ENDPOINTS.NAVQA}`
  };

  return urls;
}
