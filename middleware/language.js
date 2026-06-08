const fs = require("fs");
const path = require("path");

const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "locales", "en.json"), "utf8")
);

const ar = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "locales", "ar.json"), "utf8")
);

const translations = {
  en,
  ar
};

function getNestedValue(obj, key) {
  return key.split(".").reduce((current, part) => {
    if (current && current[part] !== undefined) {
      return current[part];
    }

    return null;
  }, obj);
}

function languageMiddleware(req, res, next) {
  const selectedLanguage = req.session.lang || "en";
  const lang = translations[selectedLanguage] ? selectedLanguage : "en";

  res.locals.lang = lang;
  res.locals.dir = lang === "ar" ? "rtl" : "ltr";

  res.locals.t = function (key) {
    const translatedValue = getNestedValue(translations[lang], key);

    if (translatedValue !== null) {
      return translatedValue;
    }

    const fallbackValue = getNestedValue(translations.en, key);

    if (fallbackValue !== null) {
      return fallbackValue;
    }

    return key;
  };

  next();
}

module.exports = languageMiddleware;