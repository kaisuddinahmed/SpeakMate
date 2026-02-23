"use client";

import { useState, useEffect, Suspense, ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

type Screen = "welcome" | "login" | "signup" | "otp" | "profile" | "goals";

// -- Shared Layout Component --
function OnboardingLayout({ children, showLogo = true, showVersion = false }: { children: ReactNode; showLogo?: boolean; showVersion?: boolean }) {
  return (
    <div className="min-h-screen bg-white flex justify-center items-center font-sans">
      {/* Mobile Canvas */}
      <div className="w-full max-w-[430px] h-[100dvh] relative overflow-hidden flex flex-col justify-center items-center p-6 pb-16 border-x border-slate-100 shadow-2xl shadow-slate-200/50">

        {/* 1. Shared Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/App%20Background.svg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          {/* Subtle Noise Texture */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }}></div>
        </div>

        {/* 2. Floating Logo (Outside Card) */}
        {showLogo && (
          <div className="relative z-20 mb-2 flex flex-col items-center justify-center">
            {/* Logo Capsule Removed */}
            <div className="drop-shadow-2xl">
              <Logo />
            </div>
          </div>
        )}

        {/* Vivid Backlight Blobs (The "Pop") */}
        <div className="absolute top-[30%] left-[-20px] w-[200px] h-[200px] bg-purple-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob"></div>
        <div className="absolute top-[40%] right-[-20px] w-[200px] h-[200px] bg-cyan-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob animation-delay-2000"></div>

        {/* 3. Glass Card Container (Tight Fit) */}
        <div className="w-full z-10 relative flex flex-col items-center text-center px-6 py-14 rounded-[40px] transition-all"
          style={{
            minHeight: '600px', // Uniform Height matched to Login screen
            background: 'rgba(255, 255, 255, 0.25)', // Slightly more opaque for formality
            backdropFilter: 'blur(40px) saturate(160%)',
            WebkitBackdropFilter: 'blur(40px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)'
          }}>

          {/* Content Area */}
          <div className="w-full flex-1 flex flex-col">
            {children}
          </div>
        </div>
      </div>

      {/* Version Footer (Outside Glass Box) */}
      {showVersion && (
        <div className="absolute bottom-6 z-20 opacity-60">
          <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Version 1.0</p>
        </div>
      )}
    </div>
  );
}

