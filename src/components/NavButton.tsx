import React from "react";

export interface NavButtonProps {
    icon: string;
    label: string;
    active?: boolean;
    onClick?: () => void;
    style?: React.CSSProperties;
    className?: string;
}

export function NavButton({ icon, label, active = false, onClick, style, className }: NavButtonProps) {
    return (
        <button
            onClick={onClick}
            style={style}
            className={`flex-1 flex flex-col items-center py-2 transition-colors active:scale-95 ${active
                ? "text-indigo-600"
                : "text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                } ${className || ""}`}
        >
            <span className="text-2xl mb-1">{icon}</span>
            <span className="text-[11px] font-medium">{label}</span>
        </button>
    );
}
