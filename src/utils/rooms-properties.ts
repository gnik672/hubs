import { virtualAgent } from "../bit-systems/agent-system";
import { languageCodes, voxLanugages } from "../bit-systems/localization-system";

export type Room = "lobby" | "conference room" | "main area" | "social area" | "business room" | "unknown";
import Lobby_1 from "../assets/images/help_lobby/1.png";
// import Lobby_2 from "../assets/images/help_lobby/2.png";
// import Lobby_3 from "../assets/images/help_lobby/3.png";
// import Lobby_4 from "../assets/images/help_lobby/4.png";
// import Lobby_5 from "../assets/images/help_lobby/5.png";
// import Lobby_6 from "../assets/images/help_lobby/6.png";
// import Lobby_7 from "../assets/images/help_lobby/7.png";
// import Lobby_8 from "../assets/images/help_lobby/8.png";
// import Lobby_9 from "../assets/images/help_lobby/9.png";
// import Lobby_10 from "../assets/images/help_lobby/10.png";

import Conference_1 from "../assets/images/help_conference/1.png";
import Conference_2 from "../assets/images/help_conference/2.png";
import Conference_3 from "../assets/images/help_conference/3.png";
import Conference_4 from "../assets/images/help_conference/4.png";


import Business_1 from "../assets/images/help_business/1.png";
import Business_2 from "../assets/images/help_business/2.png";
import Business_3 from "../assets/images/help_business/3.png";
import Business_4 from "../assets/images/help_business/4.png";


import EnglishRooms from "../assets/images/help_main_area/EnglishRoomNames.png";
import DutchRooms from "../assets/images/help_main_area/DutchRoomNames.png";
import GermanRooms from "../assets/images/help_main_area/GermanRoomNames.png";
import GreekRooms from "../assets/images/help_main_area/GreekRoomNames.png";
import ItalianRooms from "../assets/images/help_main_area/ItalianRoomNames.png";
import SpanishRooms from "../assets/images/help_main_area/SpanishRoomNames.png";
import Program from "../assets/images/help_main_area/ConferenceProgram.png";
import Ways from "../assets/images/help_main_area/ways_2_ask.png";
import How from "../assets/images/help_main_area/make_questions.png";
import Correct from "../assets/images/help_main_area/correct.png";
import Suggestions from "../assets/images/help_main_area/SuggestedQuestions.png";

import Social_1 from "../assets/images/help_social/1.png";
import Social_2 from "../assets/images/help_social/2.png"; 

interface Properties {
  name: Room;
  id?: string;
  labels: Label[];
  maps: Map[];
  navigations: { filename: string }[];
  translations: Translation[];
  tutorials: Tutorial[];
  congrats: TutorialMaterials[];
  agent: boolean;
  help: HelpSlide[];
  urls: {
    navqa_url: string;
    agent_url: string;
    translation_url: string;
    file_translation_url: string;
  };
}

export interface Label {
  name: string;
  scale: number;
  ratio: number;
  position: [number, number, number];
  rotation: [number, number, number];
  filename: string;
}

export interface Tutorial {
  name?: Room;
  position: number[];
  rotation: number[];
  type: "moving" | "fixed";
  scale: number;
  ratio: number;
  tutorialSlides: TutorialSlide[];
  tutorialMaterials: TutorialSlide[];
}

export interface TutorialMaterials {
  index: number;
  filename: string;
}

export interface TutorialSlide {
  index: number;
  name: string;
  filename: string;
}

export interface HelpSlide {
  index: number;
  ratio: number;
  filename: string;
}

export interface Translation {
  type: "bubble" | "presentation";
  spatiality: "room";
  panel: "avatar" | "fixed";
  type_data: number[];
  panel_data: [number, number, number];
  url: string;
}

interface Map {
  size: number[];
  scale: number;
  ratio: number;
  filename: string;
}

const invalidProps: Properties = {
  name: "unknown",
  maps: [],
  tutorials: [],
  navigations: [],
  help: [],
  labels: [],
  translations: [],
  congrats: [],
  urls: {
    navqa_url: "",
    agent_url: "",
    translation_url: "",
    file_translation_url: ""
  },
  agent: false
};

