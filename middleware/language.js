const fs = require("fs");
const path = require("path");

const defaultEnglish = {
  language: {
    arabic: "Arabic",
    english: "English"
  },

  nav: {
    profile: "Profile",
    gender: "Gender",
    university: "University",
    major: "Major",
    email: "Email",
    viewFullProfile: "View Full Profile",
    logout: "Logout",
    guest: "Guest",
    guestMessage: "Please login to view your profile.",
    login: "Login",
    home: "Home",
    cylinder: "Cylinder",
    events: "Events",
    game: "Game",
    resources: "Resources",
    match: "Match",
    aiChat: "AI Chat",
    guide: "Guide"
  },

  cylinder: {
    events: "EVENTS",
    eventsSub: "Fun & Sports",
    game: "GAME",
    gameSub: "Play & compete",
    resources: "RESOURCES",
    resourcesSub: "Summaries & Materials",
    match: "MATCH",
    matchSub: "Find your study buddy",
    ai: "AI CHAT",
    aiSub: "Your smart assistant",
    guide: "GUIDE",
    guideSub: "Freshmen Survival Kit",
    prev: "PREV",
    next: "NEXT"
  }
};

const defaultArabic = {
  language: {
    arabic: "العربية",
    english: "English"
  },

  nav: {
    profile: "الملف الشخصي",
    gender: "النوع",
    university: "الجامعة",
    major: "التخصص",
    email: "البريد الإلكتروني",
    viewFullProfile: "عرض الملف الكامل",
    logout: "تسجيل الخروج",
    guest: "زائر",
    guestMessage: "يرجى تسجيل الدخول لعرض ملفك الشخصي.",
    login: "تسجيل الدخول",
    home: "الرئيسية",
    cylinder: "القائمة",
    events: "الفعاليات",
    game: "الألعاب",
    resources: "المصادر",
    match: "المطابقة",
    aiChat: "المحادثة الذكية",
    guide: "الدليل"
  },

  cylinder: {
    events: "الفعاليات",
    eventsSub: "ترفيه ورياضة",
    game: "الألعاب",
    gameSub: "العب وتنافس",
    resources: "المصادر",
    resourcesSub: "ملخصات ومواد دراسية",
    match: "المطابقة",
    matchSub: "اعثر على شريك دراسة",
    ai: "المحادثة الذكية",
    aiSub: "مساعدك الذكي",
    guide: "الدليل",
    guideSub: "دليل الطلاب الجدد",
    prev: "السابق",
    next: "التالي"
  }
};

function loadJsonFile(fileName, fallback) {
  try {
    const filePath = path.join(process.cwd(), "locales", fileName);

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