"use client";

import { PerformanceDashboard } from "@/components/PerformanceDashboard";

export default function ProfessionalDashboard() {
  const dashboardData = {
    overallScore: 8.0,
    totalTime: '15h 45m',
    sessionsCompleted: 12,
    streak: 5,
    scores: {
      fluency: 7.5,
      vocabulary: 8.5,
      grammar: 8.0,
      pronunciation: 7.5
    },
    recentSessions: [
      { date: '2025-12-03', duration: '30 min', score: 8.5 },
      { date: '2025-12-01', duration: '45 min', score: 8.0 },
      { date: '2025-11-28', duration: '20 min', score: 7.5 },
      { date: '2025-11-25', duration: '35 min', score: 8.0 },
    ]
  };

  return (
    <PerformanceDashboard
      title="Professional"
      data={dashboardData}
      goal="professional"
    />
  );
}
