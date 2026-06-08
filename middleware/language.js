const fs = require("fs");
const path = require("path");

const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../locales/en.json"), "utf8")
);

const ar = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../locales/ar.json"), "utf8")
);

const translations = {
  en,
  ar
};

function getValue(obj, key) {
  return key.split(".").reduce((current, part) => {
    if (current && current[part] !== undefined) {
      return current[part];
    }

    return null;
  }, obj);
}

module.exports = function languageMiddleware(req, res, next) {
  const selectedLang = req.session.lang || "en";
  const lang = ["en", "ar"].includes(selectedLang) ? selectedLang : "en";

  res.locals.lang = lang;
  res.locals.dir = lang === "ar" ? "rtl" : "ltr";

  res.locals.t = function (key) {
    return getValue(translations[lang], key) || getValue(translations.en, key) || key;
  };

  next();
};