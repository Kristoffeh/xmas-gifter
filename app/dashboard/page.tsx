"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "@/lib/language-context";

interface Gift {
  id: string;
  description: string;
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
  const [draggedPerson, setDraggedPerson] = useState<string | null>(null);
  const [dragOverPerson, setDragOverPerson] = useState<string | null>(null);
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
    } else if (status === "authenticated") {
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

  const handleDragStart = (personId: string) => {
    setDraggedPerson(personId);
  };

  const handleDragOver = (e: React.DragEvent, personId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPerson && draggedPerson !== personId) {
      setDragOverPerson(personId);
    }
  };

  const handleDragLeave = () => {
    setDragOverPerson(null);
  };

  const handleDrop = async (targetPersonId: string, listType: "withGifts" | "withoutGifts") => {
    if (!draggedPerson || draggedPerson === targetPersonId) {
      setDraggedPerson(null);
      setDragOverPerson(null);
      return;
    }

    const peopleWithGifts = people.filter((p) => p.gifts && p.gifts.length > 0);
    const peopleWithoutGifts = people.filter(
      (p) => !p.gifts || p.gifts.length === 0
    );
    const currentList = listType === "withGifts" ? peopleWithGifts : peopleWithoutGifts;
    const draggedIndex = currentList.findIndex((p) => p.id === draggedPerson);
    const targetIndex = currentList.findIndex((p) => p.id === targetPersonId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPerson(null);
      setDragOverPerson(null);
      return;
    }

    // Create new ordered array
    const newOrder = [...currentList];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

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

    setDraggedPerson(null);
    setDragOverPerson(null);
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
      className="min-h-screen py-12 px-4 relative overflow-hidden"
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
      <div className="max-w-4xl mx-auto">
        {/* Christmas Countdown */}
        <div 
          className="rounded-lg shadow-xl p-6 mb-6 text-white relative overflow-hidden"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=1200&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-black/60 dark:bg-black/70"></div>
          <div className="text-center relative z-10">
            <h2 className="text-xl font-bold mb-4">🎄 {t("dashboard.countdownTitle") || "Time Until Christmas"} 🎄</h2>
            <div className="flex items-center justify-center gap-4 md:gap-8">
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-bold">{timeUntilChristmas.days}</div>
                <div className="text-sm md:text-base opacity-90">{t("dashboard.days") || "Days"}</div>
              </div>
              <div className="text-3xl md:text-4xl font-bold">:</div>
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-bold">{timeUntilChristmas.hours.toString().padStart(2, '0')}</div>
                <div className="text-sm md:text-base opacity-90">{t("dashboard.hours") || "Hours"}</div>
              </div>
              <div className="text-3xl md:text-4xl font-bold">:</div>
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-bold">{timeUntilChristmas.minutes.toString().padStart(2, '0')}</div>
                <div className="text-sm md:text-base opacity-90">{t("dashboard.minutes") || "Minutes"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-8 mb-6 border border-white/30 dark:border-gray-700/30">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              🎄 {t("dashboard.title")}
            </h1>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition duration-200"
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
                <div className="absolute right-0 mt-2 w-48 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-lg border border-white/30 dark:border-gray-700/30 z-50">
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
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-6 mb-6 border border-white/30 dark:border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
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
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-6 border-2 border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex gap-2">
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
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setAddingPerson(false);
                        setNewPersonName("");
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition duration-200 font-semibold"
                    >
                      {t("dashboard.cancel")}
                    </button>
                    <button
                      onClick={handleAddPerson}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200 font-semibold"
                    >
                      {t("dashboard.add") || "Add"}
                    </button>
                  </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {peopleWithGifts.length > 0 && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-8 border border-white/30 dark:border-gray-700/30">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                ✅ {t("dashboard.giftsFound")}
              </h2>
              <div className="space-y-4">
                {peopleWithGifts.map((person) => (
                  <div
                    key={person.id}
                    draggable
                    onDragStart={() => handleDragStart(person.id)}
                    onDragOver={(e) => handleDragOver(e, person.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(person.id, "withGifts")}
                    className={`p-4 rounded-lg border-2 cursor-move transition-all duration-200 ${
                      draggedPerson === person.id
                        ? "opacity-40 scale-95 bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 shadow-lg"
                        : dragOverPerson === person.id
                        ? "bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 border-dashed scale-105 shadow-md"
                        : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <svg
                          className="w-5 h-5 text-gray-400 cursor-move"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8h16M4 16h16"
                          />
                        </svg>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                          {person.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setAddingGift(person.id);
                          setGiftInputs({
                            ...giftInputs,
                            [person.id]: "",
                          });
                        }}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition duration-200"
                      >
                        + {t("dashboard.addGift")}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {person.gifts.map((gift) => (
                        <div
                          key={gift.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
                        >
                          {editingGift === gift.id ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={giftInputs[gift.id] || gift.description}
                                onChange={(e) =>
                                  setGiftInputs({
                                    ...giftInputs,
                                    [gift.id]: e.target.value,
                                  })
                                }
                                className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none"
                                placeholder="Gift description"
                              />
                              <button
                                onClick={() => handleSaveGift(person.id, gift.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition duration-200"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingGift(null);
                                  setGiftInputs({
                                    ...giftInputs,
                                    [gift.id]: gift.description,
                                  });
                                }}
                                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded text-sm transition duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="flex-1 text-gray-700 dark:text-gray-300">
                                {gift.description}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingGift(gift.id);
                                    setGiftInputs({
                                      ...giftInputs,
                                      [gift.id]: gift.description,
                                    });
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition duration-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteGift(gift.id)}
                                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition duration-200"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    {addingGift === person.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={giftInputs[person.id] || ""}
                          onChange={(e) =>
                            setGiftInputs({
                              ...giftInputs,
                              [person.id]: e.target.value,
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none"
                          placeholder="What are you giving them?"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleSaveGift(person.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleSaveGift(person.id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200"
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
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition duration-200"
                        >
                          {t("dashboard.cancel")}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {peopleWithoutGifts.length > 0 && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-8 border border-white/30 dark:border-gray-700/30">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                🎁 {t("dashboard.stillNeedGifts")}
              </h2>
              <div className="space-y-4">
                {peopleWithoutGifts.map((person) => (
                  <div
                    key={person.id}
                    draggable
                    onDragStart={() => handleDragStart(person.id)}
                    onDragOver={(e) => handleDragOver(e, person.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(person.id, "withoutGifts")}
                    className={`p-4 rounded-lg border-2 cursor-move transition-all duration-200 ${
                      draggedPerson === person.id
                        ? "opacity-40 scale-95 bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600 shadow-lg"
                        : dragOverPerson === person.id
                        ? "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600 border-dashed scale-105 shadow-md"
                        : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex flex-col gap-1 cursor-move group">
                          <svg
                            className={`w-5 h-5 transition-colors ${
                              draggedPerson === person.id
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-gray-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6h16M4 12h16M4 18h16"
                            />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                          {person.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setAddingGift(person.id);
                          setGiftInputs({
                            ...giftInputs,
                            [person.id]: "",
                          });
                        }}
                        className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded transition duration-200"
                      >
                        + {t("dashboard.addGift")}
                      </button>
                    </div>
                    {person.gifts && person.gifts.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {person.gifts.map((gift) => (
                          <div
                            key={gift.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
                          >
                            {editingGift === gift.id ? (
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  value={giftInputs[gift.id] || gift.description}
                                  onChange={(e) =>
                                    setGiftInputs({
                                      ...giftInputs,
                                      [gift.id]: e.target.value,
                                    })
                                  }
                                  className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none"
                                  placeholder="Gift description"
                                />
                                <button
                                  onClick={() => handleSaveGift(person.id, gift.id)}
                                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition duration-200"
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
                                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded text-sm transition duration-200"
                                >
                                  {t("dashboard.cancel")}
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="flex-1 text-gray-700 dark:text-gray-300">
                                  {gift.description}
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingGift(gift.id);
                                      setGiftInputs({
                                        ...giftInputs,
                                        [gift.id]: gift.description,
                                      });
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition duration-200"
                                  >
                                    {t("dashboard.edit")}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGift(gift.id)}
                                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition duration-200"
                                  >
                                    {t("dashboard.delete")}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(!person.gifts || person.gifts.length === 0) && (
                          <p className="text-gray-500 dark:text-gray-400 italic mb-3">
                            {t("dashboard.noGiftPlanned")}
                          </p>
                    )}
                    {addingGift === person.id && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={giftInputs[person.id] || ""}
                          onChange={(e) =>
                            setGiftInputs({
                              ...giftInputs,
                              [person.id]: e.target.value,
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none"
                          placeholder="What are you giving them?"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleSaveGift(person.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleSaveGift(person.id)}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition duration-200"
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
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition duration-200"
                        >
                          {t("dashboard.cancel")}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {people.length === 0 && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl p-8 text-center border border-white/30 dark:border-gray-700/30">
              <p className="text-gray-600 dark:text-gray-400">
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

