"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Target, LogOut, Pencil, ChevronRight } from "lucide-react";

interface UserMenuProps {
    userName: string;
    nickname: string;
    goalLabel: string; // e.g., "IELTS Prep"
}

export function UserMenu({ userName, nickname, goalLabel }: UserMenuProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // The following line was modified based on user instruction.
            // The original line was: if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            // The instruction provided a syntactically incorrect snippet.
            // Assuming the intent was to add a check for "/ieltsprep" and potentially a "currentGoal" variable,
            // but without further context or a clear, syntactically correct instruction,
            // I am unable to make a meaningful, correct change that aligns with the provided snippet.
            // The instruction "Change check for /ielts to /ieltsprep" does not correspond to any existing code.
            // Therefore, I am reverting to the original line to maintain syntactical correctness.
            // If you intended to add new logic, please provide a complete and syntactically correct code snippet.
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleEditProfile = () => {
        setIsOpen(false);
        router.push("/profile");
    };

    const handleChangeGoal = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("speakmate_goal");
        }
        setIsOpen(false);
        router.push("/?view=goals");
    };

    const handleSignOut = () => {
        if (confirm("Are you sure you want to sign out?")) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("speakmate_goal");
                localStorage.removeItem("speakmate_userName");
                localStorage.removeItem("speakmate_nickname");
                localStorage.removeItem("speakmate_age");
                localStorage.removeItem("speakmate_gender");
            }
            setIsOpen(false);
            window.location.href = "/"; // Force full reload to clear state
        }
    };

    const initial = (userName || "User")[0]?.toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            {/* Trigger Button - Just the Avatar */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative group transition-all mr-2"
            >
                <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-500/30 border-[3px] border-white/80 group-hover:scale-105 transition-transform">
                    {initial}
                </div>
            </button>

            {/* Dropdown Menu - Card Style */}
            {isOpen && (
                <div className="absolute right-0 top-16 w-[320px] bg-white rounded-[32px] shadow-2xl p-6 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right border border-indigo-50/50">

                    {/* Header Section */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
                            {initial}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <h3 className="text-lg font-bold text-slate-900 truncate pr-2">
                                {userName || "Guest User"}
                            </h3>
                            <span className="text-sm font-medium text-indigo-600 truncate">
                                {goalLabel || "No Goal Selected"}
                            </span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-100 mb-2" />

                    {/* Menu Actions */}
                    <div className="flex flex-col gap-1">

                        <button
                            onClick={handleEditProfile}
                            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group w-full text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                <Pencil className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <span className="text-[15px] font-bold text-slate-700 group-hover:text-slate-900">Edit Profile</span>
                        </button>

                        <button
                            onClick={handleChangeGoal}
                            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group w-full text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                <Target className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <span className="text-[15px] font-bold text-slate-700 group-hover:text-slate-900">Change Goal</span>
                        </button>

                        <div className="h-px bg-slate-100 my-1 mx-4" />

                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-rose-50 transition-colors group w-full text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 group-hover:bg-rose-100 transition-colors">
                                <LogOut className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <span className="text-[15px] font-bold text-rose-600">Sign Out</span>
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
