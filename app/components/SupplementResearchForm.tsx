'use client';

import { useState, useEffect } from 'react';
import { isSelfHostedMode } from '@/lib/mode';

interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

interface SupplementResearchFormProps {
  onTaskCreated: (taskId: string) => void;
  user: User | null;
  onSignInClick: () => void;
  supplementName: string;
  setSupplementName: (name: string) => void;
  researchFocus: string;
  setResearchFocus: (focus: string) => void;
  isAnalyzing?: boolean;
}

export default function SupplementResearchForm({
  onTaskCreated,
  user,
  onSignInClick,
  supplementName,
  setSupplementName,
  researchFocus,
  setResearchFocus,
  isAnalyzing
}: SupplementResearchFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const [currentSupplements, setCurrentSupplements] = useState('');
  const [healthGoals, setHealthGoals] = useState('');

  // Reset loading when isAnalyzing becomes false (e.g., when cancelled)
  useEffect(() => {
    if (isAnalyzing === false) {
      setLoading(false);
    }
  }, [isAnalyzing]);

  // Check if running in self-hosted mode
  const isSelfHosted = isSelfHostedMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Only require sign-in in valyu mode (not self-hosted)
    if (!isSelfHosted && !user) {
      onSignInClick();
      return;
    }

    setLoading(true);

    try {
      // Get access token for valyu mode
      const accessToken = !isSelfHosted
        ? localStorage.getItem('valyu_access_token')
        : null;

      // Build headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add authorization header in valyu mode
      if (!isSelfHosted && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Create the research task
      const response = await fetch('/api/supplement-research', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          supplementName,
          researchFocus,
          currentSupplements: currentSupplements || undefined,
          healthGoals: healthGoals || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle auth required error (token expired/invalid)
        if (data.error === 'AUTH_REQUIRED') {
          // Clear invalid tokens
          localStorage.removeItem('valyu_access_token');
          localStorage.removeItem('valyu_user');
          onSignInClick();
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to perform research');
      }

      // Pass the task ID to parent, which handles polling
      const taskId = data.deepresearch_id;
      onTaskCreated(taskId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  // Common supplement examples
  const supplementExamples = [
    'Collagen',
    'Vitamin D3',
    'Magnesium',
    'Omega-3',
    'Creatine',
    'Ashwagandha',
  ];

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 p-4 sm:p-5 rounded-lg bg-card border border-border shadow-sm">
        <div className="space-y-2">
          <label htmlFor="supplementName" className="block text-sm font-medium text-foreground">
            Supplement Name
          </label>
          <input
            type="text"
            id="supplementName"
            value={supplementName}
            onChange={(e) => setSupplementName(e.target.value)}
            placeholder="e.g., Collagen, Vitamin D3, Magnesium..."
            required
            className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all text-sm"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {supplementExamples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setSupplementName(example)}
                className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="researchFocus" className="block text-sm font-medium text-foreground">
            Research Focus <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="researchFocus"
            value={researchFocus}
            onChange={(e) => setResearchFocus(e.target.value)}
            placeholder="Any specific aspects you want to focus on? e.g., benefits for skin health, best forms for absorption..."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all resize-none text-sm"
          />
        </div>

        {/* Extra Details Dropdown */}
        <div className="border border-border rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowExtras(!showExtras)}
            className="w-full px-3 py-2 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/50 transition-all"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Extra Details
              <span className="text-xs text-muted-foreground/60">(optional)</span>
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${showExtras ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExtras && (
            <div className="p-3 pt-0 space-y-4 border-t border-border bg-muted/30">
              {/* Current Supplements - Interaction Checker */}
              <div className="space-y-2 pt-3">
                <label htmlFor="currentSupplements" className="block text-sm font-medium text-foreground">
                  Current Supplements/Medications
                </label>
                <textarea
                  id="currentSupplements"
                  value={currentSupplements}
                  onChange={(e) => setCurrentSupplements(e.target.value)}
                  placeholder="List any supplements or medications you're currently taking to check for interactions..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  We'll check for potential interactions with {supplementName || 'this supplement'}
                </p>
              </div>

              {/* Health Goals - Stack Builder */}
              <div className="space-y-2">
                <label htmlFor="healthGoals" className="block text-sm font-medium text-foreground">
                  Health Goals
                </label>
                <textarea
                  id="healthGoals"
                  value={healthGoals}
                  onChange={(e) => setHealthGoals(e.target.value)}
                  placeholder="What are you trying to achieve? e.g., better sleep, more energy, muscle recovery, skin health..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  We'll suggest complementary supplements to build an optimal stack
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-md bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Researching...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span>Start Research</span>
            </>
          )}
        </button>

        {!loading && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Takes 5-10 min · PDF report + CSV of brands + Word summary
          </p>
        )}
      </form>

    </div>
  );
}
