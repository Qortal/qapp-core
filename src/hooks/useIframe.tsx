import { useEffect } from "react";
import { supportedLanguages } from "../i18n/i18n";
import i18n from '../i18n/i18n'
type Language = "de" | "en" | "es" | "fr" | "it" | "ja" | "ru" | "zh";
type Theme = "dark" | "light";

interface CustomWindow extends Window {
  _qdnTheme: Theme;
  _qdnLang: Language;
}
const customWindow = window as unknown as CustomWindow;


export const useIframe = () => {

  useEffect(() => {
    const languageDefault = customWindow?._qdnLang;

    if (supportedLanguages?.includes(languageDefault)) {
      i18n.changeLanguage(languageDefault);
    }

    function handleNavigation(event: {
      data: {
        action: string;
        language: Language;
      };
    }) {
     
      if (event.data?.action === "LANGUAGE_CHANGED" && event.data.language) {
        if (!supportedLanguages?.includes(event.data.language)) return;
      
        i18n.changeLanguage(event.data.language);
      }
    }

    window.addEventListener("message", handleNavigation);

    return () => {
      window.removeEventListener("message", handleNavigation);
    };
  }, []);
  return;
};
