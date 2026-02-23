"use client";

import { PerformanceDashboard } from "@/components/PerformanceDashboard";

export default function IELTSDashboard() {
  // Static data for demonstration
  const dashboardData = {
    overallScore: 7.5,
    totalTime: '12h 30m',
    sessionsCompleted: 24,
    streak: 5,
    scores: {
      fluency: 7.5,
      vocabulary: 7.0,
      grammar: 8.0,
      pronunciation: 7.5
    },
    recentSessions: [
      { date: '2025-12-02', duration: '25 min', score: 7.5 },
      { date: '2025-12-01', duration: '30 min', score: 7.0 },
      { date: '2025-11-30', duration: '20 min', score: 8.0 },
      { date: '2025-11-29', duration: '28 min', score: 7.5 },
      { date: '2025-11-28', duration: '15 min', score: 7.0 },
      { date: '2025-11-26', duration: '45 min', score: 8.0 },
    ]
  };

  return (
    <PerformanceDashboard
      title="IELTS Prep"
      data={dashboardData}
      goal="ieltsprep"
    />
  );
}