class RoomPropertiesReader {
  roomProps: Properties;
  serverURL: string;
  propertiesURL: string;
  hubId: string;
  read: boolean;
  language: voxLanugages;
  map: Map;
  translation: Translation;
  help: HelpSlide[];
  tutorial: Tutorial;
  labels: Label[];

  constructor() {
    this.read = false;
    this.serverURL = "https://repo.vox.lab.synelixis.com";
  }

 
  async Read2(HubID: string, reset: boolean): Promise<Properties> {
    if (reset) {
      this.read = false;
    }
  
    if (this.read) return Promise.resolve(this.roomProps);
    else {
      this.hubId = HubID;
  
      const maxRetries = 10;
      const baseDelay = 200; // ms
  
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const url = `${this.serverURL}/properties/rood/${this.hubId}?language=${languageCodes[this.language]}&user=${
            encodeURIComponent(APP.store.state.profile.displayName)
          }`;
  
          const response = await fetch(url, { method: "GET", mode: "cors" });
  
          if (!response.ok) throw new Error(`Response not OK (status ${response.status})`);
  
          const responseProperties = ((await response.json()) as { message: Properties }).message;






          this.roomProps = responseProperties;
          console.log("properties");
  
          if (this.roomProps.name === "social area") {
            virtualAgent.ResetUUID();
          }
  
          APP.scene!.emit("properties_loaded");
          break; // success, exit retry loop
  
        } catch (error) {
          console.warn(`Fetch attempt ${attempt} failed:`, error);
  
          if (attempt === maxRetries) {
            console.error("All retry attempts failed.");
            this.roomProps = invalidProps;
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
          }
        }
      }
  
