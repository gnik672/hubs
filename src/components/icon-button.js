/**
 * A button with an image, tooltip, hover states.
 * @namespace ui
 * @component icon-button
 */

import { IconTranslationDict } from "../bit-systems/localization-system";

AFRAME.registerComponent("icon-button", {
  schema: {
    image: { type: "string" },
    hoverImage: { type: "string" },
    activeImage: { type: "string" },
    activeHoverImage: { type: "string" },
    disabledImage: { type: "string" },
    active: { type: "boolean" },
    disabled: { type: "boolean" },
    tooltip: { type: "selector" },
    tooltipText: { type: "string" },
    activeTooltipText: { type: "string" }
  },

  init() {
    this.el.object3D.matrixNeedsUpdate = true;
    this.onHover = () => {
      this.hovering = true;
      if (this.data.tooltip) {
        this.data.tooltip.object3D.visible = true;
      }
      this.updateButtonState();
    };
    this.onHoverOut = () => {
      this.hovering = false;
      if (this.data.tooltip) {
        this.data.tooltip.object3D.visible = false;
      }
      this.updateButtonState();
    };
  },

  play() {
    this.updateButtonState();
    this.el.object3D.addEventListener("hovered", this.onHover);
    this.el.object3D.addEventListener("unhovered", this.onHoverOut);
    // this.el.sceneEl.addEventListener("room_properties_updated", this.updateButtonState);
  },

  pause() {
    this.el.object3D.removeEventListener("hovered", this.onHover);
    this.el.object3D.removeEventListener("unhovered", this.onHoverOut);
    // this.el.sceneEl.removeEventListener("room_properties_updated", this.updateButtonState);
  },

  update() {
    this.updateButtonState();
  },

  updateButtonState() {
    const hovering = this.hovering;
    const active = this.data.active;
    const disabled = this.data.disabled;

    let image;
    if (disabled) {
      image = "disabledImage";
      this.el.object3D.visible = false;
    } else if (active) {
      this.el.object3D.visible = true;
      image = hovering ? "activeHoverImage" : "activeImage";
    } else {
      this.el.object3D.visible = true;
      image = hovering ? "hoverImage" : "image";
    }

    if (this.el.components.sprite) {
      if (this.data[image]) {
        this.el.setAttribute("sprite", "name", this.data[image]);
      } else {
        console.warn(`No ${image} image on me.`, this);
      }
    } else {
      console.error("No sprite.");
    }

    if (this.data.tooltip && hovering) {
      let tooltipText;
      console.log(
        "icon-button-log",
        IconTranslationDict()[this.data.tooltipText],
        IconTranslationDict(),
        this.data.tooltipText
      );
      tooltipText = this.data.active ? this.data.activeTooltipText : this.data.tooltipText;

      if (tooltipText && IconTranslationDict()[tooltipText]) tooltipText = IconTranslationDict()[tooltipText];
      tooltipText = disabled ? "" : tooltipText;

      this.data.tooltip.querySelector("[text]").setAttribute("text", "value", tooltipText);
    }
  }
});
