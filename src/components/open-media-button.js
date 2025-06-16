import { isLocalHubsUrl, isLocalHubsSceneUrl, isHubsRoomUrl, isLocalHubsAvatarUrl } from "../utils/media-url-utils";
import { guessContentType } from "../utils/media-url-utils";
import { handleExitTo2DInterstitial } from "../utils/vr-interstitial";
import { changeHub } from "../change-hub";
import { tutorialManager } from "../bit-systems/tutorial-system";
import { logger } from "../bit-systems/logging-system";
import { roomPropertiesReader } from "../utils/rooms-properties";
import { IconTranslationDict } from "../bit-systems/localization-system";

AFRAME.registerComponent("open-media-button", {
  schema: {
    onlyOpenLink: { type: "boolean" }
  },
  init() {
    this.label = this.el.querySelector("[text]");

    this.updateSrc = async () => {
      if (!this.targetEl.parentNode) return; // If removed
      const mediaLoader = this.targetEl.components["media-loader"].data;
      const src = (this.src = (mediaLoader.mediaOptions && mediaLoader.mediaOptions.href) || mediaLoader.src);
      const visible = src && guessContentType(src) !== "video/vnd.hubs-webrtc";
      const mayChangeScene = this.el.sceneEl.systems.permissions.canOrWillIfCreator("update_hub");

      this.el.object3D.visible = !!visible;

      if (visible) {
        let label = "open link";
        if (!this.data.onlyOpenLink) {
          let hubId;
          if (await isLocalHubsAvatarUrl(src)) {
            label = "use avatar";
          } else if ((await isLocalHubsSceneUrl(src)) && mayChangeScene) {
            label = "use scene";
          } else if ((hubId = await isHubsRoomUrl(src))) {
            const url = new URL(src);
            if (url.hash && window.APP.hub.hub_id === hubId) {
              label = "go to";
            } else {
              label = IconTranslationDict()["change-hub.message"];
              tutorialManager.changeRoomID = hubId;
            }
          }
        }
        this.label.setAttribute("text", "value", label);
      }
    };

//     this.onClick = async () => {
//  console.log(window.APP.hub.hub_id)



//     };

    this.onClick = async () => {
      // if (this.label.getAttribute("text") === oldTranslationSystem.VisitButtonText)
      //   logger.AddUiInteraction("visit_room", tutorialManager.changeRoomID);
      const mayChangeScene = this.el.sceneEl.systems.permissions.canOrWillIfCreator("update_hub");

      const exitImmersive = async () => await handleExitTo2DInterstitial(false, () => {}, true);


      const username = window?.APP?.store?.state?.profile?.displayName;


// from lobby production

if(window.APP.hub.hub_id ===  "QBomv74" ||
window.APP.hub.hub_id ===  "DdXYP6a" || 
window.APP.hub.hub_id ===  "zts4Mhv" ||
  window.APP.hub.hub_id ===  "8LmzBua" ||
  window.APP.hub.hub_id ===  "hpk8p7Z" || 
   window.APP.hub.hub_id ===  "nPwkCBC" ||
    window.APP.hub.hub_id ===  "HdzqxT7" || 
     window.APP.hub.hub_id ===  "iuUMSDP"  || 
     window.APP.hub.hub_id ===  "ZwawSJC" || 
     window.APP.hub.hub_id ===  "pe5ngbm" 
     ) {

      if (username === "user-a" || username === "user-b" ){
        const hubId = "DSinvBh"; // Your room ID
       const waypoint = null;   // Or a specific waypoint ID if needed
       changeHub(hubId, true, waypoint);
       return; 
     }
     if (username === "user-c" || username === "user-d" ){
     const hubId = "vCAqAvY"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;    }
      if (username === "user-e" || username === "user-f" ){
       const hubId = "MZbYQFN"; // Your room ID
        const waypoint = null;   // Or a specific waypoint ID if needed
        changeHub(hubId, true, waypoint);
        return;    }
        if (username === "user-g" || username === "user-h" ){
         const hubId = "DzM288m"; // Your room ID
          const waypoint = null;   // Or a specific waypoint ID if needed
          changeHub(hubId, true, waypoint);
          return;    }
          if (username === "user-i" || username === "user-j" ){
           const hubId = "zKapQ9v"; // Your room ID
            const waypoint = null;   // Or a specific waypoint ID if needed
            changeHub(hubId, true, waypoint);
            return;    }
    

     }

                           
                          
                       
                       
                           
                         
                         
                           
                         
    



      if(window.APP.hub.hub_id ===  "o5VDamq"){
        if (username === "user-a" || username === "user-b" ){
           const hubId = "H7yKnL7"; // Your room ID
          const waypoint = null;   // Or a specific waypoint ID if needed
          changeHub(hubId, true, waypoint);
          return; 
        }
        if (username === "user-c" || username === "user-d" ){
        const hubId = "K7Be7u8"; // Your room ID
         const waypoint = null;   // Or a specific waypoint ID if needed
         changeHub(hubId, true, waypoint);
         return;    }
         if (username === "user-e" || username === "user-f" ){
          const hubId = "K7Be7u8"; // Your room ID
           const waypoint = null;   // Or a specific waypoint ID if needed
           changeHub(hubId, true, waypoint);
           return;    }
           if (username === "user-g" || username === "user-h" ){
            const hubId = "K7Be7u8"; // Your room ID
             const waypoint = null;   // Or a specific waypoint ID if needed
             changeHub(hubId, true, waypoint);
             return;    }
             if (username === "user-i" || username === "user-j" ){
              const hubId = "K7Be7u8"; // Your room ID
               const waypoint = null;   // Or a specific waypoint ID if needed
               changeHub(hubId, true, waypoint);
               return;    }
       
  
   }  
  
   if(window.APP.hub.hub_id ===  "H7yKnL7"){
    // Force redirect if this is the specific room we want
    // if (src === "https://hubs.local:4000/H7yKnL7/") {
      const hubId = "o5VDamq"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;
    // }
  
  } 


      let hubId;
      if (this.data.onlyOpenLink) {
        await exitImmersive();
        window.open(this.src);
      } else if (await isLocalHubsAvatarUrl(this.src)) {
        const avatarId = new URL(this.src).pathname.split("/").pop();
        window.APP.store.update({ profile: { avatarId } });
        this.el.sceneEl.emit("avatar_updated");
      } else if ((await isLocalHubsSceneUrl(this.src)) && mayChangeScene) {
        this.el.sceneEl.emit("scene_media_selected", this.src);
      } else if ((hubId = await isHubsRoomUrl(this.src))) {
        const url = new URL(this.src);
        if (url.hash && window.APP.hub.hub_id === hubId) {
          // move to waypoint w/o writing to history
          window.history.replaceState(null, null, window.location.href.split("#")[0] + url.hash);
        } else if (isLocalHubsUrl(this.src)) {
          const waypoint = url.hash && url.hash.substring(1);
          // move to new room without page load or entry flow
          changeHub(hubId, true, waypoint);
        } else {
          await exitImmersive();
          location.href = this.src;
        }
      } else {
        await exitImmersive();
        window.open(this.src);
      }
    };

    NAF.utils.getNetworkedEntity(this.el).then(networkedEl => {
      this.targetEl = networkedEl;
      this.targetEl.addEventListener("media_resolved", this.updateSrc, { once: true });
      this.updateSrc();
    });
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  }
});
