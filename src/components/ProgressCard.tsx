import { ArrowUpRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function ProgressCard({
    score = 7.5,
    trend = "7.1",
    label = "Overall score"
}: {
    score?: number;
    trend?: string;
    label?: string;
}) {
    const router = useRouter(); // Import this
    const pathname = usePathname(); // Import this

    const handleViewDetails = () => {
        let currentGoal = "general";
        if (pathname?.includes("/ielts")) currentGoal = "ielts";
        if (pathname?.includes("/professional")) currentGoal = "professional";
        router.push(`/${currentGoal}/dashboard`);
    };

    return (
        <div className="liquid-glass w-full rounded-[28px] p-6 flex flex-col justify-between min-h-[160px]">
            {/* Top Row: Title */}
            <h3 className="relative z-10 text-base font-bold text-slate-800">Progress Summary</h3>

            {/* Middle Row: Stats */}
            <div className="flex items-center gap-5 mt-3">
                {/* Radiant Ring Gauge */}
                <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full rotate-[-90deg] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">
                        {/* Track */}
                        <circle
                            cx="40" cy="40" r="34"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="6"
                            strokeLinecap="round"
                        />
                        {/* Progress */}
                        <circle
                            cx="40" cy="40" r="34"
                            fill="none"
                            stroke="url(#radiantGradient)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray="213.6" // 2 * pi * 34
                            strokeDashoffset={213.6 - (213.6 * (score || 0) / 9)}
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Gradient Definition */}
                        <defs>
                            <linearGradient id="radiantGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan-400 */}
                                <stop offset="100%" stopColor="#3b82f6" /> {/* Blue-500 */}
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Orbiting Light Flare */}
                    <div
                        className="absolute inset-0 z-10 animate-spin"
                        style={{ animationDuration: '3s' }}
                    >
                        <div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full blur-[2px] shadow-[0_0_10px_rgba(255,255,255,0.8),0_0_20px_rgba(34,211,238,0.6)]"></div>
                    </div>

                    {/* Score Text */}
                    <div className="absolute inset-0 flex items-center justify-center pt-1 z-10">
                        <span className="text-2xl font-black text-slate-800 tracking-tighter">{score}</span>
                    </div>
                </div>

                {/* Text Info */}
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <p className="text-base font-bold text-slate-700">Overall Fluency</p>
                        <span className="text-emerald-500 text-xs font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full">↑</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-600">Good Progress</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Your fluency is improving. <br />Keep practicing!</p>
                </div>
            </div>

            {/* Bottom Row: Details Link */}
            <div className="self-end">
                <button
                    onClick={handleViewDetails}
                    className="text-xs font-bold text-indigo-500 cursor-pointer hover:underline hover:text-indigo-600 transition-colors"
                >
                    View Details
                </button>
            </div>
        </div>
    );
}
