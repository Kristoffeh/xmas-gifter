"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { useLanguage } from "@/lib/language-context";
import { DEFAULT_SETTINGS, SETTINGS_LIMITS, type UserSettings } from "@/lib/settings";
import { GIFT_NOTE_MAX_LENGTH, GIFT_URL_MAX_LENGTH, normalizeGiftUrl } from "@/lib/gift-url";

const displayFont = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const bodyFont = Figtree({ subsets: ["latin"], variable: "--font-body" });

interface Gift {
  id: string;
  description: string;
  url: string | null;
  note: string | null;
  purchased: boolean;
  giftWrapped: boolean;
}

interface Person {
  id: string;
  name: string;
  gifts: Gift[];
}

type Translate = (key: string) => string;
type ListType = "withGifts" | "withoutGifts";
type GiftDraft = { description: string; url: string | null; note: string | null };

const isGiftDone = (gift: Gift) => gift.purchased && gift.giftWrapped;
const isPersonDone = (person: Person) => person.gifts.length > 0 && person.gifts.every(isGiftDone);

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-candle";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { language, setLanguage, t } = useLanguage();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The gift being added (no gift) or edited, shown in the gift dialog
  const [giftDialog, setGiftDialog] = useState<{ person: Person; gift?: Gift } | null>(null);
  const saveSettingsTimer = useRef<ReturnType<typeof setTimeout>>();
  const pendingSettings = useRef<Partial<UserSettings>>({});
  const [timeUntilChristmas, setTimeUntilChristmas] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Memoize snowfall animation data to prevent reset on re-renders
  const snowfallData = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const left = Math.random() * 100;
      const duration = 20 + Math.random() * 20;
      const delay = -(Math.random() * duration);
      const size = 0.5 + Math.random() * 1;
      const driftAmount = 20 + Math.random() * 40;
      const animationName = `snowfall-${i}`;
      return { left, duration, delay, size, driftAmount, animationName, id: i };
    });
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user) {
      if (!session.user.onboardingCompleted) {
        router.push("/onboarding");
      } else {
        fetchPeople();
        fetchSettings();
      }
    }
  }, [status, session, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Christmas countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      let christmas = new Date(currentYear, 11, 25); // December 25th

      // If Christmas has passed this year, set it to next year
      if (now > christmas) {
        christmas = new Date(currentYear + 1, 11, 25);
      }

      const diff = christmas.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilChristmas({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchPeople = async () => {
    try {
      const response = await fetch("/api/people");
      if (response.ok) {
        const data = await response.json();
        setPeople(data.people);
      }
    } catch (error) {
      console.error("Error fetching people:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  // Applies the change immediately and saves it once the user stops adjusting
  const handleChangeSetting = (updates: Partial<UserSettings>) => {
    setSettings((current) => ({ ...current, ...updates }));
    pendingSettings.current = { ...pendingSettings.current, ...updates };
    clearTimeout(saveSettingsTimer.current);
    saveSettingsTimer.current = setTimeout(async () => {
      const body = pendingSettings.current;
      pendingSettings.current = {};
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    }, 400);
  };

  // Returns true when the gift was saved, so the caller can close its form
  const handleSaveGift = async (personId: string, draft: GiftDraft, giftId?: string) => {
    if (!draft.description.trim()) {
      return false;
    }

    try {
      const response = await fetch("/api/gifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          description: draft.description.trim(),
          url: draft.url,
          note: draft.note?.trim() || null,
          giftId,
        }),
      });

      if (response.ok) {
        await fetchPeople();
        return true;
      }
    } catch (error) {
      console.error("Error saving gift:", error);
    }
    return false;
  };

  const handleDeleteGift = async (giftId: string) => {
    try {
      const response = await fetch(`/api/gifts?giftId=${giftId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchPeople();
      }
    } catch (error) {
      console.error("Error deleting gift:", error);
    }
  };

  const handleToggleGiftStatus = async (giftId: string, field: "purchased" | "giftWrapped", value: boolean) => {
    try {
      const response = await fetch("/api/gifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId, [field]: value }),
      });

      if (response.ok) {
        await fetchPeople();
      }
    } catch (error) {
      console.error("Error updating gift status:", error);
    }
  };

  const handleDeletePerson = async (personId: string) => {
    try {
      const response = await fetch(`/api/people?personId=${personId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchPeople();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete person");
      }
    } catch (error) {
      console.error("Error deleting person:", error);
      alert("Failed to delete person");
    }
  };

  const handleMovePerson = async (personId: string, direction: "up" | "down", listType: ListType) => {
    const peopleWithGifts = people.filter((p) => p.gifts && p.gifts.length > 0);
    const peopleWithoutGifts = people.filter(
      (p) => !p.gifts || p.gifts.length === 0
    );
    const currentList = listType === "withGifts" ? peopleWithGifts : peopleWithoutGifts;

    const currentIndex = currentList.findIndex((p) => p.id === personId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= currentList.length) return;

    // Create new ordered array
    const newOrder = [...currentList];
    const [removed] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, removed);

    // Update order in database
    try {
      const personIds = newOrder.map((p) => p.id);
      const response = await fetch("/api/people/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds }),
      });

      if (response.ok) {
        await fetchPeople();
      }
    } catch (error) {
      console.error("Error reordering people:", error);
    }
  };

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/people", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPersonName.trim() }),
      });

      if (response.ok) {
        await fetchPeople();
        setNewPersonName("");
        setAddingPerson(false);
      }
    } catch (error) {
      console.error("Error adding person:", error);
    }
  };

  const fontVars = `${displayFont.variable} ${bodyFont.variable}`;

  if (status === "loading" || loading) {
    return (
      <div className={`${fontVars} min-h-screen flex items-center justify-center bg-night font-body text-frost`}>
        <div role="status" className="relative w-16 h-16 grid place-items-center">
          {/* Gold arc circling a faint track, with Santa resting in the middle */}
          <svg className="absolute inset-0 motion-safe:animate-spin" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="28" stroke="#2A3F5C" strokeWidth="4" />
            <circle cx="32" cy="32" r="28" stroke="#F0B84E" strokeWidth="4" strokeLinecap="round" strokeDasharray="44 132" />
          </svg>
          <SantaFace className="w-9 h-9" />
          <span className="sr-only">{t("dashboard.loading")}</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const peopleWithGifts = people.filter((p) => p.gifts && p.gifts.length > 0);
  const peopleWithoutGifts = people.filter(
    (p) => !p.gifts || p.gifts.length === 0
  );
  const totalGifts = people.reduce((sum, p) => sum + (p.gifts?.length || 0), 0);
  const wrappedGifts = people.reduce((sum, p) => sum + p.gifts.filter(isGiftDone).length, 0);

  const sharedCardProps = {
    t,
    onOpenGift: (person: Person, gift?: Gift) => setGiftDialog({ person, gift }),
    onDeleteGift: handleDeleteGift,
    onToggleGift: handleToggleGiftStatus,
    onMove: handleMovePerson,
    onDeletePerson: handleDeletePerson,
  };

  return (
    <div
      className={`${fontVars} font-body min-h-screen relative overflow-hidden bg-night text-snow`}
      style={{ "--card-blur": `${settings.cardBlur}px` } as React.CSSProperties}
    >
      {/* Night sky with a snowy ridge along the bottom */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, #1E3554 0%, transparent 70%), linear-gradient(#0E1A2B, #0B1524)",
        }}
      />
      <svg
        className="fixed bottom-0 left-0 w-full h-32 sm:h-44 pointer-events-none z-0"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 120 C 240 60 420 150 720 100 S 1200 50 1440 110 V200 H0Z" fill="#1A2D45" />
        <path d="M0 160 C 300 110 520 180 860 140 S 1300 120 1440 150 V200 H0Z" fill="#22395A" />
      </svg>

      {/* Snowing Animation */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden motion-reduce:hidden">
        {snowfallData.map((snowflake) => (
          <div key={snowflake.id}>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes ${snowflake.animationName} {
                0% {
                  transform: translate3d(0, -20px, 0);
                  opacity: 0;
                }
                2% {
                  opacity: 1;
                }
                98% {
                  opacity: 1;
                }
                100% {
                  transform: translate3d(${snowflake.driftAmount}px, calc(100vh + 20px), 0);
                  opacity: 0;
                }
              }
            `}} />
            <div
              className="snowflake"
              style={{
                left: `${snowflake.left}%`,
                animation: `${snowflake.animationName} ${snowflake.duration}s linear ${snowflake.delay}s infinite`,
                fontSize: `${snowflake.size}em`,
                opacity: 0.7,
              }}
            >
              ❄
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-5 sm:pt-8 pb-40 sm:pb-52">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 mb-10 sm:mb-14">
          <div className="flex items-center gap-2.5 min-w-0">
            <GiftBox state="done" className="w-7 h-7 shrink-0" />
            <span className="font-display font-semibold text-lg tracking-tight truncate">{t("dashboard.title")}</span>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-label={session?.user?.username}
              className={`shrink-0 flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1.5 rounded-full bg-night-soft/80 hover:bg-night-soft border border-night-line text-sm min-h-[44px] transition-colors ${focusRing}`}
            >
              <span className="w-8 h-8 rounded-full bg-spruce grid place-items-center font-display font-semibold uppercase">
                {session?.user?.username?.charAt(0)}
              </span>
              <span className="hidden sm:inline font-medium max-w-[10rem] truncate">{session?.user?.username}</span>
              <svg
                className={`w-4 h-4 text-frost transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-snow text-ink rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                <button
                  onClick={() => {
                    setLanguage(language === "en" ? "no" : "en");
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-frost/25 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    {language === "en" ? (
                      <svg className="w-6 h-4 rounded-sm" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
                        <rect width="60" height="30" fill="#012169"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFF" strokeWidth="3"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2"/>
                        <line x1="30" y1="0" x2="30" y2="30" stroke="#FFF" strokeWidth="6"/>
                        <line x1="0" y1="15" x2="60" y2="15" stroke="#FFF" strokeWidth="6"/>
                        <line x1="30" y1="0" x2="30" y2="30" stroke="#C8102E" strokeWidth="4"/>
                        <line x1="0" y1="15" x2="60" y2="15" stroke="#C8102E" strokeWidth="4"/>
                      </svg>
                    ) : (
                      <svg className="w-6 h-4 rounded-sm" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <rect width="60" height="40" fill="#BA0C2F"/>
                        <rect x="18" y="0" width="6" height="40" fill="#00205B"/>
                        <rect x="0" y="17" width="60" height="6" fill="#00205B"/>
                        <rect x="20" y="0" width="2" height="40" fill="#FFF"/>
                        <rect x="0" y="19" width="60" height="2" fill="#FFF"/>
                      </svg>
                    )}
                    {t("dashboard.language")}
                  </span>
                  <span className="text-xs text-ink/60">
                    {language === "en" ? "English" : "Norsk"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setSettingsOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-frost/25"
                >
                  {t("settings.title")}
                </button>
                <div className="border-t border-ink/10"></div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-4 py-3 text-sm text-berry font-medium hover:bg-frost/25"
                >
                  {t("dashboard.logout")}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Countdown + gift pile */}
        <section className="mb-14 sm:mb-16">
          <p
            className="font-display font-bold tracking-tight leading-[0.95] text-[clamp(2.5rem,9vw,4.75rem)] tabular-nums"
            aria-label={`${timeUntilChristmas.days} ${t("dashboard.days")}, ${timeUntilChristmas.hours} ${t("dashboard.hours")}, ${timeUntilChristmas.minutes} ${t("dashboard.minutes")} ${t("dashboard.untilChristmas")}`}
          >
            {timeUntilChristmas.days}
            <span className="font-medium text-frost text-[0.45em] ml-2 mr-4">{t("dashboard.days").toLowerCase()}</span>
            <span className="whitespace-nowrap">
              {timeUntilChristmas.hours.toString().padStart(2, "0")}
              <span className="font-medium text-frost text-[0.45em] ml-2 mr-4">{t("dashboard.hours").toLowerCase()}</span>
            </span>
            <span className="whitespace-nowrap">
              {timeUntilChristmas.minutes.toString().padStart(2, "0")}
              <span className="font-medium text-frost text-[0.45em] ml-2">{t("dashboard.minutes").toLowerCase()}</span>
            </span>
          </p>
          <p className="font-display text-xl sm:text-2xl text-frost mt-3">{t("dashboard.untilChristmas")}</p>

          {people.length > 0 && (
            <div className="mt-10">
              <ul className="flex flex-wrap items-end gap-x-3 gap-y-4">
                {people.map((person) => {
                  const state = isPersonDone(person) ? "done" : person.gifts.length > 0 ? "idea" : "empty";
                  return (
                    <li key={person.id}>
                      <a
                        href={`#person-${person.id}`}
                        title={person.name}
                        className={`group flex flex-col items-center gap-1.5 w-14 rounded-lg ${focusRing}`}
                      >
                        <GiftBox state={state} className="w-11 h-11 transition-transform group-hover:-translate-y-1" />
                        <span className="text-xs text-frost group-hover:text-snow truncate max-w-full">{person.name}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-frost">
                <span>
                  <strong className="font-display text-snow text-base">{peopleWithGifts.length}/{people.length}</strong>{" "}
                  {t("dashboard.people")}
                </span>
                <span>
                  <strong className="font-display text-snow text-base">{totalGifts}</strong> {t("dashboard.giftCount")}
                </span>
                <span>
                  <strong className="font-display text-snow text-base">{wrappedGifts}</strong> {t("dashboard.wrappedCount")}
                </span>
              </div>
              <p className="mt-2 text-sm">
                {peopleWithoutGifts.length === 0 ? (
                  <span className="text-candle font-medium">{t("dashboard.allGiftsFound")}</span>
                ) : (
                  <span className="text-frost">
                    {peopleWithoutGifts.length} {t("dashboard.peopleLeft")} {t("dashboard.stillNeedGiftsLower")}
                  </span>
                )}
              </p>
            </div>
          )}
        </section>

        <div className="space-y-12">
          {peopleWithoutGifts.length > 0 && (
            <PersonSection title={t("dashboard.stillNeedGifts")} count={peopleWithoutGifts.length}>
              {peopleWithoutGifts.map((person, index) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  listType="withoutGifts"
                  isFirst={index === 0}
                  isLast={index === peopleWithoutGifts.length - 1}
                  {...sharedCardProps}
                />
              ))}
            </PersonSection>
          )}

          {peopleWithGifts.length > 0 && (
            <PersonSection title={t("dashboard.giftsFound")} count={peopleWithGifts.length}>
              {peopleWithGifts.map((person, index) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  listType="withGifts"
                  isFirst={index === 0}
                  isLast={index === peopleWithGifts.length - 1}
                  {...sharedCardProps}
                />
              ))}
            </PersonSection>
          )}

          {people.length === 0 && (
            <p className="text-frost text-center py-8">{t("dashboard.noPeople")}</p>
          )}

          {!addingPerson ? (
            <button
              onClick={() => setAddingPerson(true)}
              className={`w-full px-6 py-4 rounded-2xl border-2 border-dashed border-night-line hover:border-frost text-frost hover:text-snow font-semibold transition-colors flex items-center justify-center gap-2 ${focusRing}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("dashboard.addPerson")}
            </button>
          ) : (
            <div className="rounded-2xl bg-night-soft border border-night-line p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddPerson();
                    if (e.key === "Escape") {
                      setAddingPerson(false);
                      setNewPersonName("");
                    }
                  }}
                  placeholder={t("dashboard.personNamePlaceholder")}
                  className="flex-1 px-4 py-2.5 text-base rounded-xl bg-night border border-night-line text-snow placeholder:text-frost/60 focus:outline-none focus:border-candle min-h-[44px]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAddingPerson(false);
                      setNewPersonName("");
                    }}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-frost hover:text-snow hover:bg-night-line font-semibold min-h-[44px] transition-colors ${focusRing}`}
                  >
                    {t("dashboard.cancel")}
                  </button>
                  <button
                    onClick={handleAddPerson}
                    className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-berry hover:bg-berry-dark text-white font-semibold min-h-[44px] transition-colors ${focusRing}`}
                  >
                    {t("dashboard.add")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {giftDialog && (
        <GiftDialog
          personName={giftDialog.person.name}
          gift={giftDialog.gift}
          t={t}
          onSave={(draft) => handleSaveGift(giftDialog.person.id, draft, giftDialog.gift?.id)}
          onClose={() => setGiftDialog(null)}
        />
      )}

      {settingsOpen && (
        <SettingsSheet
          settings={settings}
          t={t}
          onChange={handleChangeSetting}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function SettingsSheet({
  settings,
  t,
  onChange,
  onClose,
}: {
  settings: UserSettings;
  t: Translate;
  onChange: (updates: Partial<UserSettings>) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const blur = SETTINGS_LIMITS.cardBlur;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Light scrim so the cards stay visible while previewing the change */}
      <div className="absolute inset-0 bg-night/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative w-full sm:max-w-md bg-night-soft border-t sm:border border-white/15 rounded-t-3xl sm:rounded-2xl px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 shadow-2xl shadow-black/50"
      >
        <div className="sm:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
        <div className="flex items-center justify-between mb-5">
          <h2 id="settings-title" className="font-display font-semibold text-xl tracking-tight">
            {t("settings.title")}
          </h2>
          <button
            onClick={onClose}
            className={`px-4 py-2 -mr-2 rounded-xl text-mint font-semibold hover:bg-white/10 min-h-[44px] ${focusRing}`}
          >
            {t("settings.close")}
          </button>
        </div>

        <label htmlFor="card-blur" className="block font-medium mb-1">
          {t("settings.cardBlur")}
        </label>
        <input
          id="card-blur"
          type="range"
          min={blur.min}
          max={blur.max}
          step={1}
          value={settings.cardBlur}
          onChange={(e) => onChange({ cardBlur: Number(e.target.value) })}
          className="w-full h-11 accent-candle cursor-pointer"
        />
        <div className="flex justify-between text-sm text-frost -mt-1">
          <span>{t("settings.none")}</span>
          <span>{t("settings.strong")}</span>
        </div>
        <button
          onClick={() => onChange({ cardBlur: blur.default })}
          disabled={settings.cardBlur === blur.default}
          className={`mt-4 text-sm text-frost hover:text-snow underline underline-offset-4 disabled:opacity-40 disabled:no-underline min-h-[44px] ${focusRing}`}
        >
          {t("settings.reset")}
        </button>
      </div>
    </div>
  );
}

function GiftDialog({
  personName,
  gift,
  t,
  onSave,
  onClose,
}: {
  personName: string;
  gift?: Gift;
  t: Translate;
  onSave: (draft: GiftDraft) => Promise<boolean>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(gift?.description ?? "");
  const [url, setUrl] = useState(gift?.url ?? "");
  const [note, setNote] = useState(gift?.note ?? "");
  const [error, setError] = useState<{ field: "description" | "url" | "form"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError({ field: "description", message: t("gift.nameRequired") });
      return;
    }
    const normalizedUrl = url.trim() ? normalizeGiftUrl(url) : null;
    if (url.trim() && !normalizedUrl) {
      setError({ field: "url", message: t("gift.urlInvalid") });
      return;
    }

    setError(null);
    setSaving(true);
    if (await onSave({ description, url: normalizedUrl, note })) {
      onClose();
    } else {
      setSaving(false);
      setError({ field: "form", message: t("gift.saveFailed") });
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 text-base rounded-xl bg-night border text-snow placeholder:text-frost/60 focus:outline-none focus:border-candle min-h-[44px]";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-night/70" onClick={onClose} aria-hidden="true" />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-dialog-title"
        onSubmit={submit}
        noValidate
        className="relative w-full sm:max-w-md bg-night-soft border-t sm:border border-white/15 rounded-t-3xl sm:rounded-2xl px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 shadow-2xl shadow-black/50"
      >
        <div className="sm:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
        <p className="text-sm text-frost truncate">
          {t("gift.for")} {personName}
        </p>
        <h2 id="gift-dialog-title" className="font-display font-semibold text-xl tracking-tight mb-5">
          {gift ? t("gift.editTitle") : t("dashboard.addGift")}
        </h2>

        <label htmlFor="gift-name" className="block font-medium mb-1.5">
          {t("gift.name")}
        </label>
        <input
          id="gift-name"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("dashboard.giftPlaceholder")}
          aria-invalid={error?.field === "description"}
          aria-describedby={error?.field === "description" ? "gift-error" : undefined}
          className={`${inputClass} ${error?.field === "description" ? "border-[#F2868C]" : "border-night-line"}`}
          autoFocus
        />

        <label htmlFor="gift-url" className="block font-medium mt-4 mb-1.5">
          {t("gift.url")} <span className="font-normal text-frost">{t("gift.optional")}</span>
        </label>
        <input
          id="gift-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={GIFT_URL_MAX_LENGTH}
          placeholder="https://"
          aria-invalid={error?.field === "url"}
          aria-describedby={error?.field === "url" ? "gift-error" : undefined}
          className={`${inputClass} ${error?.field === "url" ? "border-[#F2868C]" : "border-night-line"}`}
        />

        <label htmlFor="gift-note" className="block font-medium mt-4 mb-1.5">
          {t("gift.note")} <span className="font-normal text-frost">{t("gift.optional")}</span>
        </label>
        <textarea
          id="gift-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={GIFT_NOTE_MAX_LENGTH}
          placeholder={t("gift.notePlaceholder")}
          className={`${inputClass} border-night-line resize-y`}
        />

        {error && (
          <p id="gift-error" role="alert" className="mt-3 text-sm text-[#F2868C]">
            {error.message}
          </p>
        )}

        <div className="mt-6 flex gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-frost hover:text-snow hover:bg-white/10 font-semibold min-h-[44px] ${focusRing}`}
          >
            {t("dashboard.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-spruce hover:bg-spruce-dark text-white font-semibold min-h-[44px] disabled:opacity-60 ${focusRing}`}
          >
            {gift ? t("dashboard.save") : t("dashboard.addGift")}
          </button>
        </div>
      </form>
    </div>
  );
}

function SantaFace({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      {/* Hat, flopping to the right, with its pompom */}
      <path d="M9 17 C 10 8, 18 3, 27 6 L 32 11 L 31 17 Z" fill="#C2303A" />
      <circle cx="32" cy="11" r="3" fill="#F4F7FB" />
      <ellipse cx="20" cy="23" rx="9" ry="6.5" fill="#F2C6A8" />
      <rect x="7" y="15" width="26" height="5" rx="2.5" fill="#F4F7FB" />
      <path d="M9 22 C 9 34, 15 38, 20 38 C 25 38, 31 34, 31 22 C 28 27, 24 28.5, 20 28.5 C 16 28.5, 12 27, 9 22 Z" fill="#F4F7FB" />
      <circle cx="16.5" cy="22.5" r="1.2" fill="#13202F" />
      <circle cx="23.5" cy="22.5" r="1.2" fill="#13202F" />
      <circle cx="20" cy="25" r="1.7" fill="#E58E86" />
      <path d="M20 26.8 C 17 25.2, 14 26, 13.5 28.2 C 16 28.8, 18 28.4, 20 27.8 C 22 28.4, 24 28.8, 26.5 28.2 C 26 26, 23 25.2, 20 26.8 Z" fill="#DCE4EE" />
    </svg>
  );
}

// A small present: dashed outline when nothing is planned, red box once there's an idea,
// and a gold ribbon once every gift for the person is bought and wrapped.
function GiftBox({ state, className = "" }: { state: "empty" | "idea" | "done"; className?: string }) {
  if (state === "empty") {
    return (
      <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="5" y="14" width="30" height="22" rx="3" stroke="#A9BCD0" strokeWidth="2" strokeDasharray="4 3" />
        <rect x="3" y="9" width="34" height="7" rx="2" stroke="#A9BCD0" strokeWidth="2" strokeDasharray="4 3" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="5" y="14" width="30" height="22" rx="3" fill="#C2303A" />
      <rect x="3" y="9" width="34" height="7" rx="2" fill="#9E2530" />
      {state === "done" && (
        <>
          <rect x="17.5" y="9" width="5" height="27" fill="#F0B84E" />
          <path d="M20 9 C 14 2, 8 6, 12 9 Z M20 9 C 26 2, 32 6, 28 9 Z" fill="#F0B84E" />
        </>
      )}
    </svg>
  );
}

function PersonSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight mb-5 flex items-baseline gap-3">
        {title}
        <span className="text-base font-medium text-frost">{count}</span>
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface PersonCardProps {
  person: Person;
  listType: ListType;
  isFirst: boolean;
  isLast: boolean;
  t: Translate;
  onOpenGift: (person: Person, gift?: Gift) => void;
  onDeleteGift: (giftId: string) => void;
  onToggleGift: (giftId: string, field: "purchased" | "giftWrapped", value: boolean) => void;
  onMove: (personId: string, direction: "up" | "down", listType: ListType) => void;
  onDeletePerson: (personId: string) => void;
}

// Each person is drawn as a frosted-glass gift tag: punched hole, name, and the gifts planned for them.
function PersonCard({ person, listType, isFirst, isLast, t, onOpenGift, onDeleteGift, onToggleGift, onMove, onDeletePerson }: PersonCardProps) {
  const done = isPersonDone(person);
  const hasGifts = person.gifts.length > 0;

  return (
    <article
      id={`person-${person.id}`}
      className={`scroll-mt-6 relative bg-night-soft/50 [-webkit-backdrop-filter:blur(var(--card-blur))] [backdrop-filter:blur(var(--card-blur))] border border-white/15 text-snow rounded-2xl pl-4 pr-3 sm:pl-6 sm:pr-4 py-4 sm:py-5 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] border-l-[6px] ${
        done ? "border-l-spruce" : hasGifts ? "border-l-candle" : "border-l-berry"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="hidden sm:block w-3 h-3 rounded-full bg-night ring-2 ring-frost/60 shrink-0" aria-hidden="true" />
        <h3 className="font-display font-semibold text-xl tracking-tight flex-1 min-w-0 truncate">{person.name}</h3>
        <div className="flex items-center">
          <IconButton label={t("dashboard.moveUp")} disabled={isFirst} onClick={() => onMove(person.id, "up", listType)}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </IconButton>
          <IconButton label={t("dashboard.moveDown")} disabled={isLast} onClick={() => onMove(person.id, "down", listType)}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </IconButton>
          {!hasGifts && (
            <IconButton
              label={t("dashboard.removePerson")}
              tone="danger"
              onClick={() => {
                if (confirm(`Are you sure you want to remove ${person.name}?`)) {
                  onDeletePerson(person.id);
                }
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </IconButton>
          )}
        </div>
      </div>

      {hasGifts ? (
        <ul className="mt-3 divide-y divide-white/10">
          {person.gifts.map((gift) => (
            <GiftRow
              key={gift.id}
              gift={gift}
              t={t}
              onEdit={() => onOpenGift(person, gift)}
              onDelete={() => onDeleteGift(gift.id)}
              onToggle={(field, value) => onToggleGift(gift.id, field, value)}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-frost">{t("dashboard.noGiftPlanned")}</p>
      )}

      <button
        onClick={() => onOpenGift(person)}
        className={`mt-3 inline-flex items-center gap-1.5 px-3 py-2 -ml-3 rounded-xl text-mint font-semibold hover:bg-white/10 min-h-[44px] ${focusRing}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        {t("dashboard.addGift")}
      </button>
    </article>
  );
}

interface GiftRowProps {
  gift: Gift;
  t: Translate;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (field: "purchased" | "giftWrapped", value: boolean) => void;
}

// Short label for a gift link, e.g. "amazon.com" for https://www.amazon.com/dp/...
function linkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function GiftRow({ gift, t, onEdit, onDelete, onToggle }: GiftRowProps) {
  const done = isGiftDone(gift);

  return (
    <li className="py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <div className="flex-1 min-w-0">
        <p className={`break-words ${done ? "line-through decoration-frost/50 text-frost/60" : ""}`}>
          {gift.description}
        </p>
        {gift.url && (
          <a
            href={gift.url}
            target="_blank"
            rel="noopener noreferrer"
            title={gift.url}
            className={`inline-flex items-center gap-1 max-w-full text-sm text-mint hover:underline underline-offset-4 rounded ${focusRing}`}
          >
            <span className="truncate">{linkLabel(gift.url)}</span>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="sr-only">{t("gift.opensInNewTab")}</span>
          </a>
        )}
        {gift.note && (
          <p className="mt-1 flex gap-1.5 text-sm text-candle/90">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-9 8l3-3h11a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14z" />
            </svg>
            <span className="sr-only">{t("gift.note")}:</span>
            <span className="min-w-0 break-words whitespace-pre-line">{gift.note}</span>
          </p>
        )}
      </div>
      {/* On phones the toggles drop to their own row; edit/delete stay beside the description */}
      <div className="order-last sm:order-none w-full sm:w-auto flex items-center gap-1.5">
        <StatusToggle active={gift.purchased} onClick={() => onToggle("purchased", !gift.purchased)}>
          {t("dashboard.purchased")}
        </StatusToggle>
        <StatusToggle active={gift.giftWrapped} onClick={() => onToggle("giftWrapped", !gift.giftWrapped)}>
          {t("dashboard.wrapped")}
        </StatusToggle>
      </div>
      <span className="flex -mr-1">
        <IconButton label={t("dashboard.edit")} onClick={onEdit}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4L18.768 9.232a2.5 2.5 0 00-3.536-3.536L4.5 16.464 4 20z" />
        </IconButton>
        <IconButton label={t("dashboard.delete")} tone="danger" onClick={onDelete}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </IconButton>
      </span>
    </li>
  );
}

function StatusToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 rounded-full text-sm font-medium border min-h-[44px] sm:min-h-[34px] transition-colors ${focusRing} ${
        active
          ? "bg-spruce border-spruce text-white"
          : "bg-transparent border-white/25 text-frost hover:border-white/50 hover:text-snow"
      }`}
    >
      <svg className={`w-3.5 h-3.5 ${active ? "" : "opacity-0 -ml-5"} transition-all`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-11 h-11 sm:w-9 sm:h-9 grid place-items-center rounded-lg text-frost/70 disabled:opacity-25 disabled:pointer-events-none transition-colors ${focusRing} ${
        tone === "danger" ? "hover:text-[#F2868C] hover:bg-berry/20" : "hover:text-snow hover:bg-white/10"
      }`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
