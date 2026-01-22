import { useRouter } from "next/navigation";

export function HeroCard({
    onStart
}: {
    onStart?: () => void
}) {
    const router = useRouter();

    const handleStart = () => {
        if (onStart) {
            onStart();
        } else {
            router.push('/hangout?goal=general');
        }
    };

    return (
        <div className="w-full relative h-[310px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col justify-end pb-5">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/assets/Hero%20Card.svg"
                    alt="Hero Background"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Holographic Shimmer Overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-overlay">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full animate-shimmer skew-x-12"></div>
            </div>

            {/* Juicy Button */}
            <button
                onClick={handleStart}
                className="relative z-10 w-[50%] mx-auto py-3 rounded-xl font-bold text-slate-800 shadow-[0_4px_14px_0_rgba(0,0,0,0.2)] active:scale-95 transition-transform overflow-hidden group text-sm shrink-0 animate-float">
                {/* Button Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-lime-300 to-green-400 group-hover:from-lime-200 group-hover:to-green-300 transition-colors"></div>

                {/* Inner Glow */}
                <div className="absolute inset-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] pointer-events-none"></div>

                <span className="relative z-10 flex items-center justify-center gap-2">
                    Start Talking
                </span>
            </button>
        </div>
    );
}
