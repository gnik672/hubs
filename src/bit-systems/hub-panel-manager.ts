import { AElement } from "aframe";

const BTN_OFFSET = 0.15;
export function ResizeHudPanel() {
  console.log(`resing hud panel`);
  const hudPanel = document.querySelector("#pilot-tooltip")!;
  const pilotBtns = hudPanel.querySelectorAll("[is-remote-hover-target]") as NodeListOf<AElement>;
  const counters = [-1, 0];
  let counter = -1;
  const elements = [];

  for (let i = 0; i < pilotBtns.length; i++) {
    elements.push(pilotBtns[i].className);
    if (!pilotBtns[i].object3D.visible) {
      console.log(`skipping element of classes:`, pilotBtns[i].className);
      continue;
    }

    counter++;
    const mod = counter % 2;
    counters[mod]++;
    const sign = counter % 2 === 0 ? 1 : -1;

    pilotBtns[i].object3D.position.setX(sign * counters[mod] * BTN_OFFSET);
    pilotBtns[i].object3D.updateMatrix();
    console.log(
      `${pilotBtns[i].className} | sign: ${sign} | counter: ${counter} | position: ${counters[mod]} | mod: ${mod}`
    );
  }

  console.log(elements);
}
