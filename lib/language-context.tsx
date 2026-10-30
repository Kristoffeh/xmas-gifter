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
    "dashboard.title": "Christmas Gifter",
    "dashboard.loading": "Loading…",
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
    "dashboard.done": "Done",
    "dashboard.purchased": "Purchased",
    "dashboard.wrapped": "Wrapped",
    "dashboard.untilChristmas": "until Christmas",
    "dashboard.giftCount": "gifts",
    "dashboard.wrappedCount": "wrapped",
    "dashboard.moveUp": "Move up",
    "dashboard.moveDown": "Move down",
    "dashboard.removePerson": "Remove person",
    "dashboard.giftPlaceholder": "What are you giving them?",
    "gift.for": "For",
    "gift.editTitle": "Edit Gift",
    "gift.name": "Gift",
    "gift.url": "Link",
    "gift.optional": "(optional)",
    "gift.note": "Note",
    "gift.notePlaceholder": "E.g. order by Dec 10th, size M, hide from the kids",
    "gift.nameRequired": "Give the gift a name.",
    "gift.urlInvalid": "That doesn't look like a web address. Try something like example.com/item.",
    "gift.saveFailed": "Couldn't save the gift. Try again.",
    "gift.opensInNewTab": "(opens in a new tab)",
    "settings.title": "Personalize",
    "settings.close": "Done",
    "settings.cardBlur": "Card blur",
    "settings.none": "None",
    "settings.strong": "Strong",
    "settings.reset": "Reset to default",
  },
  no: {
    // Dashboard
    "dashboard.title": "Julegave Oversikt",
    "dashboard.loading": "Laster…",
    "dashboard.totalPeople": "Personer",
    "dashboard.totalGifts": "Gaver",
    "dashboard.stillNeeded": "Gjenstående",
    "dashboard.giftsFound": "Gaver Funnet",
    "dashboard.stillNeedGifts": "Trenger Fortsatt Gaver",
    "dashboard.noGiftPlanned": "Ingen gave planlagt ennå",
    "dashboard.addGift": "Legg til Gave",
    "dashboard.edit": "Endre",
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
    "dashboard.done": "Ferdig",
    "dashboard.purchased": "Kjøpt",
    "dashboard.wrapped": "Pakket",
    "dashboard.untilChristmas": "til jul",
    "dashboard.giftCount": "gaver",
    "dashboard.wrappedCount": "pakket",
    "dashboard.moveUp": "Flytt opp",
    "dashboard.moveDown": "Flytt ned",
    "dashboard.removePerson": "Fjern person",
    "dashboard.giftPlaceholder": "Hva skal du gi dem?",
    "gift.for": "Til",
    "gift.editTitle": "Endre Gave",
    "gift.name": "Gave",
    "gift.url": "Lenke",
    "gift.optional": "(valgfritt)",
    "gift.note": "Notat",
    "gift.notePlaceholder": "F.eks. bestill innen 10. des, str. M, gjem for barna",
    "gift.nameRequired": "Gi gaven et navn.",
    "gift.urlInvalid": "Det ser ikke ut som en nettadresse. Prøv noe som eksempel.no/vare.",
    "gift.saveFailed": "Kunne ikke lagre gaven. Prøv igjen.",
    "gift.opensInNewTab": "(åpnes i ny fane)",
    "settings.title": "Tilpass",
    "settings.close": "Ferdig",
    "settings.cardBlur": "Uskarphet på kort",
    "settings.none": "Ingen",
    "settings.strong": "Sterk",
    "settings.reset": "Tilbakestill",
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

