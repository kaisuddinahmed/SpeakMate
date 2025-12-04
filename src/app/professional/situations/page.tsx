"use client";

import { useRouter } from "next/navigation";

export default function ProfessionalSituationsPage() {
  const router = useRouter();

  const situations = [
    { 
      title: "Job Interview", 
      icon: "💼",
      description: "Practice common interview questions and techniques",
      difficulty: "Intermediate"
    },
    { 
      title: "Business Meeting", 
      icon: "🤝",
      description: "Lead discussions, present ideas, and negotiate",
      difficulty: "Advanced"
    },
    { 
      title: "Client Presentation", 
      icon: "📊",
      description: "Present projects and pitch to stakeholders",
      difficulty: "Advanced"
    },
    { 
      title: "Team Collaboration", 
      icon: "👥",
      description: "Work effectively with colleagues",
      difficulty: "Intermediate"
    },
    { 
      title: "Email & Communication", 
      icon: "✉️",
      description: "Write professional emails and messages",
      difficulty: "Beginner"
    },
    { 
      title: "Phone Calls", 
      icon: "📞",
      description: "Handle professional phone conversations",
      difficulty: "Intermediate"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/?goal=professional')} className="text-gray-600 dark:text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Professional Situations</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-6 pb-24">
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            Practice real workplace scenarios to build professional confidence
          </p>

          <div className="space-y-3">
            {situations.map((situation, idx) => (
              <button
                key={idx}
                className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{situation.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1">{situation.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{situation.description}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      situation.difficulty === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
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
            <button onClick={() => router.push('/?goal=professional')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <span className="text-2xl mb-1">🏠</span>
              <span className="text-[11px] font-medium">Home</span>
            </button>
            <button onClick={() => router.push('/professional/dashboard')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <span className="text-2xl mb-1">📊</span>
              <span className="text-[11px] font-medium">Dashboard</span>
            </button>
            <button onClick={() => router.push('/?goal=professional')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <span className="text-2xl mb-1">⚙️</span>
              <span className="text-[11px] font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
