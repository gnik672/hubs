import * as THREE from "three";
import { Object3D, WebGLRenderTarget } from "three";
import { AElement } from "aframe";
import { degToRad } from "three/src/math/MathUtils";
import { virtualAgent } from "../bit-systems/agent-system";
import { labelOrganizer } from "../bit-systems/room-labels-system";
import {
  ResponseData,
  COMPONENT_ENDPOINTS,
  COMPONENT_CODES,
  CODE_DESCRIPTIONS,
  getAIUrls
} from "./component-types";
import { SoundAnalyzer } from "./silence-detector";

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
export let isRecording = false;

export async function RecordQuestion(): Promise<any> {
  return new Promise((resolve, reject) => {
    const audioTrack = APP.mediaDevicesManager!.audioTrack;
    const recordingTrack = audioTrack.clone();
    const recordingStream = new MediaStream([recordingTrack]);
    mediaRecorder = new MediaRecorder(recordingStream);
    audioTrack.enabled = false;

    const soundAnalyzer = new SoundAnalyzer({ stream: recordingStream });

    soundAnalyzer.on("start", () => (virtualAgent.isListening = true));
    soundAnalyzer.on("stop", () => (virtualAgent.isListening = false));

    soundAnalyzer.Start();

    mediaRecorder.ondataavailable = event => chunks.push(event.data);

    mediaRecorder.onstop = () => {
      const recordingBlob = new Blob(chunks, { type: "audio/wav" });
      chunks.length = 0;
      audioTrack.enabled = true;
      recordingStream.removeTrack(recordingTrack);
      recordingTrack.stop();
      soundAnalyzer.Stop();

      resolve({
        status: {
          code: COMPONENT_CODES.Successful,
          text: CODE_DESCRIPTIONS[COMPONENT_CODES.Successful]
        },
        data: { file: recordingBlob }
      });
    };

    mediaRecorder.onerror = () => {
      reject({
        status: {
          code: COMPONENT_CODES.MediaRecorderError,
          text: CODE_DESCRIPTIONS[COMPONENT_CODES.MediaRecorderError]
        }
      });
    };

    mediaRecorder.start();
    isRecording = true;
  });
}

export function stopRecording() {
  mediaRecorder?.stop();
  isRecording = false;
}

export function saveFile(blob: Blob, ext: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `file.${ext}`;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export async function audioModules(
  endPoint: COMPONENT_ENDPOINTS,
  data: Blob,
  parameters: Record<string, any>,
  signal?: AbortSignal
) {
  const formData = new FormData();
  formData.append("audio_files", data, "recording.wav");

  const queryString = new URLSearchParams(parameters).toString();
  const response = await fetch(`${endPoint}?${queryString}`, {
    method: "POST",
    body: formData,
    signal
  });

  const responseData = await response.json();
  if (response.status >= 300 || !responseData?.translations?.[0])
    throw new Error("Bad response from translation server");

  return responseData.translations[0];
}

export async function textModule(data: string, parameters: Record<string, any>) {
  const queryString = new URLSearchParams(parameters).toString();
  const response = await fetch(`${getAIUrls().trasnlate_text}?${queryString}`, {
    method: "POST",
    headers: { accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ text: data })
  });

  const responseJson = await response.json();
  if (response.status >= 300 || !responseJson?.translations?.[0])
    throw new Error("Bad response from text translation module");

  return responseJson.translations[0];
}

export async function intentionModule(englishTranscription: string, uuid: string) {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  const replacements: Record<string, string> = {
    fox: "conference",
    elephant: "business",
    unicorn: "social area",
    penguin: "tradeshows"
  };

  const pattern = new RegExp(Object.keys(replacements).join("|"), "gi");
  const englishTranscriptionNew = englishTranscription.replace(pattern, match => replacements[match.toLowerCase()]);

  const response = await fetch(getAIUrls().intent_dest, {
    method: "POST",
    headers,
    body: JSON.stringify({ user_query: englishTranscriptionNew, user_uuid: uuid })
  });

  const responseData = await response.json();
  if (response.status >= 300 || !responseData) throw new Error("Bad response from intention module");
  return responseData;
}

function copyXRCameraPose(source: THREE.PerspectiveCamera, target: THREE.PerspectiveCamera) {
  target.position.copy(source.position);
  target.quaternion.copy(source.quaternion);
  target.projectionMatrix.copy(source.projectionMatrix);
  target.projectionMatrixInverse.copy(source.projectionMatrixInverse);
}