      this.read = true;
      if (reset) APP.scene!.emit("room_properties_updated");
      return this.roomProps;
    }
  }

  async Read3(HubID: string, reset: boolean): Promise<Properties> {
    if (reset) {
      this.read = false;
    }
  
    if (this.read) return Promise.resolve(this.roomProps);
  
    this.hubId = HubID;
  
    const maxRetries = 10;
    const baseDelay = 200; // ms
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const languageCode = languageCodes[this.language] ?? "en";
        const username = encodeURIComponent(APP.store.state.profile.displayName ?? "unknown");
  
        // 💥 Use bad URL for attempts 1–3
        const path = attempt <= 3 ? "rood" : "room"; // 🔄 switch from fail to success
        const url = `${this.serverURL}/properties/${path}/${this.hubId}?language=${languageCode}&user=${username}`;
  
        console.log(`🧪 Attempt ${attempt}: Fetching ${url}`);
  
        const response = await fetch(url, { method: "GET", mode: "cors" });
  
        if (!response.ok) throw new Error(`Response not OK (status ${response.status})`);
  
        const responseProperties = ((await response.json()) as { message: Properties }).message;
        this.roomProps = responseProperties;
        console.log("✅ properties loaded");
  
        if (this.roomProps.name === "social area") {
          virtualAgent.ResetUUID();
        }
  
        APP.scene!.emit("properties_loaded");
        break; // 🎯 Success: stop retrying
  
      } catch (error) {
        console.warn(`❌ Fetch attempt ${attempt} failed:`, error);
  
        if (attempt === maxRetries) {
          console.error("🚨 All retry attempts failed.");
          this.roomProps = invalidProps;
        } else {
          await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
        }
      }
    }
  
    this.read = true;
    if (reset) APP.scene!.emit("room_properties_updated");
    return this.roomProps;
  }

  async Read4(HubID: string, reset: boolean): Promise<Properties> {
    if (reset) {
      this.read = false;
    }
  
    if (this.read) return Promise.resolve(this.roomProps);
  
    this.hubId = HubID;
  
    const maxRetries = 3;
    const baseDelay = 200; // ms
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const languageCode = languageCodes[this.language] ?? "en";
        const username = encodeURIComponent(APP.store.state.profile.displayName ?? "unknown");
  
        // 💥 Intentionally invalid URL to force failure
        const url = `${this.serverURL}/properties/rood/${this.hubId}?language=${languageCode}&user=${username}`;
  
        console.log(`🧪 Attempt ${attempt}: Fetching ${url}`);
  
        const response = await fetch(url, { method: "GET", mode: "cors" });
  
        if (!response.ok) throw new Error(`Response not OK (status ${response.status})`);
  
        // ❌ This will never run, since response is expected to fail
        const responseProperties = ((await response.json()) as { message: Properties }).message;
        this.roomProps = responseProperties;
        console.log("✅ properties loaded");
  
        if (this.roomProps.name === "social area") {
          virtualAgent.ResetUUID();
        }
  
        APP.scene!.emit("properties_loaded");
        break;
  
      } catch (error) {
        console.warn(`❌ Fetch attempt ${attempt} failed:`, error);
  
        if (attempt === maxRetries) {
          console.error("🚨 All retry attempts failed. Returning fallback properties.");
          this.roomProps = invalidProps;
        } else {
          await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
        }
      }
    }
  
    this.read = true;
    if (reset) APP.scene!.emit("room_properties_updated");
    return this.roomProps;
  }
  
  
  async Read(HubID: string, reset: boolean): Promise<Properties> {
    if (reset) {
      this.read = false;
    }

    if (this.read) return Promise.resolve(this.roomProps);
    else {
      try {
        this.hubId = HubID;
        const response = await fetch(
          `${this.serverURL}/properties/room/${this.hubId}?language=${languageCodes[this.language]}&user=${
            APP.store.state.profile.displayName
          }`,
          { method: "GET" }
        );
        if (!response.ok) throw new Error("Response not OK");
        const responseProperties = ((await response.json()) as { message: Properties }).message;

        // 🔽 Always add Screenshot.png at index 0
 if (responseProperties.name === "lobby" && responseProperties.help ) {
//   // Prepend custom slide
  responseProperties.help = [
     {
       index: 0,
       ratio: 0.4545,          
       filename: Lobby_1       
     },
    //  {
    //    index: 1,
    //    ratio: 0.4545,           
    //    filename: Lobby_2       
    //  },
    //  {
    //    index: 2,
    //    ratio: 0.4545,           
    //    filename: Lobby_3       
    //  },
    //  {
    //    index: 3,
    //    ratio: 0.4545,         
    //    filename: Lobby_4       
    //  },
    //  {
    //    index: 4,
    //    ratio: 0.4545,         
    //    filename: Lobby_5        
    //  },
    //  {
    //    index: 5,
    //    ratio: 0.4545,         
    //    filename: Lobby_6       
    //  },
    //  {
    //    index: 6,
    //    ratio: 0.4545,          
    //    filename: Lobby_7       
    //  },
    //  {
    //    index: 7,
    //    ratio: 0.4545,           
    //    filename: Lobby_8        
    //  },
    //  {
    //    index: 8,
    //    ratio: 0.4545,          
    //    filename: Lobby_9       
    //  },
    //  {
    //    index: 9,
    //    ratio: 0.4545,          
    //    filename: Lobby_10        
    //  },
  
//     // ...responseProperties.help
 ]
  
  
  
  
//   // .map((slide, newIndex) => ({
//   //   ...slide,
//   //   index: newIndex          // reindex sequentially
//   // }));
 }
 if (responseProperties.name === "main area" && responseProperties.help ) {
  //   // Prepend custom slide
  responseProperties.help = []
  if(languageCodes[this.language] === "en"){
    responseProperties.help.push( {
         index: 0,
         ratio: 0.4545,          
         filename:  EnglishRooms     
       },)
  }
  if(languageCodes[this.language] === "es"){
    responseProperties.help.push( {
         index: 0,
         ratio: 0.4545,          
         filename:  SpanishRooms    
       },)
  }
  if(languageCodes[this.language] === "el"){
    responseProperties.help.push( {
         index: 0,
         ratio: 0.4545,          
         filename:  GreekRooms  
       },)
  }
  if(languageCodes[this.language] === "nl"){
    responseProperties.help.push( {
         index: 0,
         ratio: 0.4545,          
         filename:  DutchRooms   
       },)
  }
  if(languageCodes[this.language] === "it"){
    responseProperties.help.push( {
         index: 0,
         ratio: 0.4545,          
         filename:  ItalianRooms  
       },)
  }
  if(languageCodes[this.language] === "de"){
    responseProperties.help.push( {
         index: 0,
         ratio: 0.4545,          
         filename:  GermanRooms 
       },)
  }
  if(responseProperties.agent === true){
    responseProperties.help.push({
    index: 0,
    ratio: 0.4545,          
       filename:  Ways   
   }, 
    )    
  }
  if(responseProperties.agent === true){
    responseProperties.help.push( {
      index: 0,
       ratio: 0.4545,          
        filename:  How   
     }  
    ) 
  }  
  if(responseProperties.agent === true){
    responseProperties.help.push( {
      index: 0,
       ratio: 0.4545,          
        filename:  Correct 
     }  
    ) 
  } 
  
    
  if(responseProperties.agent === true){
    responseProperties.help.push( {
      index: 0,
       ratio: 0.4545,          
        filename:  Suggestions    
     }  
    ) 
  }
  if(responseProperties.agent === false){
    responseProperties.help.push( {
      index: 0,
       ratio: 0.4545,          
        filename:  Program    
     }  
    ) 
  }

 
 


  //   responseProperties.help = [
  //      {
  //        index: 0,
  //        ratio: 0.4545,          
  //        filename:  EnglishRooms     
  //      },
  //      {
  //       index: 0,
  //       ratio: 0.4545,          
  //       filename:   DutchRooms      
  //     },

  //     {
  //       index: 0,
  //       ratio: 0.4545,          
  //       filename:  GermanRooms      
  //     },

  //     {
  //       index: 0,
  //       ratio: 0.4545,          
  //       filename:  GreekRooms     
  //     },
  //     {
  //       index: 0,
  //       ratio: 0.4545,          
  //       filename:  ItalianRooms    
  //     },

  //     {
  //       index: 0,
  //       ratio: 0.4545,          
  //       filename:  SpanishRooms     
  //     },
  //     {
  //       index: 0,
  //       ratio: 0.4545,          
  //       filename:  Program    
  //     },
  //     {
  //       index: 0,
  //       ratio: 0.4545,          
  //       filename:  Ways   
  //     },

  //     {
  //       index: 0,
  //       ratio: 0.4545,          
  //       filename:  Suggestions    
  //     },

   
  //     //  {
  //     //    index: 1,
  //     //    ratio: 0.4545,           
  //     //    filename: Lobby_2       
  //     //  },
  //     //  {
  //     //    index: 2,
  //     //    ratio: 0.4545,           
  //     //    filename: Lobby_3       
  //     //  },
  //     //  {
  //     //    index: 3,
  //     //    ratio: 0.4545,         
  //     //    filename: Lobby_4       
  //     //  },
  //     //  {
  //     //    index: 4,
  //     //    ratio: 0.4545,         
  //     //    filename: Lobby_5        
  //     //  },
  //     //  {
  //     //    index: 5,
  //     //    ratio: 0.4545,         
  //     //    filename: Lobby_6       
  //     //  },
  //     //  {
  //     //    index: 6,
  //     //    ratio: 0.4545,          
  //     //    filename: Lobby_7       
  //     //  },
  //     //  {
  //     //    index: 7,
  //     //    ratio: 0.4545,           
  //     //    filename: Lobby_8        
  //     //  },
  //     //  {
  //     //    index: 8,
  //     //    ratio: 0.4545,          
  //     //    filename: Lobby_9       
  //     //  },
  //     //  {
  //     //    index: 9,
  //     //    ratio: 0.4545,          
  //     //    filename: Lobby_10        
  //     //  },
    
  // //     // ...responseProperties.help
  //  ]
    
    
    
    
  //   // .map((slide, newIndex) => ({
  //   //   ...slide,
  //   //   index: newIndex          // reindex sequentially
  //   // }));
   }
if (responseProperties.name === "conference room" && responseProperties.help) {
  // Prepend custom slide
  responseProperties.help = [
    {
      index: 0,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Conference_1      // 👈 local import instead of server file
    },
    {
      index: 1,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Conference_2      // 👈 local import instead of server file
    },
    {
      index: 2,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Conference_3      // 👈 local import instead of server file
    },
    {
      index: 3,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Conference_4      // 👈 local import instead of server file
    }, 
  
    // ...responseProperties.help
  ]
  
  
  
  
  // .map((slide, newIndex) => ({
  //   ...slide,
  //   index: newIndex          // reindex sequentially
  // }));
}

if (responseProperties.name === "business room" && responseProperties.help) {
  // Prepend custom slide
  responseProperties.help = [
    {
      index: 0,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Business_1      // 👈 local import instead of server file
    },
    {
      index: 1,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Business_2      // 👈 local import instead of server file
    },
    {
      index: 2,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Business_3      // 👈 local import instead of server file
    },
    {
      index: 3,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Business_4      // 👈 local import instead of server file
    }, 
  
    // ...responseProperties.help
  ]
  
  
  
  
  // .map((slide, newIndex) => ({
  //   ...slide,
  //   index: newIndex          // reindex sequentially
  // }));
}

if (responseProperties.name === "social area" && responseProperties.help) {
  // Prepend custom slide
  responseProperties.help = [
    {
      index: 0,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Social_1      // 👈 local import instead of server file
    },
    {
      index: 1,
      ratio: 0.4545,         // 👈 set whatever ratio fits best
      filename: Social_2      // 👈 local import instead of server file
    },
  
  
    // ...responseProperties.help
  ]
  
  
  
  
  // .map((slide, newIndex) => ({
  //   ...slide,
  //   index: newIndex          // reindex sequentially
  // }));
}

          // // ✅ Remove the 2nd help slide (index 1) and reindex the rest
          // if (responseProperties.name === "conference room" && responseProperties.help && responseProperties.help.length > 1) {
          //   responseProperties.help = responseProperties.help
          //     .filter((_, i) => i !== 1)            // drop the 2nd one
          //     .map((slide, newIndex) => ({
          //       ...slide,
          //       index: newIndex                     // reindex sequentially
          //     }));
          // }


          //  // ✅ Remove the 2nd help slide (index 1) and reindex the rest
          //  if (responseProperties.name === "business room" && responseProperties.help && responseProperties.help.length > 1) {
          //   responseProperties.help = responseProperties.help
          //   .filter((_, i) => i < 1 || i > 6) // keep only index 0 and 7+
          //     .map((slide, newIndex) => ({
          //       ...slide,
          //       index: newIndex                     // reindex sequentially
          //     }));
          // }
          



        this.roomProps = responseProperties;
        // console.log("properties")

        if (this.roomProps.name === "social area") {
          virtualAgent.ResetUUID();
        }

        APP.scene!.emit("properties_loaded");
      } catch (error) {
        this.roomProps = invalidProps;
      } finally {
        this.read = true;
        if (reset) APP.scene!.emit("room_properties_updated");
        return this.roomProps;
      }
    }
  }
   
 
  waitForProperties(): Promise<any> {
    if (this.read) return Promise.resolve(null);
    else
      return new Promise(resolve => {
        APP.scene!.addEventListener("properties_loaded", resolve, { once: true });
      });
  }

  HasProps() {
    return this.read;
  }

  get AllowsNav() {
    return this.roomProps.navigations.length !== 0;
  }
  get AllowsMap() {
    return this.roomProps.maps.length !== 0;
  }
  get AllowTrans() {
    return this.roomProps.translations.length !== 0 && this.roomProps.translations[0].type !== "presentation";
  }
  get AllowPresentation() {
    return this.roomProps.translations.length !== 0 && this.roomProps.translations[0].type === "presentation";
  }
  get AllowsAgent() {
    return this.roomProps.agent;
  }
  get AllowsTutorial() {
    return this.roomProps.tutorials.length !== 0;
  }
  get AllowsHelp() {
    return this.roomProps.help.length !== 0;
  }
}

export const roomPropertiesReader = new RoomPropertiesReader();
