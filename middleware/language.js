const fs = require("fs");
const path = require("path");

const localesPath = path.join(__dirname, "..", "locales");

function loadLocale(language) {
  try {
    const filePath = path.join(localesPath, `${language}.json`);

    if (!fs.existsSync(filePath)) {
      console.error("Missing locale file:", filePath);
      return {};
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Locale load error for ${language}:`, error.message);
    return {};
  }
}

const translations = {
  en: loadLocale("en"),
  ar: loadLocale("ar")
};

function getNestedValue(object, key) {
  return String(key || "")
    .split(".")
    .reduce((current, part) => {
      return current && current[part] !== undefined ? current[part] : undefined;
    }, object);
}

function languageMiddleware(req, res, next) {
  const allowedLanguages = ["en", "ar"];

  const selectedFromQuery = String(req.query.lang || "")
    .trim()
    .toLowerCase();

  if (allowedLanguages.includes(selectedFromQuery)) {
    req.session.language = selectedFromQuery;
  }

  const currentLanguage = allowedLanguages.includes(req.session.language)
    ? req.session.language
    : "en";

  res.locals.lang = currentLanguage;
  res.locals.dir = currentLanguage === "ar" ? "rtl" : "ltr";

  res.locals.t = function (key, fallback = "") {
    return (
      getNestedValue(translations[currentLanguage], key) ||
      getNestedValue(translations.en, key) ||
      fallback ||
      key
    );
  };

  res.locals.clientTranslations = JSON.stringify(
    translations[currentLanguage] || {}
  );

  next();
}

module.exports = languageMiddleware;