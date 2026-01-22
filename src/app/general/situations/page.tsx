"use client";

import { useRouter } from "next/navigation";

export default function GeneralSituationsPage() {
  const router = useRouter();

  const situations = [
    {
      title: "At a Restaurant",
      icon: "🍽️",
      description: "Order food, make requests, handle complaints",
      difficulty: "Beginner"
    },
    {
      title: "Shopping & Bargaining",
      icon: "🛍️",
      description: "Ask for items, negotiate prices, return products",
      difficulty: "Beginner"
    },
    {
      title: "Making Friends",
      icon: "🤗",
      description: "Start conversations, build relationships",
      difficulty: "Intermediate"
    },
    {
      title: "Traveling & Directions",
      icon: "🗺️",
      description: "Ask for directions, book hotels, navigate airports",
      difficulty: "Intermediate"
    },
    {
      title: "Doctor's Appointment",
      icon: "🏥",
      description: "Describe symptoms, understand medical advice",
      difficulty: "Intermediate"
    },
    {
      title: "Emergency Situations",
      icon: "🚨",
      description: "Report problems, ask for help urgently",
      difficulty: "Advanced"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/general')} className="text-gray-600 dark:text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Real Life Situations</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-6 pb-24">
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            Practice everyday conversations for real-world confidence
          </p>

          <div className="space-y-3">
            {situations.map((situation, idx) => (
              <button
                key={idx}
                className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-green-400 dark:hover:border-green-600 transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{situation.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1">{situation.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{situation.description}</p>
                    <span className={`text-xs px-2 py-1 rounded ${situation.difficulty === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                      situation.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                      {situation.difficulty}
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            Coming soon! 🚀
          </p>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
          <div className="px-4 py-3 flex justify-around">
            <button onClick={() => router.push('/general')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <span className="text-2xl mb-1">🏠</span>
              <span className="text-[11px] font-medium">Home</span>
            </button>
            <button onClick={() => router.push('/general/dashboard')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <span className="text-2xl mb-1">📊</span>
              <span className="text-[11px] font-medium">Dashboard</span>
            </button>
            <button onClick={() => router.push('/general')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <span className="text-2xl mb-1">⚙️</span>
              <span className="text-[11px] font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
