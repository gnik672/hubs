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
        // logger.AddUiInteraction("visit_room", tutorialManager.changeRoomID);
      const mayChangeScene = this.el.sceneEl.systems.permissions.canOrWillIfCreator("update_hub");

      const exitImmersive = async () => await handleExitTo2DInterstitial(false, () => {}, true);


      const username = window?.APP?.store?.state?.profile?.displayName;


// from lobby  session 1

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
      const hubId = "TfszbgC"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;  

     }

     if(window.APP.hub.hub_id ===  "TfszbgC"  
     ) { 
      const hubId = "Lf5offt"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;  

     }

     if(window.APP.hub.hub_id ===  "Lf5offt"  
     ) { 
      if (username === "user-1" || username === "user-2" ){
        const hubId = "DSinvBh"; // Your room ID
       const waypoint = null;   // Or a specific waypoint ID if needed
       changeHub(hubId, true, waypoint);
       return; 

     }

     if (username === "user-3" || username === "user-4" ){
      const hubId = "vCAqAvY"; // Your room ID
       const waypoint = null;   // Or a specific waypoint ID if needed
        changeHub(hubId, true, waypoint);
       return;    }
       if (username === "user-5" || username === "user-6" ){
        const hubId = "MZbYQFN"; // Your room ID
         const waypoint = null;   // Or a specific waypoint ID if needed
         changeHub(hubId, true, waypoint);
         return;    }
         if (username === "user-7" || username === "user-8" ){
          const hubId = "DzM288m"; // Your room ID
           const waypoint = null;   // Or a specific waypoint ID if needed
           changeHub(hubId, true, waypoint);
           return;    }   
           if (username === "user-9" || username === "user-10" ){
            const hubId = "zKapQ9v"; // Your room ID
             const waypoint = null;   // Or a specific waypoint ID if needed
             changeHub(hubId, true, waypoint);
             return;    }  
                          
    
   }

   if(window.APP.hub.hub_id ===  "DSinvBh" || 
   window.APP.hub.hub_id ===  "vCAqAvY" ||
    window.APP.hub.hub_id ===  "MZbYQFN" || 
   window.APP.hub.hub_id ===  "DzM288m" || 
   window.APP.hub.hub_id ===  "zKapQ9v" || 
   window.APP.hub.hub_id ===  "a9a9C6U" || 
   window.APP.hub.hub_id ===  "5pUKqhb" || 
   window.APP.hub.hub_id ===  "sY6HJki" || 
   window.APP.hub.hub_id ===  "9wwPDe8" || 
   window.APP.hub.hub_id ===  "hBEMigy" || 
   window.APP.hub.hub_id ===  "xKkxuwL" || 
   window.APP.hub.hub_id ===  "ngXS8Dg" || 
   window.APP.hub.hub_id ===  "Eo8WYHm" || 
   window.APP.hub.hub_id ===  "P34XsVp" || 
   window.APP.hub.hub_id ===  "6KRbEwB" || 
   window.APP.hub.hub_id ===  "VXyBdWu" || 
   window.APP.hub.hub_id ===  "Arvck4f" ||  
   window.APP.hub.hub_id ===  "aFNyuny" || 
   window.APP.hub.hub_id ===  "fkLMpzR" || 
   window.APP.hub.hub_id ===  "Wrof4qm" 
   ) {return}
   
  
 

// from lobby  session 2

if(window.APP.hub.hub_id ===  "oLohVr8" ||
window.APP.hub.hub_id ===  "LB93AmU" || 
window.APP.hub.hub_id ===  "XQPkmkk" ||
  window.APP.hub.hub_id ===  "9f3jrjg" ||
  window.APP.hub.hub_id ===  "XfETMdM" || 
   window.APP.hub.hub_id ===  "zKM5ykf" ||
    window.APP.hub.hub_id ===  "PKXyPyW" || 
     window.APP.hub.hub_id ===  "Db39mTE"  || 
     window.APP.hub.hub_id ===  "znaYFyF" || 
     window.APP.hub.hub_id ===  "6RobLnj" 
     ) { 
      const hubId = "CDvPjH9"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;  

     }

     if(window.APP.hub.hub_id ===  "CDvPjH9"  
     ) { 
      const hubId = "5tsdP2w"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;  

     }

     if(window.APP.hub.hub_id ===  "5tsdP2w"  
     ) { 
      if (username === "user-11" || username === "user-12" ){
        const hubId = "a9a9C6U"; // Your room ID
       const waypoint = null;   // Or a specific waypoint ID if needed
       changeHub(hubId, true, waypoint);
       return; 

     }

     if (username === "user-13" || username === "user-14" ){
      const hubId = "5pUKqhb"; // Your room ID
       const waypoint = null;   // Or a specific waypoint ID if needed
        changeHub(hubId, true, waypoint);
       return;    }
       if (username === "user-15" || username === "user-16" ){
        const hubId = "sY6HJki"; // Your room ID
         const waypoint = null;   // Or a specific waypoint ID if needed
         changeHub(hubId, true, waypoint);
         return;    }
         if (username === "user-17" || username === "user-18" ){
          const hubId = "9wwPDe8"; // Your room ID
           const waypoint = null;   // Or a specific waypoint ID if needed
           changeHub(hubId, true, waypoint);
           return;    }   
           if (username === "user-19" || username === "user-20" ){
            const hubId = "hBEMigy"; // Your room ID
             const waypoint = null;   // Or a specific waypoint ID if needed
             changeHub(hubId, true, waypoint);
             return;    }  
                          
    
   }