// -- Input Component --
function GlassInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: any) => void;
  placeholder: string;
}) {
  return (
    <div className="text-left mb-4">
      <label className="block text-sm font-semibold text-indigo-950 mb-2 ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-5 py-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 focus:border-indigo-500 focus:bg-white/80 outline-none transition-all shadow-sm text-slate-900 placeholder:text-slate-500 font-medium"
      />
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // -- State --
  const [screen, setScreen] = useState<Screen>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  // Profile
  const [userName, setUserName] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  // Goals
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  // -- Effects --
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = window.localStorage.getItem("speakmate_userName");
      const storedGoal = window.localStorage.getItem("speakmate_goal");

      if (storedName) setUserName(storedName);
      if (storedGoal) {
        // Legacy Fix: Migrate 'ielts' to 'ieltsprep'
        if (storedGoal === 'ielts') {
          setSelectedGoal('ieltsprep');
          window.localStorage.setItem("speakmate_goal", "ieltsprep");
        } else {
          setSelectedGoal(storedGoal);
        }
      }
    }
  }, []);

  useEffect(() => {
    const goalParam = searchParams.get('goal');
    const viewParam = searchParams.get('view');

    if (goalParam && ['ieltsprep', 'professional', 'general'].includes(goalParam)) {
      router.push(`/${goalParam}`);
    } else if (goalParam === 'ielts') {
      router.push('/ieltsprep');
    } else if (viewParam === 'goals') {
      setScreen('goals');
    }
  }, [searchParams, router]);

  // -- Views --

  if (screen === "welcome") {
    return (
      <OnboardingLayout showLogo={true} showVersion={true}>
        <div className="flex flex-col items-center w-full h-full justify-between py-6">
          {/* Headings */}
          <div className="mb-12">
            <h1 className="text-[42px] font-bold mb-6 tracking-tight leading-[1.1] text-indigo-950 drop-shadow-sm">
              Welcome to <br />
              SpeakMate
            </h1>
            <p className="text-base font-medium leading-relaxed max-w-[280px] mx-auto text-slate-600/70">
              Practice English through natural conversations
            </p>
          </div>

          {/* Animated Voice Filler */}
          <div className="flex-1 flex items-center justify-center w-full py-4">
            <div className="flex items-center justify-center gap-1.5 h-12">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-indigo-400/40 rounded-full animate-wave"
                  style={{
                    height: '40%',
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: '1s'
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Buttons - No extra container background */}
          <div className="w-full space-y-3">

            {/* Primary Action - Brand Gradient */}
            <button
              onClick={() => setScreen("login")}
              className="w-full h-[64px] text-white text-[18px] font-bold rounded-2xl transition-all transform active:scale-[0.98] flex items-center justify-center relative shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 overflow-hidden tracking-wide"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}
            >
              Continue
            </button>

            {/* Secondary Action - Green/Blue Gradient */}
            <button
              onClick={() => setScreen("signup")}
              className="w-full h-[64px] text-white text-[17px] font-bold rounded-2xl transition-all transform active:scale-[0.98] flex items-center justify-center relative shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 overflow-hidden tracking-wide"
              style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #22C55E 100%)' }}
            >
              Create an account
            </button>
          </div>

        </div>
      </OnboardingLayout>
    );
  }

  if (screen === "login") {
    return (
      <OnboardingLayout showLogo={true}>
        <div className="w-full px-2">
          <h2 className="text-3xl font-bold text-indigo-950 mb-2">Welcome Back</h2>
          <p className="text-violet-900 mb-8 font-medium">Please enter your details to sign in</p>

          <GlassInput label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@example.com" />
          <GlassInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

          <button
            onClick={() => {
              if (password === "1234") {
                if (selectedGoal) {
                  // Final safety check for legacy value
                  const targetGoal = selectedGoal === 'ielts' ? 'ieltsprep' : selectedGoal;
                  router.push(`/${targetGoal}`);
                } else {
                  setScreen("goals");
                }
              } else {
                alert("Invalid password. Use 1234 for demo.");
              }
            }}
            disabled={!email || !password}
            className="w-full mt-6 py-4 px-6 text-white text-lg font-bold rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide ring-1 ring-white/20"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%, #EC4899 100%)' }}
          >
            Sign In
          </button>

          <button onClick={() => setScreen("welcome")} className="w-full mt-6 text-sm font-bold text-violet-800 hover:text-indigo-600 transition-colors">
            ← Back
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  if (screen === "signup") {
    return (
      <OnboardingLayout showLogo={true}>
        <div className="w-full px-2">
          <h2 className="text-3xl font-bold text-indigo-950 mb-2">Join SpeakMate</h2>
          <p className="text-violet-900 mb-8 font-medium">Start your journey today</p>

          <GlassInput label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@example.com" />
          <GlassInput label="Create Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

          <button
            onClick={() => { if (email && password) setScreen("otp"); }}
            disabled={!email || !password}
            className="w-full mt-6 py-4 px-6 text-white text-lg font-bold rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide ring-1 ring-white/20"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%, #EC4899 100%)' }}
          >
            Create Account
          </button>

          <button onClick={() => setScreen("welcome")} className="w-full mt-6 text-sm font-bold text-violet-800 hover:text-indigo-600 transition-colors">
            ← Back
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  if (screen === "otp") {
    return (
      <OnboardingLayout showLogo={true}>
        <div className="w-full px-2">
          <h2 className="text-3xl font-bold text-indigo-950 mb-2">Verify Email</h2>
          <p className="text-violet-900 mb-8 font-medium">We sent a code to <span className="font-bold text-indigo-700">{email || 'your email'}</span></p>

          <div className="mb-8">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="0 0 0 0"
              maxLength={4}
              className="w-full px-4 py-5 rounded-2xl bg-white/60 backdrop-blur-md border-2 border-white/50 focus:border-indigo-500 outline-none text-center text-3xl tracking-[1em] font-bold text-slate-900 placeholder:text-slate-400 shadow-sm transition-all"
            />
          </div>

          <button
            onClick={() => {
              if (otp === "1234") {
                setScreen("profile");
              } else {
                alert("Invalid OTP. Use 1234 for demo.");
              }
            }}
            disabled={otp.length !== 4}
            className="w-full py-4 px-6 text-white text-lg font-bold rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide ring-1 ring-white/20"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%, #EC4899 100%)' }}
          >
            Verify Code
          </button>

          <button onClick={() => setScreen("signup")} className="w-full mt-6 text-sm font-bold text-violet-800 hover:text-indigo-600 transition-colors">
            Resend Code
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  if (screen === "profile") {
    return (
      <OnboardingLayout showLogo={true}>
        <div className="w-full px-2">
          <h2 className="text-2xl font-bold text-indigo-950 mb-2">About You</h2>
          <p className="text-violet-900 mb-6 font-medium">Help us personalize your experience</p>

          <div className="space-y-4">
            <GlassInput label="Full Name" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="John Doe" />
            <GlassInput label="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="John" />

            <div className="grid grid-cols-2 gap-4">
              <div className="text-left">
                <label className="block text-sm font-semibold text-indigo-950 mb-2 ml-1">Age</label>
                <select value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-white/60 backdrop-blur-md border border-white/60 focus:border-indigo-500 outline-none text-slate-900 font-medium">
                  <option value="">Select</option>
                  {Array.from({ length: 45 }, (_, i) => i + 16).map((ageValue) => (
                    <option key={ageValue} value={ageValue}>{ageValue}</option>
                  ))}
                </select>
              </div>
              <div className="text-left">
                <label className="block text-sm font-semibold text-indigo-950 mb-2 ml-1">Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-white/60 backdrop-blur-md border border-white/60 focus:border-indigo-500 outline-none text-slate-900 font-medium">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem("speakmate_userName", userName);
                window.localStorage.setItem("speakmate_nickname", nickname);
              }
              setScreen("goals");
            }}
            disabled={!userName || !nickname || !age || !gender}
            className="w-full mt-8 py-4 px-6 text-white text-lg font-bold rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide ring-1 ring-white/20"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%, #EC4899 100%)' }}
          >
            Continue
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  if (screen === "goals") {
    const goals = [
      { id: "ieltsprep", icon: "📝", title: "IELTS Prep", desc: "Ace your exam" },
      { id: "professional", icon: "💼", title: "Professional", desc: "Business English" },
      { id: "general", icon: "🗣️", title: "General", desc: "Daily conversation" },
    ];

    return (
      <OnboardingLayout showLogo={true}>
        <div className="w-full px-0">
          <h2 className="text-3xl font-bold text-indigo-950 mb-6">Choose Goal</h2>

          <div className="space-y-3">
            {goals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className={`w-full p-4 rounded-2xl border transition-all transform active:scale-[0.98] flex items-center gap-4 text-left group backdrop-blur-md ${selectedGoal === goal.id
                  ? "border-indigo-500 bg-indigo-50/90 shadow-lg shadow-indigo-500/10"
                  : "border-white/40 bg-white/40 hover:bg-white/60 hover:border-indigo-300"
                  }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${selectedGoal === goal.id ? 'bg-indigo-100' : 'bg-white/80'}`}>
                  {goal.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{goal.title}</h3>
                  <p className="text-sm font-medium text-slate-600">{goal.desc}</p>
                </div>
                {selectedGoal === goal.id && (
                  <div className="ml-auto text-indigo-600">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (selectedGoal) {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("speakmate_goal", selectedGoal);
                }
                router.push(`/${selectedGoal}`);
              }
            }}
            disabled={!selectedGoal}
            className="w-full mt-8 py-4 px-6 text-white text-lg font-bold rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide ring-1 ring-white/20"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%, #EC4899 100%)' }}
          >
            Confirm
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  return null;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-indigo-600">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
