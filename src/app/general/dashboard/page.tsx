'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GeneralDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState({
    overallScore: 7.0,
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
      { date: '2025-12-02', duration: '18 min', score: 7.5, topic: 'Daily Routine' },
      { date: '2025-12-01', duration: '22 min', score: 7.0, topic: 'Hobbies' },
      { date: '2025-11-30', duration: '20 min', score: 7.0, topic: 'Travel' },
      { date: '2025-11-29', duration: '25 min', score: 7.5, topic: 'Food & Cooking' },
    ],
    topicsPracticed: [
      { name: 'Daily Life', count: 7, icon: '🏠' },
      { name: 'Travel', count: 5, icon: '✈️' },
      { name: 'Food', count: 4, icon: '🍕' },
      { name: 'Hobbies', count: 3, icon: '🎨' },
    ]
  });

  const getScoreColor = (score: number) => {
    if (score >= 8.0) return 'text-green-600';
    if (score >= 7.0) return 'text-blue-600';
    if (score >= 6.0) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 8.0) return 'bg-green-500';
    if (score >= 7.0) return 'bg-blue-500';
    if (score >= 6.0) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 min-h-screen flex flex-col relative">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => router.push('/?goal=general')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">Performance Dashboard</h1>
          <div className="w-6"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 space-y-6">
        {/* Overall Performance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Overall Performance</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Score</p>
              <p className={`text-4xl font-bold ${getScoreColor(dashboardData.overallScore)}`}>
                {dashboardData.overallScore}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fluency Level</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Practice Time</p>
              <p className="text-4xl font-bold text-blue-600">{dashboardData.totalTime}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Casual conversations</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{dashboardData.sessionsCompleted}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Sessions Completed</p>
            </div>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{dashboardData.streak} 🔥</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Day Streak</p>
            </div>
          </div>
        </div>

        {/* Criteria Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Criteria Breakdown</h2>
          
          <div className="space-y-4">
            {Object.entries(dashboardData.scores).map(([key, score]) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {key}
                  </span>
                  <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                    {score}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${getScoreBarColor(score)}`}
                    style={{ width: `${(score / 9) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topics Practiced */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Favorite Topics</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {dashboardData.topicsPracticed.map((topic, index) => (
              <div key={index} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700 rounded-xl text-center">
                <div className="text-3xl mb-2">{topic.icon}</div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{topic.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{topic.count} sessions</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Recommendations</h2>
          
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Explore New Topics</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Try discussing current events, technology, or health topics to expand your range.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Practice More Regularly</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Increase your streak to 7 days for better retention and faster improvement.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
              <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Great Vocabulary!</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Your vocabulary usage is strong. Keep learning new expressions and idioms.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Recent Sessions</h2>
          
          <div className="space-y-3">
            {dashboardData.recentSessions.map((session, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {session.topic}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {session.duration}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getScoreColor(session.score)}`}>
                    {session.score}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
        <div className="px-4 py-3 flex justify-around">
          <button onClick={() => router.push('/?goal=general')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
            <span className="text-2xl mb-1">🏠</span>
            <span className="text-[11px] font-medium">Home</span>
          </button>
          <button className="flex-1 flex flex-col items-center py-2 transition-colors text-indigo-600">
            <span className="text-2xl mb-1">📊</span>
            <span className="text-[11px] font-medium">Dashboard</span>
          </button>
          <button onClick={() => router.push('/?goal=general')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
            <span className="text-2xl mb-1">⚙️</span>
            <span className="text-[11px] font-medium">Settings</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
