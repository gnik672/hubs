/**
 * Registers a click handler and invokes the block method on the NAF adapter for the owner associated with its entity.
 * @namespace network
 * @component translate-badge
 */

import { oldTranslationSystem } from "../bit-systems/old-translation-system";
import { translationSystem } from "../bit-systems/translation-system";
import { waitForDOMContentLoaded } from "../utils/async-utils";
import { roomPropertiesReader } from "../utils/rooms-properties";
import { getLastWorldPosition } from "../utils/three-utils";

AFRAME.registerComponent("translate-badge", {
  init() {
    //bindings
    this.UpdateRoomProperties = this.UpdateRoomProperties.bind(this);
    this.onClick = this.onClick.bind(this);

    //status variables
    this.el.object3D.visible = false;
    this.isTarget = false;
    this.withinBorder = false;
    this.allowed = false;

    this.borders = [];
    this.owner = null;
    this.playerSessionId = null;

    this.camWorldPos = new THREE.Vector3();
    this.translateIcon = this.el.querySelector(".translate_badge_icon").object3D;
    this.cancelIcon = this.el.querySelector(".cancel_translate_badge_icon").object3D;

    NAF.utils
      .getNetworkedEntity(this.el)
      .then(networkedEl => {
        this.playerSessionId = NAF.utils.getCreator(networkedEl);
        this.owner = networkedEl.components.networked.data.owner;
        console.log(`playerSession: "${this.playerSessionId}" owner: "${this.owner}"`);
      })
      .catch(error => console.log(error));

    waitForDOMContentLoaded().then(() => {
      this.cameraEl = document.getElementById("viewing-camera");
    });

    roomPropertiesReader
      .waitForProperties()
      .then(() => {
        this.SetTranslationVariables();
        this.el.object3D.addEventListener("interact", this.onClick);
        this.el.sceneEl.addEventListener("room_properties_updated", this.UpdateRoomProperties);
      })
      .catch(error => {
        console.error(error);
      });

    this.translateIcon.visible = true;
    this.cancelIcon.visible = false;

    console.log("badgeinfo", this.translateIcon.visible, this.cancelIcon.visible);
  },

  UpdateRoomProperties() {
    roomPropertiesReader
      .waitForProperties()
      .then(() => {
        this.SetTranslationVariables();
      })
      .catch(error => {
        console.error(error);
      });
  },

  async onClick() {
    if (!this.isTarget) {
      APP.dialog.subscribeToPeer(this.owner).then(() => {
        this.isTarget = true;
        translationSystem._addTarget(this.owner);
      });
    } else {
      APP.dialog.unsubscribeFromPeer(this.owner).then(() => {
        this.isTarget = false;
        translationSystem._removeTarget(this.owner);
      });
    }

    this.UpdateIcon();
  },
  UpdateIcon() {
    this.translateIcon.visible = !this.isTarget;
    this.cancelIcon.visible = this.isTarget;
    this.translateIcon.updateMatrix();
    this.cancelIcon.updateMatrix();
  },

  tick() {
    // if translation is allowed it computes if the button should be visible based on distance and borders
    // if room is not border contstrained then variable expressing this, is set to true and does not ever change
    if (!this.cameraEl || !roomPropertiesReader.read || !this.allowed) return;

    const worldPos = this.el.object3D.getWorldPosition(new THREE.Vector3());
    const isVisible = this.el.object3D.visible;

    getLastWorldPosition(this.cameraEl.object3DMap.camera, this.camWorldPos);

    if (this.borders.length > 0) {
      this.withinBorder =
        worldPos.x > this.borders[0] &&
        worldPos.x < this.borders[1] &&
        worldPos.z > this.borders[2] &&
        worldPos.z < this.borders[3];
      this.withinBorder = this.withinBorder && oldTranslationSystem.prevBorderState;
    } else {
      this.withinBorder = true;
    }

    const shouldBeVisible = this.withinBorder && worldPos.distanceTo(this.camWorldPos) < 2;

    if (isVisible !== shouldBeVisible) {
      this.el.object3D.visible = shouldBeVisible;
      this.UpdateIcon();
    }

    console.log(this.el.object3D.visible, this.cancelIcon.visible, this.translateIcon.visible);
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },
  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  },

  SetTranslationVariables() {
    // reads room properties. translate button needs to be visible only if translation
    // is allowed and the conversation type is bubble. check if there is need for border check

    this.allowed = roomPropertiesReader.AllowTrans;

    if (!this.allowed) {
      this.el.object3D.visible = false;
      return;
    }

    // check if there are spatiality constrains
    if (roomPropertiesReader.roomProps.translations[0].type === "borders") this.borders = transProps.spatiality.data;
    else this.withinBorder = true;
  }
});
