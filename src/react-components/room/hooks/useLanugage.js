import { useState, useEffect, useCallback } from "react";
import { oldTranslationSystem } from "../../../bit-systems/old-translation-system";
import { setLocale } from "../../../utils/i18n";
import { translationSystem } from "../../../bit-systems/translation-system";
import {
  GetAvailableLanguagesArray,
  GetSelectedLanguage,
  selectedLanguage,
  UpdateLanguage
} from "../../../bit-systems/localization-system";

export function useLanguage() {
  const [languages, SetLanguage] = useState({
    value: GetSelectedLanguage(),
    options: GetAvailableLanguagesArray()
  });

  // useEffect(() => {
  //   const onLanguageUpdated = _ => {
  //     SetLanguage({
  //       value: GetSelectedLanguage(),
  //       options: GetAvailableLanguagesArray()
  //     });
  //   };

  //   scene.addEventListener("language_updated", onLanguageUpdated);

  //   return () => {
  //     scene.removeEventListener("language_updated", onLanguageUpdated);
  //   };
  // }, [SetLanguage, scene, translationSystem]);

  const languageChanged = useCallback(
    language => {
      UpdateLanguage(language);
      SetLanguage({
        value: GetSelectedLanguage(),
        options: GetAvailableLanguagesArray()
      });
    },
    [selectedLanguage]
  );

  return {
    languageChanged,
    languages: languages
  };
}
