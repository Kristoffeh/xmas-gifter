"use client";

import { useState, useEffect, useRef } from "react";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
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
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setLanguage(language === "en" ? "no" : "en");
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                    >
                      <span>{t("dashboard.language")}</span>
                      <span className="text-xs">
                        {language === "en" ? "🇬🇧 English" : "🇳🇴 Norwegian"}
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
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
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
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
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
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {peopleWithoutGifts.length}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {peopleWithGifts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                ✅ {t("dashboard.giftsFound")}
              </h2>
              <div className="space-y-4">
                {peopleWithGifts.map((person) => (
                  <div
                    key={person.id}
                    className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
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
                                className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                🎁 {t("dashboard.stillNeedGifts")}
              </h2>
              <div className="space-y-4">
                {peopleWithoutGifts.map((person) => (
                  <div
                    key={person.id}
                    className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
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
                                  className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                {t("dashboard.noPeople")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

