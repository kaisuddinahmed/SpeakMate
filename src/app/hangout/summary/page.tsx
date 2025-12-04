"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SessionSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState({
    duration: "0m 0s",
    messageCount: 0,
    overallProficiency: 0,
    fluency: 0,
    vocabulary: 0,
    grammar: 0,
    pronunciation: 0
  });
  const [briefFeedback, setBriefFeedback] = useState<string>("");
  const [currentGoal, setCurrentGoal] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(true);

  useEffect(() => {
    const evaluateSession = async () => {
      try {
        // Get data from URL params
        const duration = searchParams.get("duration") || "0m 0s";
        const messageCount = parseInt(searchParams.get("messages") || "0");
        const goal = searchParams.get("goal");
        
        if (goal) {
          setCurrentGoal(goal);
        }

        // Get transcript from sessionStorage
        const transcriptStr = sessionStorage.getItem('hangoutTranscript');
        const conversationHistoryStr = sessionStorage.getItem('conversationHistory');
        
        // Check if we have cached evaluation results (from returning from detailed feedback)
        const cachedEvaluationStr = sessionStorage.getItem('cachedEvaluation');

        if (!transcriptStr || messageCount === 0) {
          // Check if we have cached results
          if (cachedEvaluationStr && messageCount > 0) {
            const cachedEvaluation = JSON.parse(cachedEvaluationStr);
            setSummary({
              duration,
              messageCount,
              ...cachedEvaluation.summary
            });
            setBriefFeedback(cachedEvaluation.briefFeedback || "");
            setIsEvaluating(false);
            return;
          }
          
          // No conversation data and no cache, use default scores
          setSummary({
            duration,
            messageCount,
            overallProficiency: 0,
            fluency: 0,
            vocabulary: 0,
            grammar: 0,
            pronunciation: 0
          });
          setIsEvaluating(false);
          return;
        }

        const transcript = JSON.parse(transcriptStr);
        const conversationHistory = JSON.parse(conversationHistoryStr || '[]');

        // Call OpenAI evaluation API
        const response = await fetch('/api/evaluate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, conversationHistory })
        });

        if (!response.ok) {
          throw new Error('Failed to evaluate session');
        }

        const data = await response.json();
        const evaluation = data.evaluation;

        setSummary({
          duration,
          messageCount,
          overallProficiency: evaluation.overallProficiency || 0,
          fluency: evaluation.fluency || 0,
          vocabulary: evaluation.vocabulary || 0,
          grammar: evaluation.grammar || 0,
          pronunciation: evaluation.pronunciation || 0
        });

        // Store feedback
        if (evaluation.briefFeedback) {
          setBriefFeedback(evaluation.briefFeedback);
        }

        // Store detailed feedback in sessionStorage for detailed feedback page
        if (evaluation.detailedFeedback) {
          sessionStorage.setItem('detailedFeedback', JSON.stringify(evaluation.detailedFeedback));
        }

        // Cache the complete evaluation for when user returns from detailed feedback
        sessionStorage.setItem('cachedEvaluation', JSON.stringify({
          summary: {
            overallProficiency: evaluation.overallProficiency || 0,
            fluency: evaluation.fluency || 0,
            vocabulary: evaluation.vocabulary || 0,
            grammar: evaluation.grammar || 0,
            pronunciation: evaluation.pronunciation || 0
          },
          briefFeedback: evaluation.briefFeedback || ""
        }));

        // Clear conversation data from sessionStorage
        sessionStorage.removeItem('hangoutTranscript');
        sessionStorage.removeItem('conversationHistory');
      } catch (error) {
        console.error('Error evaluating session:', error);
        // Use fallback scores on error
        const duration = searchParams.get("duration") || "0m 0s";
        const messageCount = parseInt(searchParams.get("messages") || "0");
        
        setSummary({
          duration,
          messageCount,
          overallProficiency: 5.0,
          fluency: 5.0,
          vocabulary: 5.0,
          grammar: 5.0,
          pronunciation: 5.0
        });
      } finally {
        setIsEvaluating(false);
      }
    };

    evaluateSession();
  }, [searchParams]);

  const goToDashboard = () => {
    // Clear all evaluation cache when going back to home
    sessionStorage.removeItem('cachedEvaluation');
    sessionStorage.removeItem('detailedFeedback');
    
    if (currentGoal) {
      router.push(`/?goal=${currentGoal}`);
    } else {
      router.push("/");
    }
  };

  const goToDetailedFeedback = () => {
    const params = new URLSearchParams();
    params.append("duration", summary.duration);
    params.append("messages", summary.messageCount.toString());
    if (currentGoal) params.append("goal", currentGoal);
    
    router.push(`/hangout/detailed-feedback?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={goToDashboard} className="text-gray-600 dark:text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Session Summary</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {isEvaluating ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">Evaluating your session...</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">This may take a moment</p>
            </div>
          ) : (
            <>
              {/* Celebration or Empty State */}
              {summary.messageCount > 0 ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Great Job!</h2>
                  <p className="text-gray-600 dark:text-gray-300">You've completed another conversation session</p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No Conversation Yet</h2>
                  <p className="text-gray-600 dark:text-gray-300">Start a conversation to get your performance evaluation</p>
                </div>
              )}

          {/* Session Stats */}
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-600 dark:to-gray-500 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Session Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Duration</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.duration}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Messages</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.messageCount}</p>
              </div>
            </div>
          </div>

          {/* Overall Proficiency */}
          {summary.messageCount > 0 && (
            <div className="bg-gradient-to-r from-green-100 to-blue-100 dark:from-gray-600 dark:to-gray-500 rounded-2xl p-6 shadow-lg border-2 border-green-200 dark:border-gray-500">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Session Score</p>
                <div className="relative inline-flex items-center justify-center">
                  <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500">
                    {summary.overallProficiency.toFixed(1)}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Unofficial score — for practice use only.</p>
              </div>
            </div>
          )}

          {/* Performance Breakdown */}
          {summary.messageCount > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Performance Breakdown</h3>
            
            <div className="space-y-4">
              {/* Fluency */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fluency</span>
                  <span className="text-sm font-bold text-blue-600">{summary.fluency.toFixed(1)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(summary.fluency / 9) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Vocabulary */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vocabulary</span>
                  <span className="text-sm font-bold text-purple-600">{summary.vocabulary.toFixed(1)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(summary.vocabulary / 9) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Grammar */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Grammar</span>
                  <span className="text-sm font-bold text-green-600">{summary.grammar.toFixed(1)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(summary.grammar / 9) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Pronunciation */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pronunciation</span>
                  <span className="text-sm font-bold text-orange-600">{summary.pronunciation.toFixed(1)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(summary.pronunciation / 9) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Brief Feedback */}
          {summary.messageCount > 0 && briefFeedback && (
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 border-2 border-yellow-200 dark:border-gray-500">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Feedback</h3>
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
                {briefFeedback}
              </p>
              <button
                onClick={goToDetailedFeedback}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Detail Feedback</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Call to Action for Empty Sessions */}
          {summary.messageCount === 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6">
              <div className="text-center">
                <p className="text-gray-700 dark:text-gray-200 font-medium mb-4">
                  Ready to talk again?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  Start a conversation with SpeakMate to build a habit of speaking. You'll get personalized feedback after each session!
                </p>
                <button
                  onClick={() => router.push('/hangout' + (currentGoal ? `?goal=${currentGoal}` : ''))}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-blue-600 transition-all shadow-md"
                >
                  Start a New Session
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pb-6">
            {summary.messageCount > 0 && (
              <button
                onClick={() => router.push('/hangout' + (currentGoal ? `?goal=${currentGoal}` : ''))}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-blue-600 transition-all shadow-md"
              >
                Practice Again
              </button>
            )}
            <button
              onClick={goToDashboard}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
            >
              Back to Home
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
