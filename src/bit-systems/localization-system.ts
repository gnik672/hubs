import { setLocale } from "../utils/i18n";
import { presentationSystem } from "./presentation-system";
import { translationSystem } from "./translation-system";

// Transaltion of icons
function createLanguageData(translationValues: Array<string>) {
  if (translationValues.length !== translationIds.length) throw new Error("invalid translation values length");
  const returndict: Record<string, string> = {};

  translationIds.forEach((id, index) => (returndict[id] = translationValues[index]));

  return returndict;
}

const translationIds = [
  "hud-panel.translate",
  "hud-panel.agent",
  "hud-panel.map",
  "hud-panel.language",
  "hud-panel.help",
  "hud-panel.task",
  "hud-panel.mic",
  "hud-panel.mic.muted ",
  "change-hub.message"
];

const placeholderData = createLanguageData([
  "Translate",
  "Agent",
  "Map",
  "Language",
  "Help",
  "Task",
  "Mute Mic",
  "Unmute mic",
  "Visit room"
]);

const enData = placeholderData;
const elData = createLanguageData([
  "Μετάφραση",
  "Βοηθός",
  "Χάρτης",
  "Γλώσσα",
  "Βοήθεια",
  "Στόχος",
  "Σίγαση",
  "Κατάργηση Σίγασης",
  "Επίσκεψη στο Δωμάτιο"
]);

const esData = createLanguageData([
  "Traducir",
  "Agente",
  "Mapa",
  "Idioma",
  "Ayuda",
  "Tarea",
  "Silenciar Micrófono",
  "Activar Micrófono",
  "Visitar Sala"
]);

const itData = createLanguageData([
  "Tradurre",
  "Assistente",
  "Mappa",
  "Lingua",
  "Aiuto",
  "Compito",
  "Disattiva il microfono",
  "Attiva il microfono",
  "Visita la stanza"
]);

const nlData = createLanguageData([
  "Vertalen",
  "Assistent",
  "Kaart",
  "Taal",
  "Hulp",
  "Taak",
  "Demp je microfoon",
  "Zet de microfoon aan",
  "Bezoek de kamer"
]);

const deData = createLanguageData([
  "Übersetzung",
  "Agent",
  "Grundriss",
  "Sprache",
  "Hulp",
  "Aufgabe",
  "Mikrofon stummschalten",
  "Mikrofon einschalten",
  "Raum besuchen"
]);

// ----------------------------------------------

export let selectedLanguage: voxLanugages = "english";

export type voxLanugages = "english" | "dutch" | "german" | "greek" | "italian" | "spanish";

export const languageCodes = {
  greek: "el",
  english: "en",
  spanish: "es",
  italian: "it",
  dutch: "nl",
  german: "de"
};
export const availableLanguages = ["english", "dutch", "german", "greek", "italian", "spanish"];

export const textTranslations = {
  english: enData,
  dutch: nlData,
  german: deData,
  italian: itData,
  spanish: esData,
  greek: elData
};

export function IconTranslationDict() {
  return textTranslations[translationSystem.mylanguage];
}

export function UpdateLanguage(newLanguage: voxLanugages) {
  selectedLanguage = newLanguage;
  translationSystem.mylanguage = selectedLanguage;
  presentationSystem.mylanguage = selectedLanguage;
  // APP.scene!.emit("language_updated", { language: selectedLanguage });

  APP.store.update({ profile: { language: GetSelectedLanguage().value } });
  APP.store.update({ preferences: { locale: languageCodes[selectedLanguage] } });
  console.log(`language updated`);
  setLocale(languageCodes[selectedLanguage]);
}

export function GetAvailableLanguagesArray() {
  return availableLanguages.map(language => {
    return { value: language, label: language.charAt(0).toUpperCase() + language.slice(1) };
  });
}

export function GetSelectedLanguage() {
  return {
    value: translationSystem.mylanguage,
    label: translationSystem.mylanguage.charAt(0).toUpperCase() + translationSystem.mylanguage.slice(1)
  };
}
