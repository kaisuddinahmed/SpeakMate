"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Flame, Clock, BarChart2 } from "lucide-react";
import { DashboardLayout } from "./DashboardLayout";

interface DashboardData {
    overallScore: number;
    totalTime: string;
    sessionsCompleted: number;
    streak: number;
    scores: {
        fluency: number;
        vocabulary: number;
        grammar: number;
        pronunciation: number;
    };
    recentSessions: {
        date: string;
        duration: string;
        score: number;
    }[];
}

interface PerformanceDashboardProps {
    title: string;
    data: DashboardData;
    goal: string;
}

export function PerformanceDashboard({ title, data, goal }: PerformanceDashboardProps) {
    const router = useRouter();

    const getScoreColor = (score: number) => {
        if (score >= 8.0) return 'text-emerald-500';
        if (score >= 7.0) return 'text-blue-500';
        if (score >= 6.0) return 'text-yellow-500';
        return 'text-orange-500';
    };

    const getScoreStrokeColor = (score: number) => {
        if (score >= 8.0) return '#10b981'; // emerald-500
        if (score >= 7.0) return '#3b82f6'; // blue-500
        if (score >= 6.0) return '#eab308'; // yellow-500
        return '#f97316'; // orange-500
    };

    return (
        <DashboardLayout showLogo={false}>
            <div className="flex flex-col h-full gap-5 mx-auto w-full max-w-md pb-2">

                {/* Header */}
                <div className="relative flex items-center justify-center pt-2 mb-2 min-h-[44px]">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-0 p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors text-slate-800 z-10"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Performance Dashboard</h1>
                        <p className="text-sm font-medium text-slate-600">({title})</p>
                    </div>
                </div>

                {/* Main Content Area - Scrollable if needed, or static if we want to fit everything */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                    {/* Performance Summary Card */}
                    <div className="liquid-glass p-5 rounded-[24px] flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-800">Performance Summary</h2>
                        </div>

                        {/* Top Stats Row */}
                        <div className="flex items-center justify-between px-2">
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-2xl font-black ${getScoreColor(data.overallScore)}`}>
                                    {data.overallScore}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Avg. Score</span>
                            </div>
                            <div className="w-[1px] h-8 bg-slate-200" />
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-2xl font-black text-indigo-500">
                                    {data.totalTime}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Practice</span>
                            </div>
                            <div className="w-[1px] h-8 bg-slate-200" />
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-2xl font-black text-slate-700">
                                    {data.sessionsCompleted}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sessions</span>
                            </div>
                            <div className="w-[1px] h-8 bg-slate-200" />
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-2xl font-black text-orange-500 flex items-center gap-0.5">
                                    {data.streak} <Flame className="w-4 h-4 fill-orange-500" />
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Streak</span>
                            </div>
                        </div>

                        {/* 4 Gauges Grid */}
                        <div className="grid grid-cols-4 gap-2 mt-1">
                            {Object.entries(data.scores).map(([key, score]) => (
                                <div key={key} className="flex flex-col items-center gap-2">
                                    <div className="relative w-14 h-14">
                                        <svg className="w-full h-full -rotate-90">
                                            {/* Track */}
                                            <circle
                                                cx="28" cy="28" r="24"
                                                fill="none"
                                                stroke="rgba(0,0,0,0.06)"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                            />
                                            {/* Progress */}
                                            <circle
                                                cx="28" cy="28" r="24"
                                                fill="none"
                                                stroke={getScoreStrokeColor(score)}
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                strokeDasharray={150.8} // 2 * pi * 24
                                                strokeDashoffset={150.8 - (150.8 * (score / 9))}
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-600 capitalize truncate w-full text-center">
                                        {key}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Sessions List - Compact */}
                    <div className="flex-1 liquid-glass p-5 rounded-[24px] flex flex-col gap-3 min-h-0">
                        <h2 className="text-base font-bold text-slate-800">Recent Sessions</h2>
                        <div className="overflow-y-auto -mr-2 pr-2 space-y-2 scrollbar-hide">
                            {data.recentSessions.map((session, index) => (
                                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/40">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-800">
                                            {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {session.duration}
                                        </span>
                                    </div>
                                    <span className={`text-lg font-bold ${getScoreColor(session.score)}`}>
                                        {session.score}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
