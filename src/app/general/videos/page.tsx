"use client";

import { useRouter } from "next/navigation";

export default function GeneralVideosPage() {
  const router = useRouter();

  const videos = [
    { title: "Daily English Conversations", duration: "10:15", category: "Basics" },
    { title: "Small Talk & Casual Chat", duration: "12:40", category: "Social" },
    { title: "Understanding Slang & Idioms", duration: "15:20", category: "Vocabulary" },
    { title: "Travel English Essentials", duration: "14:30", category: "Travel" },
    { title: "Making Complaints Politely", duration: "9:50", category: "Communication" },
    { title: "English Humor & Jokes", duration: "11:25", category: "Culture" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/?goal=general')} className="text-gray-600 dark:text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Conversation Videos</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-6 pb-24 space-y-4">
          {videos.map((video, idx) => (
            <button
              key={idx}
              className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-1">{video.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{video.duration}</span>
                    <span>•</span>
                    <span className="text-green-600 dark:text-green-400">{video.category}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            Coming soon! 🎬
          </p>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
          <div className="px-4 py-3 flex justify-around">
            <button onClick={() => router.push('/?goal=general')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <span className="text-2xl mb-1">🏠</span>
              <span className="text-[11px] font-medium">Home</span>
            </button>
            <button onClick={() => router.push('/general/dashboard')} className="flex-1 flex flex-col items-center py-2 transition-colors text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
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
