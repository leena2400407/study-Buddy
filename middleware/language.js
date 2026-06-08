const fs = require("fs");
const path = require("path");

const defaultEnglish = {
  language: {
    arabic: "Arabic",
    english: "English"
  },
  nav: {
    home: "Home",
    profile: "Profile",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout"
  },
  cylinder: {
    title: "Study Buddy",
    edugate: "Edugate",
    games: "Games",
    ai: "AI Assistant",
    events: "Events",
    matching: "Matching",
    resources: "Resources",
    freshman: "Freshman Guide"
  }
};

const defaultArabic = {
  language: {
    arabic: "Arabic",
    english: "English"
  },
  nav: {
    home: "Home",
    profile: "Profile",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout"
  },
  cylinder: {
    title: "Study Buddy",
    edugate: "Edugate",
    games: "Games",
    ai: "AI Assistant",
    events: "Events",
    matching: "Matching",
    resources: "Resources",
    freshman: "Freshman Guide"
  }
};

function loadJsonFile(fileName, fallback) {
  try {
    const filePath = path.join(process.cwd(), "Locales", fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`Localization file missing: ${filePath}`);
      return fallback;
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Could not load localization file ${fileName}:`, error.message);
    return fallback;
  }
}

const translations = {
  en: loadJsonFile("en.json", defaultEnglish),
  ar: loadJsonFile("ar.json", defaultArabic)
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
  const selectedLanguage = req.session?.lang || "en";
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