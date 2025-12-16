"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "@/lib/language-context";

interface Gift {
  id: string;
  description: string;
  purchased: boolean;
  giftWrapped: boolean;
}

interface Person {
  id: string;
  name: string;
  gifts: Gift[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { language, setLanguage, t } = useLanguage();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGift, setEditingGift] = useState<string | null>(null);
  const [addingGift, setAddingGift] = useState<string | null>(null);
  const [giftInputs, setGiftInputs] = useState<Record<string, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
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
        // Initialize gift inputs
        const inputs: Record<string, string> = {};
        setGiftInputs(inputs);
      }
    } catch (error) {
      console.error("Error fetching people:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGift = async (personId: string, giftId?: string) => {
    const description = giftInputs[personId] || "";

    if (!description.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/gifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, description, giftId }),
      });

      if (response.ok) {
        await fetchPeople();
        setEditingGift(null);
        setAddingGift(null);
        setGiftInputs({ ...giftInputs, [personId]: "" });
      }
    } catch (error) {
      console.error("Error saving gift:", error);
    }
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

  const handleMovePerson = async (personId: string, direction: "up" | "down", listType: "withGifts" | "withoutGifts") => {
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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
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

  return (
    <div
      className="min-h-screen py-4 sm:py-8 md:py-12 px-2 sm:px-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1920&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 pointer-events-none z-0"></div>
      {/* Snowing Animation */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
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
              }}
            >
              ❄
            </div>
          </div>
        ))}
      </div>
      <div className="relative z-10">
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
        {/* Christmas Countdown */}
        <div 
          className="rounded-lg shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 text-white relative overflow-hidden"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=1200&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-black/60 dark:bg-black/70"></div>
          <div className="text-center relative z-10">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">🎄 {t("dashboard.countdownTitle") || "Time Until Christmas"} 🎄</h2>
            <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-8">
              <div className="flex flex-col items-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold">{timeUntilChristmas.days}</div>
                <div className="text-xs sm:text-sm md:text-base opacity-90">{t("dashboard.days") || "Days"}</div>
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">:</div>
              <div className="flex flex-col items-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold">{timeUntilChristmas.hours.toString().padStart(2, '0')}</div>
                <div className="text-xs sm:text-sm md:text-base opacity-90">{t("dashboard.hours") || "Hours"}</div>
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">:</div>
              <div className="flex flex-col items-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold">{timeUntilChristmas.minutes.toString().padStart(2, '0')}</div>
                <div className="text-xs sm:text-sm md:text-base opacity-90">{t("dashboard.minutes") || "Minutes"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 border border-white/30 dark:border-gray-700/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
              🎄 {t("dashboard.title")}
            </h1>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition duration-200 text-sm sm:text-base min-h-[44px]"
              >
                <span className="text-gray-800 dark:text-white font-medium">
                  {session?.user?.username}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg shadow-lg border border-white/30 dark:border-gray-700/30 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setLanguage(language === "en" ? "no" : "en");
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        {language === "en" ? (
                          <svg className="w-6 h-4" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
                            <rect width="60" height="30" fill="#012169"/>
                            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFF" strokeWidth="3"/>
                            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2"/>
                            <line x1="30" y1="0" x2="30" y2="30" stroke="#FFF" strokeWidth="6"/>
                            <line x1="0" y1="15" x2="60" y2="15" stroke="#FFF" strokeWidth="6"/>
                            <line x1="30" y1="0" x2="30" y2="30" stroke="#C8102E" strokeWidth="4"/>
                            <line x1="0" y1="15" x2="60" y2="15" stroke="#C8102E" strokeWidth="4"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-4" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                            <rect width="60" height="40" fill="#BA0C2F"/>
                            <rect x="18" y="0" width="6" height="40" fill="#00205B"/>
                            <rect x="0" y="17" width="60" height="6" fill="#00205B"/>
                            <rect x="20" y="0" width="2" height="40" fill="#FFF"/>
                            <rect x="0" y="19" width="60" height="2" fill="#FFF"/>
                          </svg>
                        )}
                        {t("dashboard.language")}
                      </span>
                      <span className="text-xs">
                        {language === "en" ? "English" : "Norwegian"}
                      </span>
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t("dashboard.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl leading-none">👤</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("dashboard.totalPeople")}
                </span>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                {people.length}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl leading-none">🎁</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("dashboard.totalGifts")}
                </span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                {totalGifts}
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl leading-none">⏳</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("dashboard.stillNeeded")}
                </span>
              </div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                {peopleWithoutGifts.length}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {people.length > 0 && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-white/30 dark:border-gray-700/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
                  {t("dashboard.giftProgress") || "Gift Progress"}
                </h3>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {peopleWithGifts.length} / {people.length} {t("dashboard.people") || "people"}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 relative overflow-hidden"
                  style={{
                    width: `${people.length > 0 ? (peopleWithGifts.length / people.length) * 100 : 0}%`,
                  }}
                >
                  {/* Shimmer animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  {peopleWithGifts.length > 0 && peopleWithGifts.length === people.length && (
                    <span className="text-xs font-bold text-white relative z-10 animate-bounce">✓</span>
                  )}
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {peopleWithoutGifts.length === 0 ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    🎉 {t("dashboard.allGiftsFound") || "All gifts found! You're ready for Christmas!"}
                  </span>
                ) : (
                  <span>
                    {peopleWithoutGifts.length} {t("dashboard.peopleLeft") || "people"} {t("dashboard.stillNeedGiftsLower") || "still need gifts"}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          {!addingPerson ? (
            <button
              onClick={() => setAddingPerson(true)}
              className="w-full px-6 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-800 dark:text-white font-semibold rounded-lg shadow-xl border-2 border-dashed border-gray-300/50 dark:border-gray-600/50 hover:border-gray-400 dark:hover:border-gray-500 transition duration-200 flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("dashboard.addPerson") || "Add New Person"}
            </button>
          ) : (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-4 sm:p-6 border-2 border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddPerson();
                        }
                      }}
                      placeholder={t("dashboard.personNamePlaceholder") || "Enter person's name"}
                      className="flex-1 px-4 py-3 sm:py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none min-h-[44px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAddingPerson(false);
                          setNewPersonName("");
                        }}
                        className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition duration-200 font-semibold text-base min-h-[44px]"
                      >
                        {t("dashboard.cancel")}
                      </button>
                      <button
                        onClick={handleAddPerson}
                        className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200 font-semibold text-base min-h-[44px]"
                      >
                        {t("dashboard.add") || "Add"}
                      </button>
                    </div>
                  </div>
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-6">
          {peopleWithGifts.length > 0 && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-4 sm:p-6 md:p-8 border border-white/30 dark:border-gray-700/30">
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white">
                ✅ {t("dashboard.giftsFound")}
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {peopleWithGifts.map((person, index) => (
                  <div
                    key={person.id}
                    className="p-3 sm:p-4 rounded-lg transition-all duration-200 hover:bg-white/30 dark:hover:bg-gray-800/30 hover:backdrop-blur-sm hover:shadow-lg"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => handleMovePerson(person.id, "up", "withGifts")}
                          disabled={index === 0}
                          className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Move up"
                        >
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMovePerson(person.id, "down", "withGifts")}
                          disabled={index === peopleWithGifts.length - 1}
                          className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Move down"
                        >
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg text-gray-800 dark:text-white">
                            {person.name}
                          </h3>
                          <button
                            onClick={() => {
                              setAddingGift(person.id);
                              setGiftInputs({
                                ...giftInputs,
                                [person.id]: "",
                              });
                            }}
                            className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 hover:bg-green-700 text-white rounded transition duration-200 min-h-[44px] whitespace-nowrap"
                          >
                            + {t("dashboard.addGift")}
                          </button>
                        </div>
                        <div className="space-y-2">
                          {person.gifts.map((gift) => (
                            <div
                              key={gift.id}
                              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-md border ${
                                gift.purchased && gift.giftWrapped
                                  ? "border-green-500 dark:border-green-400"
                                  : "border-white/40 dark:border-gray-700/40"
                              }`}
                            >
                              {editingGift === gift.id ? (
                                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                value={giftInputs[gift.id] || gift.description}
                                onChange={(e) =>
                                  setGiftInputs({
                                    ...giftInputs,
                                    [gift.id]: e.target.value,
                                  })
                                }
                                className="flex-1 px-3 py-3 sm:py-2 text-base border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none min-h-[44px]"
                                placeholder="Gift description"
                              />
                                <div className="flex gap-2">
                                <button
                                onClick={() => handleSaveGift(person.id, gift.id)}
                                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm sm:text-base transition duration-200 min-h-[44px]"
                              >
                                {t("dashboard.save")}
                              </button>
                                <button
                                onClick={() => {
                                  setEditingGift(null);
                                  setGiftInputs({
                                    ...giftInputs,
                                    [gift.id]: gift.description,
                                  });
                                }}
                                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded text-sm sm:text-base transition duration-200 min-h-[44px]"
                              >
                                {t("dashboard.cancel")}
                              </button>
                                </div>
                                </div>
                          ) : (
                            <>
                              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                                <p className={`text-sm sm:text-base text-gray-700 dark:text-gray-300 break-words ${
                                  gift.purchased && gift.giftWrapped ? "line-through opacity-60" : ""
                                }`}>
                                  {gift.description}
                                </p>
                                {gift.purchased && gift.giftWrapped && (
                                  <span className="text-green-600 dark:text-green-400 text-sm font-semibold whitespace-nowrap">
                                    ✓ {t("dashboard.done")}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                <div className="flex items-center gap-3 sm:gap-2">
                                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                                    <input
                                      type="checkbox"
                                      checked={gift.purchased}
                                      onChange={(e) => handleToggleGiftStatus(gift.id, "purchased", e.target.checked)}
                                      className="w-5 h-5 sm:w-4 sm:h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                    <span className="text-sm sm:text-xs text-gray-600 dark:text-gray-400">{t("dashboard.purchased")}</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                                    <input
                                      type="checkbox"
                                      checked={gift.giftWrapped}
                                      onChange={(e) => handleToggleGiftStatus(gift.id, "giftWrapped", e.target.checked)}
                                      className="w-5 h-5 sm:w-4 sm:h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                    <span className="text-sm sm:text-xs text-gray-600 dark:text-gray-400">{t("dashboard.wrapped")}</span>
                                  </label>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                  <button
                                    onClick={() => {
                                      setEditingGift(gift.id);
                                      setGiftInputs({
                                        ...giftInputs,
                                        [gift.id]: gift.description,
                                      });
                                    }}
                                    className="flex-1 sm:flex-none px-3 sm:px-2 py-2 sm:py-1 text-sm sm:text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition duration-200 min-h-[44px] sm:min-h-0"
                                  >
                                    {t("dashboard.edit")}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGift(gift.id)}
                                    className="flex-1 sm:flex-none px-3 sm:px-2 py-2 sm:py-1 text-sm sm:text-xs bg-red-600 hover:bg-red-700 text-white rounded transition duration-200 min-h-[44px] sm:min-h-0"
                                  >
                                    {t("dashboard.delete")}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                            </div>
                          ))}
                        </div>
                        {addingGift === person.id && (
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={giftInputs[person.id] || ""}
                              onChange={(e) =>
                                setGiftInputs({
                                  ...giftInputs,
                                  [person.id]: e.target.value,
                                })
                              }
                              className="flex-1 px-3 py-3 sm:py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none min-h-[44px]"
                              placeholder="What are you giving them?"
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveGift(person.id);
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveGift(person.id)}
                                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200 text-base min-h-[44px]"
                              >
                                {t("dashboard.addGift")}
                              </button>
                              <button
                                onClick={() => {
                                  setAddingGift(null);
                                  setGiftInputs({
                                    ...giftInputs,
                                    [person.id]: "",
                                  });
                                }}
                                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition duration-200 text-base min-h-[44px]"
                              >
                                {t("dashboard.cancel")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {peopleWithoutGifts.length > 0 && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-4 sm:p-6 md:p-8 border border-white/30 dark:border-gray-700/30">
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white">
                🎁 {t("dashboard.stillNeedGifts")}
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {peopleWithoutGifts.map((person, index) => (
                  <div
                    key={person.id}
                    className="p-3 sm:p-4 rounded-lg transition-all duration-200 hover:bg-white/30 dark:hover:bg-gray-800/30 hover:backdrop-blur-sm hover:shadow-lg"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => handleMovePerson(person.id, "up", "withoutGifts")}
                          disabled={index === 0}
                          className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Move up"
                        >
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMovePerson(person.id, "down", "withoutGifts")}
                          disabled={index === peopleWithoutGifts.length - 1}
                          className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Move down"
                        >
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg text-gray-800 dark:text-white">
                            {person.name}
                          </h3>
                          <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setAddingGift(person.id);
                            setGiftInputs({
                              ...giftInputs,
                              [person.id]: "",
                            });
                          }}
                          className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-yellow-600 hover:bg-yellow-700 text-white rounded transition duration-200 flex items-center justify-center min-h-[44px] whitespace-nowrap"
                        >
                          + {t("dashboard.addGift")}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${person.name}?`)) {
                              handleDeletePerson(person.id);
                            }
                          }}
                          className="p-2.5 sm:p-2 sm:px-3 sm:py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition duration-200 flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-w-0"
                          title="Remove person"
                        >
                          <svg
                            className="w-5 h-5 sm:w-4 sm:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                          </div>
                        </div>
                        {person.gifts && person.gifts.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {person.gifts.map((gift) => (
                              <div
                                key={gift.id}
                                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-md border ${
                                  gift.purchased && gift.giftWrapped
                                    ? "border-green-500 dark:border-green-400"
                                    : "border-white/40 dark:border-gray-700/40"
                                }`}
                              >
                                {editingGift === gift.id ? (
                                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                    <input
                                      type="text"
                                      value={giftInputs[gift.id] || gift.description}
                                      onChange={(e) =>
                                        setGiftInputs({
                                          ...giftInputs,
                                          [gift.id]: e.target.value,
                                        })
                                      }
                                      className="flex-1 px-3 py-3 sm:py-2 text-base border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none min-h-[44px]"
                                      placeholder="Gift description"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleSaveGift(person.id, gift.id)}
                                        className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm sm:text-base transition duration-200 min-h-[44px]"
                                      >
                                        {t("dashboard.save")}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingGift(null);
                                          setGiftInputs({
                                            ...giftInputs,
                                            [gift.id]: gift.description,
                                          });
                                        }}
                                        className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded text-sm sm:text-base transition duration-200 min-h-[44px]"
                                      >
                                        {t("dashboard.cancel")}
                                      </button>
                                    </div>
                                  </div>
                            ) : (
                              <>
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                                  <p className={`text-sm sm:text-base text-gray-700 dark:text-gray-300 break-words ${
                                    gift.purchased && gift.giftWrapped ? "line-through opacity-60" : ""
                                  }`}>
                                    {gift.description}
                                  </p>
                                  {gift.purchased && gift.giftWrapped && (
                                    <span className="text-green-600 dark:text-green-400 text-sm font-semibold whitespace-nowrap">
                                      ✓ {t("dashboard.done")}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                  <div className="flex items-center gap-3 sm:gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                                      <input
                                        type="checkbox"
                                        checked={gift.purchased}
                                        onChange={(e) => handleToggleGiftStatus(gift.id, "purchased", e.target.checked)}
                                        className="w-5 h-5 sm:w-4 sm:h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
                                      />
                                      <span className="text-sm sm:text-xs text-gray-600 dark:text-gray-400">{t("dashboard.purchased")}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                                      <input
                                        type="checkbox"
                                        checked={gift.giftWrapped}
                                        onChange={(e) => handleToggleGiftStatus(gift.id, "giftWrapped", e.target.checked)}
                                        className="w-5 h-5 sm:w-4 sm:h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
                                      />
                                      <span className="text-sm sm:text-xs text-gray-600 dark:text-gray-400">{t("dashboard.wrapped")}</span>
                                    </label>
                                  </div>
                                  <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                      onClick={() => {
                                        setEditingGift(gift.id);
                                        setGiftInputs({
                                          ...giftInputs,
                                          [gift.id]: gift.description,
                                        });
                                      }}
                                      className="flex-1 sm:flex-none px-3 sm:px-2 py-2 sm:py-1 text-sm sm:text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition duration-200 min-h-[44px] sm:min-h-0"
                                    >
                                      {t("dashboard.edit")}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteGift(gift.id)}
                                      className="flex-1 sm:flex-none px-3 sm:px-2 py-2 sm:py-1 text-sm sm:text-xs bg-red-600 hover:bg-red-700 text-white rounded transition duration-200 min-h-[44px] sm:min-h-0"
                                    >
                                      {t("dashboard.delete")}
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                              </div>
                            ))}
                          </div>
                        )}
                        {(!person.gifts || person.gifts.length === 0) && (
                          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 italic mb-3">
                            {t("dashboard.noGiftPlanned")}
                          </p>
                        )}
                        {addingGift === person.id && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={giftInputs[person.id] || ""}
                              onChange={(e) =>
                                setGiftInputs({
                                  ...giftInputs,
                                  [person.id]: e.target.value,
                                })
                              }
                              className="flex-1 px-3 py-3 sm:py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none min-h-[44px]"
                              placeholder="What are you giving them?"
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveGift(person.id);
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveGift(person.id)}
                                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition duration-200 text-base min-h-[44px]"
                              >
                                {t("dashboard.addGift")}
                              </button>
                              <button
                                onClick={() => {
                                  setAddingGift(null);
                                  setGiftInputs({
                                    ...giftInputs,
                                    [person.id]: "",
                                  });
                                }}
                                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition duration-200 text-base min-h-[44px]"
                              >
                                {t("dashboard.cancel")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {people.length === 0 && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-4 sm:p-6 md:p-8 text-center border border-white/30 dark:border-gray-700/30">
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {t("dashboard.noPeople")}
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

