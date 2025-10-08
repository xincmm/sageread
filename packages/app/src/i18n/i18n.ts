import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { options } from "../../i18next-scanner.config";

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: "zh-CN",
    supportedLngs: ["en", ...options.lngs],
    fallbackLng: {
      "zh-HK": ["zh-TW", "zh-CN"],
      kk: ["ru", "zh-CN"],
      ky: ["ru", "zh-CN"],
      tk: ["ru", "zh-CN"],
      uz: ["ru", "zh-CN"],
      ug: ["ru", "zh-CN"],
      tt: ["ru", "zh-CN"],
      default: ["zh-CN"],
    },
    ns: options.ns,
    defaultNS: options.defaultNs,
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },
    keySeparator: false,
    nsSeparator: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

i18n.on("languageChanged", (lng) => {
  console.log("Language changed to", lng);
});

export default i18n;
