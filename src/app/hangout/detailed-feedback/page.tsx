"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface DetailedFeedback {
  whatYouDidWell: string[];
  whatToImproveNext: string[];
  recommendedPractice: string;
}

export default function DetailedFeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState<DetailedFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGoal, setCurrentGoal] = useState<string | null>(null);

  useEffect(() => {
    const goal = searchParams.get("goal");
    if (goal) {
      setCurrentGoal(goal);
    }

    // Get detailed feedback from sessionStorage
    const feedbackStr = sessionStorage.getItem('detailedFeedback');
    if (feedbackStr) {
      setFeedback(JSON.parse(feedbackStr));
    }
    setIsLoading(false);
  }, [searchParams]);

  const goBack = () => {
    // Get return parameters from URL
    const duration = searchParams.get("duration");
    const messages = searchParams.get("messages");
    const goal = searchParams.get("goal");
    
    const params = new URLSearchParams();
    if (duration) params.append("duration", duration);
    if (messages) params.append("messages", messages);
    if (goal) params.append("goal", goal);
    
    router.push(`/hangout/summary?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">No feedback available</p>
          <button
            onClick={goBack}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={goBack} className="text-gray-600 dark:text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Detailed Feedback</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* What You Did Well */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 border-2 border-green-200 dark:border-gray-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">What You Did Well</h2>
            </div>
            <ul className="space-y-3">
              {feedback.whatYouDidWell.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-green-500 text-lg mt-0.5">•</span>
                  <span className="text-gray-700 dark:text-gray-200 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What to Improve Next */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 border-2 border-blue-200 dark:border-gray-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">What to Improve Next</h2>
            </div>
            <ul className="space-y-3">
              {feedback.whatToImproveNext.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-blue-500 text-lg mt-0.5">•</span>
                  <span className="text-gray-700 dark:text-gray-200 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Practice */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 border-2 border-purple-200 dark:border-gray-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Recommended Practice</h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-purple-200 dark:border-gray-600">
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                {feedback.recommendedPractice}
              </p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-6">
          <button
            onClick={goBack}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
