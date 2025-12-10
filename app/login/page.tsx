"use client";

import { useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Check if onboarding is completed
      const response = await fetch("/api/auth/session");
      const session = await response.json();

      if (session?.user?.onboardingCompleted) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Registration successful but login failed. Please try logging in.");
        setLoading(false);
        setIsLogin(true);
        return;
      }

      router.push("/onboarding");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
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
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">
          🎄 Christmas Gifter
        </h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded ${
              isLogin
                ? "bg-red-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded ${
              !isLogin
                ? "bg-red-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          {!isLogin && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={!isLogin}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none"
                placeholder="Enter your username"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none"
              placeholder="Enter your email"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-transparent dark:bg-gray-700 dark:text-white focus:outline-none"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : isLogin ? "Login" : "Register"}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}