export async function dsResponseModule(
  userQuery: string,
  intent: string,
  uuid: string,
  mozillaInput = ""
): Promise<ResponseData> {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  const body = JSON.stringify({ user_query: userQuery, intent, mozilla_input: mozillaInput, user_uuid: uuid });

  const response = await fetch(getAIUrls().agent_response, {
    method: "POST",
    headers,
    body
  });

  const responseData = await response.json();
  if (response.status >= 300 || !responseData?.response) throw new Error("bad response from dialogue agent");
  return responseData.response;
}

export async function resetDs(uuid: string) {
  const response = await fetch(`${COMPONENT_ENDPOINTS.MEMORY_RESET}/?user_uuid=${uuid}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" }
  });

  const responseData = await response.json();
  if (response.status >= 300 || !responseData?.response)
    throw new Error("bad response from dialogue agent");

  return responseData.response;
}

const hiddenAvatars: Object3D[] = [];
const hiddenLabels: Object3D[] = [];

function flipImageDataY(imageData: ImageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  for (let y = 0; y < height / 2; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 4; c++) {
        const i1 = (y * width + x) * 4 + c;
        const i2 = ((height - y - 1) * width + x) * 4 + c;
        const tmp = data[i1];
        data[i1] = data[i2];
        data[i2] = tmp;
      }
    }
  }
}

export async function vlModule(destination: string) {
  const formData = new FormData();
  virtualAgent.agent.obj!.visible = false;
  virtualAgent.agent.obj!.updateMatrix();

  labelOrganizer.labels.forEach(label => {
    if (label.obj.visible && label.obj.position.x === 9 && label.obj.position.z === 42.1) {
      label.obj.visible = false;
      hiddenLabels.push(label.obj);
    }
  });

  document.querySelectorAll('[networked], [avatar], .avatar').forEach((el: any) => {
    if (el?.object3D?.visible) {
      el.object3D.visible = false;
      hiddenAvatars.push(el.object3D);
    }
  });

  const avatarHead = (document.querySelector("#avatar-pov-node") as AElement).object3D;
  await new Promise<void>(resolve => {
    const checkTilt = () => {
      if (
        avatarHead.rotation.x >= degToRad(-15) &&
        avatarHead.rotation.x <= degToRad(15) &&
        avatarHead.rotation.z >= degToRad(-10) &&
        avatarHead.rotation.z <= degToRad(10)
      ) {
        resolve();
      } else {
        requestAnimationFrame(checkTilt);
      }
    };
    checkTilt();
  });

  const pov = await SnapPov();
   formData.append("file", pov, "camera_pov.png");
  const response = await fetch(`${getAIUrls().navqa}/?question=${destination}`, {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  if (response.status >= 300 || !data?.Directions) throw new Error("bad response from vl module");

  virtualAgent.agent.obj!.visible = true;
  virtualAgent.agent.obj!.updateMatrix();
  hiddenAvatars.forEach(obj => (obj.visible = true));
  hiddenLabels.forEach(obj => (obj.visible = true));

  return data.Directions;
}

const fakeCamera = new THREE.PerspectiveCamera();
export async function SnapPov(): Promise<Blob> {
  const renderer = APP.scene?.renderer!;
  const scene = APP.scene?.object3D!;
  const camera = APP.scene?.camera! as THREE.PerspectiveCamera;

  const width = 1024;
  const height = 1024;

  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType
  });

  // Hide agent & labels
  virtualAgent.agent.obj!.visible = false;
  hiddenAvatars.forEach(obj => obj.visible = false);
  hiddenLabels.forEach(obj => obj.visible = false);

  // Backup previous settings
  const prevRenderTarget = renderer.getRenderTarget();
  const prevSize = renderer.getSize(new THREE.Vector2());
  const prevXrEnabled = renderer.xr.enabled;

  renderer.xr.enabled = false; // Disable XR for screenshot rendering
  renderer.setRenderTarget(renderTarget);
  renderer.setSize(width, height, false); // Render without resizing the canvas
  renderer.render(scene, camera);

  // Read pixels
  const pixels = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixels);

  // Create an off-screen canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixels);

  // Flip Y-axis (WebGL vs Canvas)
  flipImageDataY(imageData);
  ctx.putImageData(imageData, 0, 0);

  // Convert to PNG
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Failed to generate screenshot blob.");

  // Restore everything
  renderer.setRenderTarget(prevRenderTarget);
  renderer.setSize(prevSize.x, prevSize.y);
  renderer.xr.enabled = prevXrEnabled;
  virtualAgent.agent.obj!.visible = true;
  hiddenAvatars.forEach(obj => obj.visible = true);
  hiddenLabels.forEach(obj => obj.visible = true);

  return blob;
}