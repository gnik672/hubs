/**
 * Registers a click handler and invokes the block method on the NAF adapter for the owner associated with its entity.
 * @namespace network
 * @component translate-panel
 */

import { Vector3 } from "three";
import { roomPropertiesReader } from "../utils/rooms-properties";
import { selectedLanguage } from "../bit-systems/localization-system";

const PANEL_PADDING = 0.05;

AFRAME.registerComponent("translate-panel", {
  async init() {
    this.translateText = this.el.querySelector(".translate-text").object3D;
    this.translateBackground = this.el.querySelector(".translate-background").object3D;

    this.onShowPanel = this.onShowPanel.bind(this);
    this.onHidePanel = this.onHidePanel.bind(this);
    this.onUpdatePanel = this.onUpdatePanel.bind(this);

    this.updateTextSize = this.updateTextSize.bind(this);
    this.fortmatLines = this.fortmatLines.bind(this);

    NAF.utils
      .getNetworkedEntity(this.el)
      .then(networkedEl => {
        this.playerSessionId = NAF.utils.getCreator(networkedEl);
        this.owner = networkedEl.components.networked.data.owner;
      })
      .catch(error => console.log(error));

    this.size = new Vector3();
    this.preformatText;
    this.formattedText;

    this.targetLanguage = false;
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

    this.el.sceneEl.addEventListener("translation_available", this.onAvailableTranslation);
    this.UpdateText(GreetingPhrases[selectedLanguage]);
    this.el.object3D.visible = true;
  },

  onHidePanel({ detail: peerId }) {
    if (peerId !== this.owner || !this.el.object3D.visible) return;

    this.el.sceneEl.removeEventListener("translation_available", this.onAvailableTranslation);
    this.el.object3D.visible = false;
  },
  onUpdatePanel({ detail: { id: peerId, message: message } }) {
    if (peerId === this.owner) this.UpdateText(message);
  },

  UpdateText(text) {
    if (!text) return;
    this.preformatText = text;
    this.fortmatLines();
    this.translateText.el.addEventListener("text-updated", this.updateTextSize);
    this.translateText.el.setAttribute("text", {
      value: this.formattedText
    });
  },

  updateTextSize() {
    this.translateText.el.components["text"].getSize(this.size);
    this.translateBackground.el.setAttribute("slice9", {
      width: this.size.x + PANEL_PADDING * 2,
      height: this.size.y + PANEL_PADDING * 2
    });
  },

  fortmatLines() {
    const lines = this.preformatText.split(/\s+/);
    const line_size = lines.length;
    const maxStep = 7;
    const step = line_size / 2 > maxStep ? maxStep : line_size > 3 ? Math.ceil(line_size / 2) : line_size;
    this.formattedText = lines.map((word, index) => (index % step === step - 1 ? word + "\n" : word)).join(" ");
  }
});

export const GreetingPhrases = {
  spanish: "La traducción se mostrará aquí",
  italian: "La traduzione verrà mostrata qui",
  greek: "Η μετάφραση θα εμφανιστεί εδώ",
  dutch: "De vertaling wordt hier getoond",
  german: "Die Übersetzung wird hier angezeigt",
  english: "The translation will be displayed here"
};
