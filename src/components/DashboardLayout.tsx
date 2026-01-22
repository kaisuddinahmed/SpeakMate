import { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";

interface DashboardLayoutProps {
    children: ReactNode;
    showLogo?: boolean;
    headerRight?: ReactNode;
}

export function DashboardLayout({ children, showLogo = true, headerRight }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-white flex justify-center font-sans overflow-x-hidden">
            {/* Mobile Canvas Container - Max Width ensured */}
            <div className="w-full max-w-[430px] h-[100dvh] relative overflow-hidden shadow-2xl bg-white flex flex-col">
                {/* 1. Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/assets/Home%20Background.svg"
                        alt="Home Background"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* 2. Vivid Backlight Blobs (Removed for clean look as requested) */}

                {showLogo && (
                    <div className="relative z-20 pt-8 px-6 pb-2 flex justify-between items-center bg-transparent">
                        <div className="drop-shadow-sm origin-left transform scale-[2.34]">
                            <Logo className="h-14" />
                        </div>
                        {/* Header Right Action (User Menu) */}
                        <div>
                            {headerRight}
                        </div>
                    </div>
                )}

                {/* 4. Content Area - Non-Scrollable */}
                <div className="relative z-10 flex-1 overflow-hidden px-3 pb-24 pt-2 flex flex-col justify-start">
                    {children}
                </div>

                {/* 5. Bottom Navigation */}
                <BottomNav />

            </div>
        </div>
    );
}
