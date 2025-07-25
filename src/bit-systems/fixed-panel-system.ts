import { defineQuery, enterQuery, exitQuery, removeComponent } from "bitecs";
import { Color, Object3D, Quaternion, Vector3 } from "three";
import { Object3DTag, FixedTextPanel, Slice9 } from "../bit-components";
import { HubsWorld } from "../app";
import { Text } from "troika-three-text";
// import { GreetingPhrases } from "../components/translate-panel";

import { GetTextSize } from "../utils/interactive-panels";
import { updateSlice9Geometry } from "../update-slice9-geometry";
import { voxLanugages } from "./localization-system";
import { presentationSystem } from "./presentation-system";

interface TranslateEventParams {
  id: string;
  text: string;
}

const PANEL_PADDING = 0.05;
const PANEL_WIDTH = 6.9;
const MIN_PANEL_HEIGHT = 1.5;

const fixedPanelQuery = defineQuery([FixedTextPanel]);
const panelEnterQuery = enterQuery(fixedPanelQuery);
const panelExitQuery = exitQuery(fixedPanelQuery);

let fixedPanelObj: Object3D | null;
let fixedPanelRef: number | null;
let textObj: Text | null;
let textRef: number | null;
let line1Obj: Text | null = null;
let line2Obj: Text | null = null;

export function FixedPanelSystem(world: HubsWorld) {

//old code for single color
  // panelEnterQuery(world).forEach(fixedPanelEid => {
  //   if (fixedPanelRef !== fixedPanelEid) { 
  //     fixedPanelRef = fixedPanelEid;
  //     fixedPanelObj = world.eid2obj.get(fixedPanelEid)!;
  //     textRef = FixedTextPanel.textRef[fixedPanelEid];
  //     textObj = world.eid2obj.get(textRef)! as Text;
 
  //   }
  // });


  // panelEnterQuery(world).forEach(fixedPanelEid => {
  //   if (fixedPanelRef !== fixedPanelEid) {
  //     fixedPanelRef = fixedPanelEid;
  //     fixedPanelObj = world.eid2obj.get(fixedPanelEid)!;
  
  //     // Create line1 text
  //     line1Obj = new Text();
  //     line1Obj.fontSize = 0.32;
  //     line1Obj.color = presentationSystem.presenterColor;
  //     line1Obj.anchorX = "center";
  //     line1Obj.anchorY = "top";
  //     line1Obj.position.set(0, 0.35, 0.01);
  //     fixedPanelObj.add(line1Obj);
  
  //     // Create line2 text
  //     line2Obj = new Text();
  //     line2Obj.fontSize = 0.36;
  //     line2Obj.color = presentationSystem.audienceColor;
  //     line2Obj.anchorX = "center";
  //     line2Obj.anchorY = "top";
  //     // line2Obj.fontWeight = "bold"
  //     line2Obj.position.set(0, -0.1, 0.01); // slightly below line1
  //     fixedPanelObj.add(line2Obj);
  //   }
  // });

  panelEnterQuery(world).forEach(fixedPanelEid => {
    if (fixedPanelRef !== fixedPanelEid) {
      fixedPanelRef = fixedPanelEid;
      fixedPanelObj = world.eid2obj.get(fixedPanelEid)!;
  
      // Create line 1 (Presenter or Audience primary)
      line1Obj = new Text();
      line1Obj.fontSize = 0.32;
      line1Obj.color = presentationSystem.presenterColorLine1;  // Default fallback color
      line1Obj.anchorX = "center";
      line1Obj.anchorY = "top";
   
      line1Obj.position.set(0, 0.4, 0.01);  // slightly higher
      fixedPanelObj.add(line1Obj);
  
      // Create line 2 (Faded style)
      line2Obj = new Text();
      // line2Obj.fontWeight = "bold"; 
      line2Obj.fontSize = 0.36;  // Slightly larger for emphasis if you like
      line2Obj.color = presentationSystem.presenterColorLine2;  // Default fallback color
      line2Obj.anchorX = "center";
      line2Obj.anchorY = "top";
 
      line2Obj.position.set(0, -0.1, 0.01);  // lower for spacing
      fixedPanelObj.add(line2Obj);
    }
  });
  
  // panelExitQuery(world).forEach(() => { 
  //   fixedPanelRef = null;
  //   fixedPanelObj = null;
  //   textRef = null;
  //   textObj = null;
  // });
  // panelExitQuery(world).forEach(() => {
  //   if (line1Obj) fixedPanelObj!.remove(line1Obj);
  //   if (line2Obj) fixedPanelObj!.remove(line2Obj);
  //   line1Obj = null;
  //   line2Obj = null;
  //   fixedPanelRef = null;
  //   fixedPanelObj = null;
  // });

  panelExitQuery(world).forEach(() => {
    if (line1Obj && fixedPanelObj) fixedPanelObj.remove(line1Obj);
    if (line2Obj && fixedPanelObj) fixedPanelObj.remove(line2Obj);
    line1Obj = null;
    line2Obj = null;
    fixedPanelRef = null;
    fixedPanelObj = null;
  });
}

// function onTranslationAvailable(event: any) {
//   const details = event.detail as TranslateEventParams;
//   console.log(details);
//   if (!details.text) return;
//   UpdateFixedPanelText(details.text);
// }
//old single color
// export function UpdateFixedPanelText(text: string) {
//   if (!text) return;
//   textObj!.text = text;
// }
// export function UpdateFixedPanelText(lines: { text: string, color: Color }[]) {
//   if (!line1Obj || !line2Obj) return;

//   const [l1, l2] = lines;

//   // Set line1
//   line1Obj.text = l1?.text || "";
//   line1Obj.color = l1?.color || presentationSystem.presenterColor;
//   line1Obj.sync();

//   // Set line2
//   line2Obj.text = l2?.text || "";
//   line2Obj.color = l2?.color || presentationSystem.audienceColor;
//   line2Obj.sync();
// }

export function UpdateFixedPanelText(lines: { text: string; color: Color }[]) {
  if (!line1Obj || !line2Obj) return;

  const [l1, l2] = lines;

  // Update line 1
  line1Obj.text = l1?.text || "";
  line1Obj.color = l1?.color || presentationSystem.presenterColorLine1;
  line1Obj.sync();

  // Update line 2
  line2Obj.text = l2?.text || "";
  line2Obj.color = l2?.color || presentationSystem.presenterColorLine2;
  line2Obj.sync();
}

export function UpdatePanelColor(color: Color) {
  if (color !== textObj!.color) textObj!.color = color;
}

function updateTextSize() {
  const size = GetTextSize(textObj!);
  size[0] = PANEL_WIDTH;

  size[1] = size[1] + 2 * PANEL_PADDING < MIN_PANEL_HEIGHT ? MIN_PANEL_HEIGHT : size[1] + 2 * PANEL_PADDING;
  Slice9.size[fixedPanelRef!].set(size);
  updateSlice9Geometry(APP.world, fixedPanelRef);
  fixedPanelObj!.updateMatrix();
}
