"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function SummaryContent() {
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
        const response = await fetch('/api/evaluation/session', {
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

        // Store detailed feedback (whatYouDidWell, whatToImproveNext, recommendedPractice) for detailed feedback page
        if (evaluation.detailedFeedback) {
          sessionStorage.setItem('detailedFeedback', JSON.stringify(evaluation.detailedFeedback));
        }

        // Store corrections for transcript page (with Major/Minor classification)
        if (evaluation.corrections) {
          sessionStorage.setItem('corrections', JSON.stringify(evaluation.corrections));
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

        // Do NOT clear conversation data yet - we need it for the detailed transcript view
        // sessionStorage.removeItem('hangoutTranscript');
        // sessionStorage.removeItem('conversationHistory');
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
    // Clear evaluation cache when going back to home
    // NOTE: Keep hangoutTranscript and corrections for transcript page
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
    <div className="min-h-screen bg-white flex justify-center font-sans overflow-x-hidden">
      <div className="w-full max-w-[430px] h-[100dvh] relative overflow-hidden shadow-2xl bg-white flex flex-col">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/Home%20Background.svg"
            alt="Home Background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Header - Transparent Glass */}
        <div className="relative z-20 flex items-center justify-between px-6 py-6 pt-12">
          <button
            onClick={goToDashboard}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-gray-700 shadow-sm hover:scale-105 transition-transform"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800 drop-shadow-sm">Session Summary</h1>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-8 space-y-6 scrollbar-hide">
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
                  <p className="text-gray-600 dark:text-gray-300">You&apos;ve completed another conversation session</p>
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

              {/* Session Stats - Liquid Glass */}
              <div className="liquid-glass rounded-3xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</div>
                    <div className="text-lg font-bold text-gray-800">{summary.duration}</div>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-300/50"></div>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Messages</div>
                    <div className="text-lg font-bold text-gray-800 text-right">{summary.messageCount}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Overall Score + Performance Grid */}
              {summary.messageCount > 0 && (
                <div className="liquid-glass rounded-3xl p-6 shadow-xl border border-white/60">
                  {/* Overall Score */}
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Session Score</p>
                    <div className="relative inline-flex items-center justify-center">
                      <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500">
                        {summary.overallProficiency.toFixed(1)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center leading-relaxed">
                      This score is an unofficial estimate<br />
                      for exam preparation only.
                    </p>
                  </div>

                  {/* 2x2 Score Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    {/* Fluency */}
                    <div className="bg-white/40 backdrop-blur-md rounded-2xl p-4 text-center border border-white/50 shadow-sm">
                      <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto mb-2">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200 dark:text-gray-600" />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - summary.fluency / 9)}`}
                            className="text-blue-500 transition-all duration-500"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-lg font-bold text-gray-800 dark:text-white">{summary.fluency.toFixed(1)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fluency</p>
                    </div>

                    {/* Vocabulary */}
                    <div className="bg-white/40 backdrop-blur-md rounded-2xl p-4 text-center border border-white/50 shadow-sm">
                      <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto mb-2">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200 dark:text-gray-600" />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - summary.vocabulary / 9)}`}
                            className="text-purple-500 transition-all duration-500"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-lg font-bold text-gray-800 dark:text-white">{summary.vocabulary.toFixed(1)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Vocabulary</p>
                    </div>

                    {/* Grammar */}
                    <div className="bg-white/40 backdrop-blur-md rounded-2xl p-4 text-center border border-white/50 shadow-sm">
                      <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto mb-2">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200 dark:text-gray-600" />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - summary.grammar / 9)}`}
                            className="text-green-500 transition-all duration-500"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-lg font-bold text-gray-800 dark:text-white">{summary.grammar.toFixed(1)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Grammar</p>
                    </div>

                    {/* Pronunciation */}
                    <div className="bg-white/40 backdrop-blur-md rounded-2xl p-4 text-center border border-white/50 shadow-sm">
                      <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto mb-2">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200 dark:text-gray-600" />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - summary.pronunciation / 9)}`}
                            className="text-orange-500 transition-all duration-500"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-lg font-bold text-gray-800 dark:text-white">{summary.pronunciation.toFixed(1)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pronunciation</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback with Detail Button */}
              {summary.messageCount > 0 && briefFeedback && (
                <div className="liquid-glass rounded-3xl p-6 border border-white/60">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-gray-800">Quick Feedback</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-5">
                    {briefFeedback}
                  </p>
                  <button
                    onClick={goToDetailedFeedback}
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>View Detailed Feedback</span>
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
                      Start a conversation with SpeakMate to build a habit of speaking. You&apos;ll get personalized feedback after each session!
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

export default function SessionSummaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-gray-600 dark:text-gray-300">Loading...</div>
    </div>}>
      <SummaryContent />
    </Suspense>
  );
}
