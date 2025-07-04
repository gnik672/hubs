import { virtualAgent } from "../bit-systems/agent-system";
import { languageCodes, voxLanugages } from "../bit-systems/localization-system";

export type Room = "lobby" | "conference room" | "main area" | "social area" | "business room" | "unknown";

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
        this.roomProps = responseProperties;

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
