import { FileText, Coffee, MonitorPlay } from "lucide-react";

export function ActionGrid({ goal = "general" }: { goal?: "general" | "ielts" | "professional" }) {
    const isIelts = goal === "ielts";

    return (
        <div className="grid grid-cols-2 gap-3 w-full">
            {/* Dynamic First Card */}
            <button className="liquid-glass group rounded-[22px] p-5 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all h-40">
                <div className={`relative z-10 w-16 h-16 rounded-[20px] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300 ${isIelts ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-lime-400 to-green-600'}`}>
                    {/* Icon */}
                    {isIelts ? (
                        <FileText className="w-8 h-8 text-white drop-shadow-md" strokeWidth={2.5} />
                    ) : (
                        <Coffee className="w-8 h-8 text-white drop-shadow-md" strokeWidth={2.5} />
                    )}

                    {/* Gloss Overlay */}
                    <div className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-white/30 to-transparent opacity-50 pointer-events-none"></div>
                </div>
                <span className="relative z-10 font-bold text-slate-800 text-sm mt-1 group-hover:text-slate-900 transition-colors">
                    {isIelts ? 'Mock Test' : 'Roleplay'}
                </span>
            </button>

            {/* Videos Card (Always Second) */}
            <button className="liquid-glass group rounded-[22px] p-5 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all h-40">
                <div className="relative z-10 w-16 h-16 rounded-[20px] flex items-center justify-center shadow-lg bg-gradient-to-br from-rose-400 to-pink-600 transition-transform group-hover:scale-110 duration-300">
                    <MonitorPlay className="w-8 h-8 text-white drop-shadow-md" strokeWidth={2.5} />
                    {/* Gloss Overlay */}
                    <div className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-white/30 to-transparent opacity-50 pointer-events-none"></div>
                </div>
                <span className="relative z-10 font-bold text-slate-800 text-sm text-center leading-tight mt-1 group-hover:text-slate-900 transition-colors">Reference Videos</span>
            </button>
        </div>
    );
}
