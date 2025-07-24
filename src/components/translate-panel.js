import { Vector3 } from "three";
import { roomPropertiesReader } from "../utils/rooms-properties";
import { selectedLanguage } from "../bit-systems/localization-system";

const PANEL_PADDING = 0.05;
const MIN_WIDTH = 1.1;

const GreetingPhrases = {
  spanish: "La traducción se mostrará aquí",
  italian: "La traduzione verrà mostrata qui",
  greek: "Η μετάφραση θα εμφανιστεί εδώ",
  dutch: "De vertaling wordt hier getoond",
  german: "Die Übersetzung wird hier angezeigt",
  english: "The translation will be displayed here"
};

// ✅ Line-based buffer with dots
class LineBuffer {
  constructor(updateCallback, msPerWord = 400) {
    this.updateCallback = updateCallback;
    this.msPerWord = msPerWord;
    this.queue = [];
    this.isShowing = false;
    this.dotTimer = null;
    this.dotStage = 0;
  }

  startDots() {
    this.stop(); // stop any previous timers
    this.dotStage = 0;
    this.dotTimer = setInterval(() => {
      const dots = ".".repeat((this.dotStage % 3) + 1);
      this.dotStage++;
      this.updateCallback(dots); // just dots as placeholder
    }, 500);
  }

  stop() {
    if (this.dotTimer) {
      clearInterval(this.dotTimer);
      this.dotTimer = null;
    }
  }

  enqueue(text) {
    this.stop();
    this.queue.push(text);
    if (!this.isShowing) this.flush();
  }

  // flush() {
  //   if (this.queue.length === 0) {
  //     this.isShowing = false;
  //     return;
  //   }

  //   this.isShowing = true;
  //   const nextLine = this.queue.shift();
  //   const wordCount = nextLine.trim().split(/\s+/).length;
  //   const delay = Math.max(1000, wordCount * this.msPerWord); // safety min

  //   this.updateCallback(nextLine);

  //   setTimeout(() => this.flush(), delay);
  // }

  flush() {
    if (this.queue.length === 0) {
      this.isShowing = false;
      return;
    }
  
    this.isShowing = true;
  
    const nextLine = this.queue.shift();
    const wordCount = nextLine.trim().split(/\s+/).length;
    const delay = Math.max(1000, wordCount * this.msPerWord); // word-based delay
  
    // ⏱ Step 1: blank screen
    this.updateCallback(""); // trigger black panel phase
  
    setTimeout(() => {
      // ⏱ Step 2: show actual text after 300ms blank
      this.updateCallback(nextLine);
  
      // ⏱ Step 3: wait for display duration, then flush next
      setTimeout(() => this.flush(), delay);
    }, 300);
  }
}

AFRAME.registerComponent("translate-panel", {
  async init() {
    this.translateText = this.el.querySelector(".translate-text").object3D;
    this.translateBackground = this.el.querySelector(".translate-background").object3D;

    this.onShowPanel = this.onShowPanel.bind(this);
    this.onHidePanel = this.onHidePanel.bind(this);
    this.onUpdatePanel = this.onUpdatePanel.bind(this);
    this.updateTextSize = this.updateTextSize.bind(this);

    NAF.utils
      .getNetworkedEntity(this.el)
      .then(networkedEl => {
        this.playerSessionId = NAF.utils.getCreator(networkedEl);
        this.owner = networkedEl.components.networked.data.owner;
      })
      .catch(error => console.log(error));

    this.size = new Vector3();
    this.allowed = false;

    this.lineBuffer = new LineBuffer(text => {
      this.translateText.el.setAttribute("text", { value: text });
      this.translateText.el.addEventListener("text-updated", this.updateTextSize);
    });

    this.el.object3D.visible = false;

    await roomPropertiesReader.waitForProperties();
    this.allowed = roomPropertiesReader.AllowTrans;
  },

  play() {
    this.el.sceneEl.addEventListener("show_avatar_panel", this.onShowPanel);
    this.el.sceneEl.addEventListener("hide_avatar_panel", this.onHidePanel);
    this.el.sceneEl.addEventListener("update_avatar_panel", this.onUpdatePanel);
  },

  pause() {
    this.el.sceneEl.removeEventListener("show_avatar_panel", this.onShowPanel);
    this.el.sceneEl.removeEventListener("hide_avatar_panel", this.onHidePanel);
    this.el.sceneEl.removeEventListener("update_avatar_panel", this.onUpdatePanel);
  },

  onShowPanel({ detail: peerId }) {
    if (peerId !== this.owner || this.el.object3D.visible) return;

    this.lineBuffer.startDots(); // Start dot animation
    this.el.object3D.visible = true;
  },

  onHidePanel({ detail: peerId }) {
    if (peerId !== this.owner || !this.el.object3D.visible) return;

    this.lineBuffer.stop(); // Stop any timers
    this.el.object3D.visible = false;
  },

  onUpdatePanel({ detail: { id: peerId, message } }) {
    if (peerId === this.owner) {
      this.lineBuffer.enqueue(message);
    }
  },

  // updateTextSize() {
  //   this.translateText.el.components["text"].getSize(this.size);
  //   this.translateBackground.el.setAttribute("slice9", {
  //     width: this.size.x + PANEL_PADDING * 2,
  //     height: this.size.y + PANEL_PADDING * 2
  //   });
  // }

  updateTextSize() {
    this.translateText.el.components["text"].getSize(this.size);
  
    const width = Math.max(this.size.x + PANEL_PADDING * 2, MIN_WIDTH);
    const height = this.size.y + PANEL_PADDING * 2;
  
    this.translateBackground.el.setAttribute("slice9", {
      width,
      height
    });
  }
});
