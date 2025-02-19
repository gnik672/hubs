import { AElement } from "aframe";

const BTN_OFFSET = 0.15;
export function ResizeHudPanel() {
  const hudPanel = document.querySelector("#pilot-tooltip")!;
  const pilotBtns = hudPanel.querySelectorAll("[is-remote-hover-target]") as NodeListOf<AElement>;
  const counters = [-1, 0];
  let counter = -1;

  for (let i = 0; i < pilotBtns.length; i++) {
    if (!pilotBtns[i].object3D.visible) continue;

    counter++;
    const mod = counter % 2;
    counters[mod]++;
    const sign = counter % 2 === 0 ? 1 : -1;

    pilotBtns[i].object3D.position.setX(sign * counters[mod] * BTN_OFFSET);
  }
}
