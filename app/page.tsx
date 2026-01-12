'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import SupplementResearchForm from './components/SupplementResearchForm';
import ResearchResults from './components/ResearchResults';
import Sidebar from './components/Sidebar';
import SignInModal from './components/SignInModal';
import { isSelfHostedMode } from '@/lib/mode';
import { restoreFormValuesAfterOAuth } from '@/lib/oauth';

interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

function HomeContent() {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDiscordBanner, setShowDiscordBanner] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showAuthSuccess, setShowAuthSuccess] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [supplementName, setSupplementName] = useState('');
  const [researchFocus, setResearchFocus] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelledRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useSearchParams();

  // Check if running in self-hosted mode
  const isSelfHosted = isSelfHostedMode();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Skip OAuth handling in self-hosted mode
    if (isSelfHosted) return;

    // Load user from localStorage
    const storedUser = localStorage.getItem('valyu_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('valyu_user');
      }
    }

    // Check if user just completed authentication
    const authStatus = searchParams.get('auth');
    if (authStatus === 'success') {
      setShowAuthSuccess(true);
      // Reload user from localStorage after successful auth
      const newUser = localStorage.getItem('valyu_user');
      if (newUser) {
        try {
          setUser(JSON.parse(newUser));
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      }
      // Restore form values saved before OAuth redirect
      const savedFormValues = restoreFormValuesAfterOAuth();
      if (savedFormValues) {
        if (savedFormValues.supplementName) {
          setSupplementName(savedFormValues.supplementName);
        }
        if (savedFormValues.researchFocus) {
          setResearchFocus(savedFormValues.researchFocus);
        }
      }
      // Hide success message after 5 seconds
      setTimeout(() => setShowAuthSuccess(false), 5000);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, isSelfHosted]);

  /**
   * Get authorization headers for API calls (only needed in valyu mode)
   */
  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};
    if (!isSelfHosted) {
      const accessToken = localStorage.getItem('valyu_access_token');
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }
    return headers;
  };

  const pollStatus = async (taskId: string) => {
    // Don't poll if cancelled
    if (cancelledRef.current) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/supplement-research/status?taskId=${taskId}`, {
        headers,
      });
      const data = await response.json();

      if (!response.ok) {
        // Handle auth required error (token expired/invalid)
        if (data.error === 'AUTH_REQUIRED') {
          // Clear invalid tokens
          localStorage.removeItem('valyu_access_token');
          localStorage.removeItem('valyu_user');
          setUser(null);
          setShowSignInModal(true);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsAnalyzing(false);
          return;
        }
        throw new Error(data.error || 'Failed to check status');
      }

      // Ignore results if cancelled during fetch
      if (cancelledRef.current) {
        return;
      }

      setAnalysisResult(data);

      // If completed, stop polling
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (data.status !== 'completed') {
          setIsAnalyzing(false);
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
      // Don't stop polling on temporary errors
    }
  };

  const handleTaskCreated = (taskId: string) => {
    cancelledRef.current = false;
    setIsAnalyzing(true);
    setCurrentTaskId(taskId);

    // Poll immediately
    pollStatus(taskId);

    // Then poll every 10 seconds
    pollIntervalRef.current = setInterval(() => {
      pollStatus(taskId);
    }, 10000);
  };

  const handleReset = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setCurrentTaskId(null);
    setIsCancelling(false);
    // Clear form inputs
    setSupplementName('');
    setResearchFocus('');
  };

  const handleCancel = async () => {
    // Mark as cancelled immediately to ignore any in-flight poll results
    cancelledRef.current = true;

    if (!currentTaskId) {
      // If no task ID yet, just reset
      handleReset();
      return;
    }

    setIsCancelling(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };

      await fetch('/api/supplement-research/cancel', {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId: currentTaskId }),
      });
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
    // Reset state and go back to homepage regardless of API result
    handleReset();
  };

  // Determine if we're on homepage (no analysis in progress)
  const isHomepage = !isAnalyzing && !analysisResult;

  return (
    <div className={`bg-background px-4 sm:px-8 lg:px-12 ${isHomepage ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen py-8 sm:py-16'}`}>
      {/* Sidebar */}
      <Sidebar onSignInClick={() => setShowSignInModal(true)} user={user} />

      {/* Sign In Modal - only shown in valyu mode */}
      {!isSelfHosted && (
        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          formValues={{ supplementName, researchFocus }}
        />
      )}

      {/* Authentication Success Notification - only in valyu mode */}
      {!isSelfHosted && showAuthSuccess && (
        <div className="fixed top-6 right-6 z-50">
          <div className="bg-card border border-border rounded-lg px-5 py-4 shadow-lg flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                Successfully signed in
              </div>
              <div className="text-xs text-muted-foreground">
                Welcome to Supplement Research
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discord Banner */}
      {showDiscordBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 z-50">
          <a
            href="https://discord.gg/BhUWrFbHRa"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--discord)] hover:bg-[var(--discord-hover)] text-white rounded-md shadow-sm transition-all text-xs whitespace-nowrap"
          >
            {/* Discord Icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span className="font-medium">Join the Discord</span>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDiscordBanner(false);
              }}
              className="ml-0.5 p-0.5 hover:bg-white/20 rounded transition-all"
              aria-label="Close"
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </a>
        </div>
      )}

      <main className={`max-w-6xl mx-auto ${isHomepage ? 'flex-1 flex flex-col justify-center' : ''}`}>
        {/* Main Content */}
        {isHomepage ? (
          // Centered layout before analysis starts - fits viewport
          <div className="flex flex-col items-center">
            {/* Header - Centered */}
            <div className="text-center mb-6 sm:mb-8">
              {/* Decorative Icon */}
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/50 mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3 tracking-tight">
                Supplement Research
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed px-2">
                Evidence-based insights for your health journey.
                <span className="hidden sm:inline"> Get detailed reports with dosage recommendations and brand comparisons.</span>
              </p>
            </div>

            {/* Centered form */}
            <SupplementResearchForm
              onTaskCreated={handleTaskCreated}
              user={user}
              onSignInClick={() => setShowSignInModal(true)}
              supplementName={supplementName}
              setSupplementName={setSupplementName}
              researchFocus={researchFocus}
              setResearchFocus={setResearchFocus}
              isAnalyzing={isAnalyzing}
            />
          </div>
        ) : (
          // Centered Layout for research in progress / results
          <div className="flex flex-col items-center pt-4 sm:pt-8">
            {/* Compact Header - only show when still researching */}
            {analysisResult?.status !== 'completed' && (
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight">
                  Researching...
                </h1>
                <p className="text-sm text-muted-foreground">
                  {supplementName}{researchFocus ? ` • ${researchFocus}` : ''}
                </p>
              </div>
            )}

            {/* Centered Results */}
            <div className="w-full max-w-2xl">
              <ResearchResults
                result={analysisResult}
                isLoading={isAnalyzing && !analysisResult}
                onReset={handleReset}
                onCancel={handleCancel}
                isCancelling={isCancelling}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer - only show on homepage */}
      {isHomepage && (
        <footer className="pb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Powered by Valyu Deep Research</span>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
