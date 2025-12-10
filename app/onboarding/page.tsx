"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Person {
  id: string;
  name: string;
}

interface PersonWithGifts extends Person {
  gifts: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [step, setStep] = useState(1);
  const [people, setPeople] = useState<Person[]>([]);
  const [currentName, setCurrentName] = useState("");
  const [peopleWithGifts, setPeopleWithGifts] = useState<PersonWithGifts[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const addPerson = () => {
    if (currentName.trim()) {
      setPeople([...people, { id: Date.now().toString(), name: currentName.trim() }]);
      setCurrentName("");
    }
  };

  const removePerson = (id: string) => {
    setPeople(people.filter((p) => p.id !== id));
    setPeopleWithGifts(peopleWithGifts.filter((p) => p.id !== id));
  };

  const addGift = (personId: string) => {
    setPeopleWithGifts(
      peopleWithGifts.map((p) =>
        p.id === personId ? { ...p, gifts: [...p.gifts, ""] } : p
      )
    );
  };

  const removeGift = (personId: string, giftIndex: number) => {
    setPeopleWithGifts(
      peopleWithGifts.map((p) =>
        p.id === personId
          ? { ...p, gifts: p.gifts.filter((_, i) => i !== giftIndex) }
          : p
      )
    );
  };

  const updateGift = (personId: string, giftIndex: number, value: string) => {
    setPeopleWithGifts(
      peopleWithGifts.map((p) =>
        p.id === personId
          ? {
              ...p,
              gifts: p.gifts.map((g, i) => (i === giftIndex ? value : g)),
            }
          : p
      )
    );
  };

  const handleStep1Next = async () => {
    if (people.length === 0) {
      setError("Please add at least one person");
      return;
    }

    // Save people to database
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ people: people.map((p) => p.name) }),
      });

      if (!response.ok) {
        throw new Error("Failed to save people");
      }

      const data = await response.json();
      setPeopleWithGifts(
        data.people.map((p: any) => ({ id: p.id, name: p.name, gifts: [""] }))
      );
      setStep(2);
    } catch (err) {
      setError("Failed to save people. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Next = async () => {
    setLoading(true);
    setError("");

    try {
      // Save gifts - flatten all gifts from all people
      const giftsToSave = peopleWithGifts.flatMap((p) =>
        p.gifts
          .filter((g) => g && g.trim())
          .map((g) => ({
            personId: p.id,
            description: g.trim(),
          }))
      );

      if (giftsToSave.length > 0) {
        const response = await fetch("/api/gifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gifts: giftsToSave }),
        });

        if (!response.ok) {
          throw new Error("Failed to save gifts");
        }
      }

      // Mark onboarding as complete
      const completeResponse = await fetch("/api/auth/onboarding-complete", {
        method: "POST",
      });

      if (!completeResponse.ok) {
        throw new Error("Failed to complete onboarding");
      }

      // Update the session to reflect the onboarding completion
      await update();
      
      router.push("/dashboard");
    } catch (err) {
      setError("Failed to save. Please try again.");
      setLoading(false);
    }
  };


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
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
            🎄 Welcome to Christmas Gifter!
          </h1>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Step {step} of 2
              </span>
              <div className="flex gap-2">
                <div
                  className={`h-2 w-16 rounded ${
                    step >= 1 ? "bg-red-600" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`h-2 w-16 rounded ${
                    step >= 2 ? "bg-red-600" : "bg-gray-300"
                  }`}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                Who are you giving gifts to?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add all the people you plan to give Christmas gifts to this year.
              </p>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addPerson()}
                  placeholder="Enter a name"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none"
                />
                <button
                  onClick={addPerson}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200"
                >
                  Add
                </button>
              </div>

              {people.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
                    People added:
                  </h3>
                  <div className="space-y-2">
                    {people.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="text-gray-800 dark:text-white">
                          {person.name}
                        </span>
                        <button
                          onClick={() => removePerson(person.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleStep1Next}
                disabled={loading || people.length === 0}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Next Step"}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                What gifts have you found?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                For each person, write down what gift you're planning to give
                them. You can leave some empty if you haven't found a gift yet.
              </p>

              <div className="space-y-4 mb-6">
                {peopleWithGifts.map((person) => (
                  <div
                    key={person.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      {person.name}
                    </label>
                    <div className="space-y-2">
                      {person.gifts.map((gift, giftIndex) => (
                        <div key={giftIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={gift}
                            onChange={(e) =>
                              updateGift(person.id, giftIndex, e.target.value)
                            }
                            placeholder="What are you giving them? (optional)"
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-transparent dark:bg-gray-800 dark:text-white focus:outline-none"
                          />
                          {person.gifts.length > 1 && (
                            <button
                              onClick={() => removeGift(person.id, giftIndex)}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addGift(person.id)}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200 text-sm"
                      >
                        + Add Another Gift
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Next}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Complete Onboarding"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

