"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";

export default function ProfilePage() {
    const router = useRouter();

    // State
    const [userName, setUserName] = useState("");
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");

    const [mounted, setMounted] = useState(false);

    // Load Data
    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            setUserName(window.localStorage.getItem("speakmate_userName") || "");
            setNickname(window.localStorage.getItem("speakmate_nickname") || "");
            setEmail(window.localStorage.getItem("speakmate_email") || "");
            setMobile(window.localStorage.getItem("speakmate_mobile") || "");
            setAge(window.localStorage.getItem("speakmate_age") || "");
            setGender(window.localStorage.getItem("speakmate_gender") || "");
        }
    }, []);

    // Save Data
    const handleSave = () => {
        const ageNum = parseInt(age);
        if (age && (ageNum < 16 || ageNum > 60)) {
            alert("Age must be between 16 and 60 years.");
            return;
        }

        if (typeof window !== "undefined") {
            window.localStorage.setItem("speakmate_userName", userName);
            window.localStorage.setItem("speakmate_nickname", nickname);
            window.localStorage.setItem("speakmate_email", email);
            window.localStorage.setItem("speakmate_mobile", mobile);
            window.localStorage.setItem("speakmate_age", age);
            window.localStorage.setItem("speakmate_gender", gender);
        }

        // Simulate API delay for feel
        setTimeout(() => {
            alert("Profile updated successfully!");
            router.back();
        }, 500);
    };

    if (!mounted) return null;

    const initial = (userName || "U")[0]?.toUpperCase();

    return (
        <div className="min-h-screen bg-white font-sans flex justify-center">
            {/* Mobile Canvas */}
            <div className="w-full max-w-[430px] min-h-screen relative shadow-2xl overflow-hidden flex flex-col">

                {/* 1. Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/assets/Home%20Background.svg"
                        alt="Background"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Header - Glass */}
                <div className="relative z-20 flex items-center p-4 sticky top-0">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors text-slate-900"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="flex-1 text-center text-lg font-bold text-slate-900 mr-8">Edit Profile</h1>
                </div>

                {/* Content - Glass Card */}
                <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-24 pt-2">

                    {/* Glass Container */}
                    <div className="liquid-glass rounded-[32px] p-6 pb-8">

                        {/* Avatar Section */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group cursor-pointer">
                                <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-violet-500/30 border-2 border-white/20">
                                    {initial}
                                </div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md border border-white/50 text-indigo-600">
                                    <Camera className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="mt-4 text-sm font-medium text-slate-700">Update your personal details</p>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-5">
                            <InputField label="Full Name" value={userName} onChange={setUserName} placeholder="e.g. Kais Uddin Ahmed" />
                            <InputField label="What shall I call you?" value={nickname} onChange={setNickname} placeholder="e.g. Kais" />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 mb-2 ml-1">Age</label>
                                    <select
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        className="w-full px-5 py-4 rounded-2xl border border-white/40 bg-white/50 backdrop-blur-md text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white/80 transition-all appearance-none shadow-sm"
                                    >
                                        <option value="">Select</option>
                                        {Array.from({ length: 45 }, (_, i) => i + 16).map((ageValue) => (
                                            <option key={ageValue} value={ageValue}>{ageValue}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-800 mb-2 ml-1">Gender</label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full px-5 py-4 rounded-2xl border border-white/40 bg-white/50 backdrop-blur-md text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white/80 transition-all appearance-none shadow-sm"
                                    >
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <InputField label="Email Address" value={email} onChange={setEmail} placeholder="name@example.com" type="email" />
                            <InputField label="Mobile Number" value={mobile} onChange={setMobile} placeholder="+88 01XXX XXXXXX" type="tel" />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSave}
                            disabled={!userName || !nickname}
                            className="w-full mt-10 py-4 px-6 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[17px] font-bold rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-500/30"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: any) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-800 mb-2 ml-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e: any) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-5 py-4 rounded-2xl border border-white/40 bg-white/50 backdrop-blur-md text-slate-900 font-semibold placeholder:text-slate-500/70 focus:outline-none focus:border-indigo-500 focus:bg-white/80 transition-all shadow-sm"
            />
        </div>
    );
}