// from lobby  session 3

if(window.APP.hub.hub_id ===  "24DXNLW" ||
window.APP.hub.hub_id ===  "oqbV9pN" || 
window.APP.hub.hub_id ===  "xHduK5S" ||
  window.APP.hub.hub_id ===  "ZdhFkXn" ||
  window.APP.hub.hub_id ===  "kz2E9Vi" || 
   window.APP.hub.hub_id ===  "3g9FXe7" ||
    window.APP.hub.hub_id ===  "FMnPety" || 
     window.APP.hub.hub_id ===  "HzFHXBA"  || 
     window.APP.hub.hub_id ===  "sgvW4vB" || 
     window.APP.hub.hub_id ===  "pir7nGq" 
     ) { 
      const hubId = "uYLmstU"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;  

     }

     if(window.APP.hub.hub_id ===  "uYLmstU"  
     ) { 
      const hubId = "wmJrZRW"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;  

     }

     if(window.APP.hub.hub_id ===  "wmJrZRW"  
     ) { 
      if (username === "user-21" || username === "user-22" ){
        const hubId = "xKkxuwL"; // Your room ID
       const waypoint = null;   // Or a specific waypoint ID if needed
       changeHub(hubId, true, waypoint);
       return; 

     }

     if (username === "user-23" || username === "user-24" ){
      const hubId = "ngXS8Dg"; // Your room ID
       const waypoint = null;   // Or a specific waypoint ID if needed
        changeHub(hubId, true, waypoint);
       return;    }
       if (username === "user-25" || username === "user-26" ){
        const hubId = "Eo8WYHm"; // Your room ID
         const waypoint = null;   // Or a specific waypoint ID if needed
         changeHub(hubId, true, waypoint);
         return;    }
         if (username === "user-27" || username === "user-28" ){
          const hubId = "P34XsVp"; // Your room ID
           const waypoint = null;   // Or a specific waypoint ID if needed
           changeHub(hubId, true, waypoint);
           return;    }   
           if (username === "user-29" || username === "user-30" ){
            const hubId = "6KRbEwB"; // Your room ID
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



// from lobby  session 4

if(window.APP.hub.hub_id ===  "e9WjxAt" ||
window.APP.hub.hub_id ===  "T88zL9U" || 
window.APP.hub.hub_id ===  "J2LSN4u" ||
  window.APP.hub.hub_id ===  "xvxN2NR" ||
  window.APP.hub.hub_id ===  "7dJQzWL" || 
   window.APP.hub.hub_id ===  "5tkKH9e" ||
    window.APP.hub.hub_id ===  "NDe82ac" || 
     window.APP.hub.hub_id ===  "p9krCnq"  || 
     window.APP.hub.hub_id ===  "dghjLoq" || 
     window.APP.hub.hub_id ===  "iFtyp99" 
     ) { 
      const hubId = "4P2AN2P"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;  

     }

     if(window.APP.hub.hub_id ===  "4P2AN2P"  
     ) { 
      const hubId = "JqLXc2T"; // Your room ID
      const waypoint = null;   // Or a specific waypoint ID if needed
      changeHub(hubId, true, waypoint);
      return;  

     }

     if(window.APP.hub.hub_id ===  "JqLXc2T"  
     ) { 
      if (username === "user-31" || username === "user-32" ){
        const hubId = "VXyBdWu"; // Your room ID
       const waypoint = null;   // Or a specific waypoint ID if needed
       changeHub(hubId, true, waypoint);
       return; 

     }

     if (username === "user-33" || username === "user-34" ){
      const hubId = "Arvck4f"; // Your room ID
       const waypoint = null;   // Or a specific waypoint ID if needed
        changeHub(hubId, true, waypoint);
       return;    }
       if (username === "user-35" || username === "user-36" ){
        const hubId = "aFNyuny"; // Your room ID
         const waypoint = null;   // Or a specific waypoint ID if needed
         changeHub(hubId, true, waypoint);
         return;    }
         if (username === "user-37" || username === "user-38" ){
          const hubId = "fkLMpzR"; // Your room ID
           const waypoint = null;   // Or a specific waypoint ID if needed
           changeHub(hubId, true, waypoint);
           return;    }   
           if (username === "user-39" || username === "user-40" ){
            const hubId = "Wrof4qm"; // Your room ID
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
