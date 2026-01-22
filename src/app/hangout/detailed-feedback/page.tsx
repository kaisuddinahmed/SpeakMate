"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface DetailedFeedback {
  whatYouDidWell: {
    fluency: string | null;
    vocabulary: string | null;
    grammar: string | null;
    pronunciation: string | null;
  };
  whatToImproveNext: {
    fluency: string | null;
    vocabulary: string | null;
    grammar: string | null;
    pronunciation: string | null;
  };
  recommendedPractice: string;
  errorPatterns?: string[];
}

function DetailedFeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goal = searchParams.get("goal") || "ielts";

  const [feedback, setFeedback] = useState<DetailedFeedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedFeedback = sessionStorage.getItem("detailedFeedback");
    if (storedFeedback) {
      try {
        const parsed = JSON.parse(storedFeedback);
        setFeedback(parsed);
      } catch (e) {
        console.error("Failed to parse detailed feedback:", e);
      }
    }
    setLoading(false);
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleTranscript = () => {
    router.push(`/hangout/transcript?goal=${goal}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const defaultFeedback: DetailedFeedback = {
    whatYouDidWell: {
      fluency: "Your speech flowed naturally with minimal hesitation between ideas.",
      vocabulary: "Good use of topic-specific words to describe your routine.",
      grammar: null,
      pronunciation: "Words were clearly articulated and easy to understand."
    },
    whatToImproveNext: {
      fluency: "Work on extending your responses with more supporting details.",
      vocabulary: "Try using more varied connectors like 'moreover' or 'however'.",
      grammar: "Pay attention to verb tenses in complex sentences.",
      pronunciation: null
    },
    recommendedPractice: "Practice the PEEL method: Point, Explain, Example, Link. This will help you structure longer, more coherent responses."
  };

  const displayFeedback = feedback || defaultFeedback;

  // Helper to render a criterion point
  const renderFeedbackPoint = (criterion: string, text: string | null, color: string) => {
    if (!text) return null;
    const criterionLabel = criterion.charAt(0).toUpperCase() + criterion.slice(1);

    return (
      <li key={criterion} className="flex items-start gap-2">
        <span className={`w-2 h-2 mt-2 rounded-full ${color.replace('text-', 'bg-').replace('600', '500')} shrink-0`}></span>
        <span className="text-sm leading-relaxed">
          <span className={`font-semibold ${color}`}>{criterionLabel}:</span>{" "}
          <span className="text-gray-700">{text}</span>
        </span>
      </li>
    );
  };

  const getPoints = (data: Record<string, string | null>, color: string) => {
    return Object.entries(data).map(([key, value]) => renderFeedbackPoint(key, value, color)).filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Container */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header - Centered */}
        <header className="flex items-center justify-center px-4 py-4 relative">
          <button
            onClick={handleBack}
            className="absolute left-4 text-gray-600 hover:text-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Detailed Feedback</h1>
        </header>

        {/* Separator after header */}
        <div className="h-px bg-gray-200 mx-4"></div>

        {/* Content */}
        <main className="flex-1 px-4 py-5 space-y-4 overflow-auto pb-28">
          {/* See Full Transcript Button - Blue to Purple Gradient */}
          <button
            onClick={handleTranscript}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-5 rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            See Full Transcript with Corrections
          </button>

          {/* What You Did Well - Green fill with green border */}
          <section className="bg-green-50 rounded-2xl p-5 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-800">What You Did Well</h2>
            </div>
            <ul className="space-y-3">
              {getPoints(displayFeedback.whatYouDidWell, "text-green-600")}
            </ul>
          </section>

          {/* What to Improve Next - Blue fill with blue border */}
          <section className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-800">What to Improve Next</h2>
            </div>
            <ul className="space-y-3">
              {getPoints(displayFeedback.whatToImproveNext, "text-blue-600")}
            </ul>
          </section>

          {/* Frequent Error Patterns - Red/Orange */}
          {displayFeedback.errorPatterns && displayFeedback.errorPatterns.length > 0 && (
            <section className="bg-red-50 rounded-2xl p-5 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-800">Recurring Errors</h2>
              </div>
              <ul className="space-y-3">
                {displayFeedback.errorPatterns.map((pattern, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-2 h-2 mt-2 rounded-full bg-red-500 shrink-0"></span>
                    <span className="text-sm leading-relaxed text-red-700 font-medium">
                      {pattern}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recommended Practice - Purple fill with purple border, deep purple icon */}
          <section className="bg-purple-50 rounded-2xl p-5 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L13.09 8.26L19 7L14.74 11.26L21 12L14.74 12.74L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.74L3 12L9.26 11.26L5 7L10.91 8.26L12 2Z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-800">Recommended Practice</h2>
            </div>
            {/* White text area inside purple card */}
            <div className="bg-white rounded-xl p-4 border border-purple-100">
              <p className="text-gray-700 text-sm leading-relaxed">
                {displayFeedback.recommendedPractice}
              </p>
            </div>
          </section>
        </main>

        {/* Fixed Bottom Button with Separator */}
        <div className="fixed bottom-0 left-0 right-0 bg-white">
          <div className="max-w-md mx-auto">
            {/* Separator line */}
            <div className="h-px bg-gray-200 mx-4"></div>
            {/* Button */}
            <div className="p-4">
              <button
                onClick={handleBack}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white py-4 rounded-2xl font-semibold shadow-lg"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DetailedFeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    }>
      <DetailedFeedbackContent />
    </Suspense>
  );
}
