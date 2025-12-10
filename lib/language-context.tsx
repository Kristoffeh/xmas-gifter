"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "no";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Dashboard
    "dashboard.title": "Christmas Gifter Dashboard",
    "dashboard.totalPeople": "Total People",
    "dashboard.totalGifts": "Total Gifts",
    "dashboard.stillNeeded": "Still Needed",
    "dashboard.giftsFound": "Gifts Found",
    "dashboard.stillNeedGifts": "Still Need Gifts",
    "dashboard.noGiftPlanned": "No gift planned yet",
    "dashboard.addGift": "Add Gift",
    "dashboard.edit": "Edit",
    "dashboard.delete": "Delete",
    "dashboard.save": "Save",
    "dashboard.cancel": "Cancel",
    "dashboard.logout": "Logout",
    "dashboard.language": "Language",
    "dashboard.noPeople": "No people added yet. Complete onboarding to get started!",
    "dashboard.addPerson": "Add New Person",
    "dashboard.personNamePlaceholder": "Enter person's name",
    "dashboard.add": "Add",
    "dashboard.countdownTitle": "Time Until Christmas",
    "dashboard.days": "Days",
    "dashboard.hours": "Hours",
    "dashboard.minutes": "Minutes",
    "dashboard.giftProgress": "Progress",
    "dashboard.people": "people",
    "dashboard.allGiftsFound": "All gifts found! You're ready for Christmas!",
    "dashboard.peopleLeft": "people",
    "dashboard.stillNeedGiftsLower": "still need gifts",
  },
  no: {
    // Dashboard
    "dashboard.title": "Julegave Oversikt",
    "dashboard.totalPeople": "Personer",
    "dashboard.totalGifts": "Gaver",
    "dashboard.stillNeeded": "Gjenstående",
    "dashboard.giftsFound": "Gaver Funnet",
    "dashboard.stillNeedGifts": "Trenger Fortsatt Gaver",
    "dashboard.noGiftPlanned": "Ingen gave planlagt ennå",
    "dashboard.addGift": "Legg til Gave",
    "dashboard.edit": "Rediger",
    "dashboard.delete": "Slett",
    "dashboard.save": "Lagre",
    "dashboard.cancel": "Avbryt",
    "dashboard.logout": "Logg ut",
    "dashboard.language": "Språk",
    "dashboard.noPeople": "Ingen personer lagt til ennå. Fullfør onboarding for å komme i gang!",
    "dashboard.addPerson": "Legg til Ny Person",
    "dashboard.personNamePlaceholder": "Skriv inn personens navn",
    "dashboard.add": "Legg til",
    "dashboard.countdownTitle": "Tid til Jul",
    "dashboard.days": "Dager",
    "dashboard.hours": "Timer",
    "dashboard.minutes": "Minutter",
    "dashboard.giftProgress": "Fremgang",
    "dashboard.people": "personer",
    "dashboard.allGiftsFound": "Alle gaver funnet! Du er klar for jul!",
    "dashboard.peopleLeft": "personer",
    "dashboard.stillNeedGiftsLower": "trenger fortsatt gaver",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    // Load language from localStorage
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "no")) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

