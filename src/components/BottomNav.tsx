"use client";
import { usePathname, useRouter } from "next/navigation";

export function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();

    // Determine context (ielts, professional, or general)
    let currentGoal = "general";
    if (pathname?.includes("/ielts")) currentGoal = "ielts";
    if (pathname?.includes("/professional")) currentGoal = "professional";

    // Active State Logic
    const isHome = pathname === `/${currentGoal}`;
    const isDashboard = pathname === `/${currentGoal}/dashboard`;
    const isSettings = pathname === "/settings";

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 flex justify-center pointer-events-none">
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[380px] bg-white/60 backdrop-blur-2xl border border-white/40 rounded-[24px] p-2 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex justify-between z-50 ring-1 ring-white/50 items-center pointer-events-auto">

                {/* Home */}
                <button
                    onClick={() => router.push(`/${currentGoal}`)}
                    className={`flex flex-col items-center gap-1 transition-colors ${isHome ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <svg className="w-6 h-6" fill={isHome ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-[10px] font-bold">Home</span>
                </button>

                {/* Dashboard (Stats) */}
                <button
                    onClick={() => router.push(`/${currentGoal}/dashboard`)}
                    className={`flex flex-col items-center gap-1 transition-colors ${isDashboard ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <svg className="w-6 h-6" fill={isDashboard ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-[10px] font-bold">Dashboard</span>
                </button>

                {/* Settings */}
                <button
                    onClick={() => router.push('/settings')}
                    className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/settings' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] font-bold">Settings</span>
                </button>

            </div>
        </div>
    );
}
