"use client";

import { PerformanceDashboard } from "@/components/PerformanceDashboard";

export default function GeneralDashboard() {
  const dashboardData = {
    overallScore: 7.2,
    totalTime: '10h 15m',
    sessionsCompleted: 19,
    streak: 3,
    scores: {
      fluency: 7.0,
      vocabulary: 7.5,
      grammar: 7.0,
      pronunciation: 7.5
    },
    recentSessions: [
      { date: '2025-12-02', duration: '18 min', score: 7.5 },
      { date: '2025-12-01', duration: '22 min', score: 7.0 },
      { date: '2025-11-30', duration: '20 min', score: 7.0 },
      { date: '2025-11-29', duration: '25 min', score: 7.5 },
    ]
  };

  return (
    <PerformanceDashboard
      title="General"
      data={dashboardData}
      goal="general"
    />
  );
}
