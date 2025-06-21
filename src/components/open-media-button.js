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
            console.log("scene")
            console.log(src)
            label = "use scene";
          } else if ((hubId = await isHubsRoomUrl(src))) {
            console.log("room")
          console.log(src)
            
            const url = new URL(src);
            if (url.hash && window.APP.hub.hub_id === hubId) {
              label = "go to";
            } else {
              label = IconTranslationDict()["change-hub.message"];
              tutorialManager.changeRoomID = hubId;
              console.log( tutorialManager.changeRoomID)
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

      // TfszbgC
      
      // hubId = await isHubsRoomUrl(this.src)
      // console.log(hubId)
      // if (this.label.getAttribute("text") === oldTranslationSystem.VisitButtonText)
      //   logger.AddUiInteraction("visit_room", tutorialManager.changeRoomID);
      const mayChangeScene = this.el.sceneEl.systems.permissions.canOrWillIfCreator("update_hub");

      const exitImmersive = async () => await handleExitTo2DInterstitial(false, () => {}, true);


      const username = window?.APP?.store?.state?.profile?.displayName;

      // let hubIdt  

 
      // if ((hubIdt = await isHubsRoomUrl(this.src))) {
      //   // 👇 Redirect override logic
      //   if (hubIdt === "TfszbgC") {
      //     const newHubId = "TfszbgD";
      //     const base = this.src.split("#")[0];
      //     this.src = base.replace(/\/[^/]+\/?$/, "/" + newHubId);
      //     hubIdt = newHubId;
      //     console.log("Overriding destination: ABC1234 ➡ XYZ9999");
      //   }
    
      //   const url = new URL(this.src);
      //   if (url.hash && window.APP.hub.hub_id === hubIdt) {
      //     window.history.replaceState(null, null, window.location.href.split("#")[0] + url.hash);
      //   } else if (await isLocalHubsUrl(this.src)) {
      //     const waypoint = url.hash && url.hash.substring(1);
      //     changeHub(hubIdt, true, waypoint);
      //   } else {
      //     await exitImmersive();
      //     location.href = this.src;
      //   }
    
      //   return;
      // }
    
      // Fallback for other types of content
      if (await isLocalHubsAvatarUrl(this.src)) {
        console.log(this.src)
        const avatarId = new URL(this.src).pathname.split("/").pop();
        window.APP.store.update({ profile: { avatarId } });
        this.el.sceneEl.emit("avatar_updated");
      } else if ((await isLocalHubsSceneUrl(this.src)) && mayChangeScene) {
        this.el.sceneEl.emit("scene_media_selected", this.src);
      } else { 
        console.log(this.src)
        let newUrl
        if(this.src.includes("DSinvBh") ){
          if(username === "user-1" ||username === "user-2" ) {
            newUrl =  this.url.replace("DSinvBh", "DSinvBh");
          }
          if(username === "user-3" ||username === "user-4" ) {
            newUrl =   this.src.replace("AxFm4cE", "vCAqAvY"); 
          }
          if(username === "user-5" ||username === "user-6" ) {
            newUrl =       this.url.replace("DSinvBh", "MZbYQFN");
          }
          if(username === "user-7" ||username === "user-8" ) {
            newUrl =    this.url.replace("DSinvBh", "DzM288m");
          }
          if(username === "user-9" ||username === "user-10" ) {
            newUrl =     this.url.replace("DSinvBh", "zKapQ9v");
          }  

          if(username === "user-11" ||username === "user-12" ) {
            newUrl =   this.url.replace("DSinvBh", "a9a9C6U");
             }
             if(username === "user-13" ||username === "user-14" ) {
               newUrl =   this.src.replace("DSinvBh", "5pUKqhb"); 
             }
             if(username === "user-15" ||username === "user-16" ) {
              newUrl =  this.url.replace("DSinvBh", "sY6HJki");
             }
             if(username === "user-17" ||username === "user-18" ) {
              newUrl =    this.url.replace("DSinvBh", "9wwPDe8");
             }
             if(username === "user-19" ||username === "user-20" ) {
              newUrl =     this.url.replace("DSinvBh", "hBEMigy"); 
             }  

         if(username === "user-21" ||username === "user-22" ) {
          newUrl = this.url.replace("DSinvBh", "xKkxuwL");
           }
           if(username === "user-23" ||username === "user-24" ) {
             newUrl =  this.src.replace("DSinvBh", "ngXS8Dg"); 
           }
           if(username === "user-25" ||username === "user-26" ) {
            newUrl =   this.url.replace("DSinvBh", "Eo8WYHm");
           }
           if(username === "user-27" ||username === "user-28" ) {
            newUrl =   this.url.replace("DSinvBh", "P34XsVp");
           }
           if(username === "user-29" ||username === "user-30" ) {
            newUrl =   this.url.replace("DSinvBh", "6KRbEwB"); 
              }  

           if(username === "user-31" ||username === "user-32" ) {
            newUrl = this.url.replace("DSinvBh", "VXyBdWu");
            }
               if(username === "user-33" ||username === "user-34" ) {
           newUrl =  this.src.replace("DSinvBh", "Arvck4f"); 
            }
           if(username === "user-35" ||username === "user-36" ) {
            newUrl =   this.url.replace("DSinvBh", "aFNyuny");
             }
            if(username === "user-37" ||username === "user-38" ) {
             newUrl =  this.url.replace("DSinvBh", "fkLMpzR");
             }
              if(username === "user-39" ||username === "user-40" ) {
              newUrl =  this.url.replace("DSinvBh", "Wrof4qm"); 
             }   
         }  

         if(this.src.includes("TfszbgC") ){
          if(username === "user-1" ||username === "user-2" || username === "user-3" ||username === "user-4" 
          || username === "user-5" ||username === "user-6" || username === "user-7" ||username === "user-8"
          || username === "user-9" ||username === "user-10"
          ) {
            newUrl = this.url.replace("TfszbgC", "TfszbgC"); 
          }

          if(username === "user-11" ||username === "user-12" || username === "user-13" ||username === "user-14" 
          || username === "user-15" ||username === "user-16" || username === "user-17" ||username === "user-18"
          || username === "user-19" ||username === "user-20"
          ) {
            newUrl = this.url.replace("TfszbgC", "CDvPjH9"); 
          }

          if(username === "user-21" ||username === "user-22" || username === "user-23" ||username === "user-24" 
          || username === "user-25" ||username === "user-26" || username === "user-27" ||username === "user-28"
          || username === "user-29" ||username === "user-30"
          ) {
            newUrl = this.url.replace("TfszbgC", "uYLmstU"); 
          }

          if(username === "user-31" ||username === "user-32" || username === "user-33" ||username === "user-34" 
          || username === "user-35" ||username === "user-36" || username === "user-37" ||username === "user-38"
          || username === "user-39" ||username === "user-40"
          ) {
            newUrl = this.url.replace("TfszbgC", "4P2AN2P");  
          } 
    
         }  

         if(this.src.includes("AxFm4cE") ){
          if(username === "user-1" ||username === "user-2" || username === "user-3" ||username === "user-4" 
          || username === "user-5" ||username === "user-6" || username === "user-7" ||username === "user-8"
          || username === "user-9" ||username === "user-10"
          ) {
            newUrl = this.url.replace("AxFm4cE", "Lf5offt"); 
          }

          if(username === "user-11" ||username === "user-12" || username === "user-13" ||username === "user-14" 
          || username === "user-15" ||username === "user-16" || username === "user-17" ||username === "user-18"
          || username === "user-19" ||username === "user-20"
          ) {
            newUrl = this.url.replace("AxFm4cE", "5tsdP2w"); 
          }

          if(username === "user-21" ||username === "user-22" || username === "user-23" ||username === "user-24" 
          || username === "user-25" ||username === "user-26" || username === "user-27" ||username === "user-28"
          || username === "user-29" ||username === "user-30"
          ) {
            newUrl = this.url.replace("AxFm4cE", "wmJrZRW"); 
          }

          if(username === "user-31" ||username === "user-32" || username === "user-33" ||username === "user-34" 
          || username === "user-35" ||username === "user-36" || username === "user-37" ||username === "user-38"
          || username === "user-39" ||username === "user-40"
          ) {
            newUrl = this.url.replace("AxFm4cE", "JqLXc2T");  
          } 
    
         }  

         if(this.src.includes("pptdq9h") ){
          if(username === "user-1" ||username === "user-2" || username === "user-3" ||username === "user-4" 
          || username === "user-5" ||username === "user-6" || username === "user-7" ||username === "user-8"
          || username === "user-9" ||username === "user-10"
          ) {
            newUrl = this.url.replace("pptdq9h", "pptdq9h"); 
          }

          if(username === "user-11" ||username === "user-12" || username === "user-13" ||username === "user-14" 
          || username === "user-15" ||username === "user-16" || username === "user-17" ||username === "user-18"
          || username === "user-19" ||username === "user-20"
          ) {
            newUrl = this.url.replace("pptdq9h", "Ux9B9zu"); 
          }

          if(username === "user-21" ||username === "user-22" || username === "user-23" ||username === "user-24" 
          || username === "user-25" ||username === "user-26" || username === "user-27" ||username === "user-28"
          || username === "user-29" ||username === "user-30"
          ) {
            newUrl = this.url.replace("pptdq9h", "FwL5nC4"); 
          }

          if(username === "user-31" ||username === "user-32" || username === "user-33" ||username === "user-34" 
          || username === "user-35" ||username === "user-36" || username === "user-37" ||username === "user-38"
          || username === "user-39" ||username === "user-40"
          ) {
            newUrl = this.url.replace("pptdq9h", "fnC7hcb");  
          } 
    
         }  

        
        
           await exitImmersive();
           window.open(newUrl);
      }
return
      

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
        
        console.log(hubId)
        const url = new URL(this.src);
        if (url.hash && window.APP.hub.hub_id === hubId) {
        
          // move to waypoint w/o writing to history
          window.history.replaceState(null, null, window.location.href.split("#")[0] + url.hash);
        } else if (isLocalHubsUrl(this.src)) {
          const waypoint = url.hash && url.hash.substring(1);
          // move to new room without page load or entry flow
          console.log("hubId")
          console.log(hubId)
          return
          // changeHub(hubId, true, waypoint);
        } else {
          console.log(this.src)
          await exitImmersive();
          location.href = this.src;
        }
      } else {
        console.log(this.src)
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
