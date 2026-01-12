'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Source {
  title: string;
  url: string;
}

interface Usage {
  search_cost?: number;
  ai_cost?: number;
  compute_cost?: number;
  total_cost?: number;
}

interface Progress {
  current_step: number;
  total_steps: number;
}

interface Deliverable {
  type: 'csv' | 'docx' | 'pdf';
  url: string;
  description?: string;
}

interface ResearchResult {
  success: boolean;
  deepresearch_id: string;
  status: string;
  output?: string;
  sources?: Source[];
  usage?: Usage;
  pdf_url?: string;
  deliverables?: Deliverable[];
  progress?: Progress;
}

interface ResearchResultsProps {
  result: ResearchResult | null;
  isLoading: boolean;
  onReset: () => void;
  onCancel?: () => void;
  isCancelling?: boolean;
}

export default function ResearchResults({ result, isLoading, onReset, onCancel, isCancelling }: ResearchResultsProps) {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Handle file download
  const handleDownload = async (url: string, filename: string, type: string) => {
    setIsDownloading(type);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab if download fails
      window.open(url, '_blank');
    } finally {
      setIsDownloading(null);
    }
  };

  // Get file icon based on type
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'csv':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'docx':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'pdf':
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  // Get file type label
  const getFileLabel = (type: string) => {
    switch (type) {
      case 'csv':
        return 'Brand Comparison CSV';
      case 'docx':
        return 'Summary Document';
      case 'pdf':
        return 'Full Report PDF';
      default:
        return type.toUpperCase();
    }
  };

  // Get status message
  const getStatusMessage = () => {
    if (!result) return 'Initializing...';

    const statusMap: Record<string, string> = {
      'queued': 'Task queued, waiting to start...',
      'running': 'Research in progress...',
      'completed': 'Research completed',
      'failed': 'Research failed'
    };
    return statusMap[result.status] || 'Processing...';
  };

  // Show loading state
  if (isLoading || !result || !result.output) {
    return (
      <div className="w-full">
        {/* Status Card */}
        <div className="p-6 sm:p-8 rounded-lg bg-card border border-border shadow-sm">
          {/* Animated Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {getStatusMessage()}
            </h3>
            <p className="text-sm text-muted-foreground">
              This typically takes 5-10 minutes
            </p>
          </div>

          {result?.progress && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Step {result.progress.current_step} of {result.progress.total_steps}
                </span>
                <span className="text-xs font-medium text-foreground">
                  {Math.round((result.progress.current_step / result.progress.total_steps) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(result.progress.current_step / result.progress.total_steps) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Research steps */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span>Searching clinical databases</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-chart-2/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span>Analyzing scientific studies</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-chart-3/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span>Comparing brands and products</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span>Generating reports</span>
            </div>
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <div className="mt-6 pt-6 border-t border-border flex justify-center">
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="px-4 py-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all flex items-center gap-2"
              >
                {isCancelling ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {isCancelling ? 'Cancelling...' : 'Cancel Research'}
              </button>
            </div>
          )}
        </div>

        {/* What you'll receive */}
        <div className="mt-6 p-5 rounded-lg bg-accent/30 border border-accent">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            What you'll receive
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>PDF research report</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Brand comparison CSV</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Summary document</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Clinical citations</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Success header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Research Complete
            </h2>
            <p className="text-xs text-muted-foreground">
              Your supplement analysis is ready
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Research
        </button>
      </div>

      {/* Deliverables Section */}
      {(result.pdf_url || (result.deliverables && result.deliverables.length > 0)) && (
        <div className="mb-6 p-4 sm:p-6 rounded-lg bg-accent/30 border border-accent">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Download Your Files
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* PDF Report */}
            {result.pdf_url && (
              <button
                onClick={() => handleDownload(result.pdf_url!, `supplement-research-${result.deepresearch_id}.pdf`, 'pdf')}
                disabled={isDownloading === 'pdf'}
                className="flex items-center gap-3 p-3 rounded-md bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-wait"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-md bg-destructive/10 text-destructive flex items-center justify-center">
                  {isDownloading === 'pdf' ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    getFileIcon('pdf')
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Full Report PDF</p>
                  <p className="text-xs text-muted-foreground">Complete research document</p>
                </div>
              </button>
            )}

            {/* Other deliverables */}
            {result.deliverables?.map((deliverable, index) => (
              <button
                key={index}
                onClick={() => handleDownload(
                  deliverable.url,
                  `supplement-${deliverable.type}-${result.deepresearch_id}.${deliverable.type}`,
                  deliverable.type
                )}
                disabled={isDownloading === deliverable.type}
                className="flex items-center gap-3 p-3 rounded-md bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-wait"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center ${
                  deliverable.type === 'csv'
                    ? 'bg-primary/10 text-primary'
                    : deliverable.type === 'docx'
                    ? 'bg-ring/10 text-ring'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {isDownloading === deliverable.type ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    getFileIcon(deliverable.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{getFileLabel(deliverable.type)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {deliverable.description || `Download ${deliverable.type.toUpperCase()}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main research output */}
      <div className="rounded-lg bg-card border border-border shadow-sm max-h-[60vh] sm:max-h-[calc(100vh-160px)] overflow-y-auto">
        {/* Markdown Report */}
        <div className="p-4 sm:p-8">
          <div className="prose prose-neutral dark:prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-semibold
            prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6 prose-h1:first:mt-0
            prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-6
            prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-3 prose-p:text-sm
            prose-strong:text-foreground prose-strong:font-medium
            prose-ul:my-3 prose-ul:space-y-1
            prose-ol:my-3 prose-ol:space-y-1
            prose-li:text-muted-foreground prose-li:text-sm
            prose-a:text-foreground prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-muted-foreground
            prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal
            prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:text-sm
            prose-blockquote:border-l-border prose-blockquote:bg-muted prose-blockquote:py-0.5 prose-blockquote:px-4 prose-blockquote:text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  const domain = (() => {
                    try {
                      return href ? new URL(href).hostname : '';
                    } catch {
                      return '';
                    }
                  })();
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      {domain && (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                          alt=""
                          className="w-3.5 h-3.5 inline-block rounded-sm"
                        />
                      )}
                      {children}
                    </a>
                  );
                }
              }}
            >
              {result.output}
            </ReactMarkdown>
          </div>
        </div>

        {/* Sources Section */}
        {result.sources && result.sources.length > 0 && (
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-border bg-muted">
            <h3 className="text-sm font-medium mb-4 text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Sources ({result.sources.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.sources.map((source, index) => {
                const domain = (() => {
                  try {
                    return new URL(source.url).hostname;
                  } catch {
                    return '';
                  }
                })();
                return (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-md bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                        alt=""
                        className="w-5 h-5 mt-0.5 flex-shrink-0 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground group-hover:underline line-clamp-2 leading-snug">
                          {source.title}
                        </p>
                        <p className="text-xs text-muted-foreground/70 truncate mt-1">
                          {domain}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Usage Metrics Section */}
        {result.usage && (
          <div className="p-4 sm:p-6 border-t border-border">
            <h3 className="text-sm font-medium mb-4 text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Usage
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {result.usage.search_cost !== undefined && (
                <div className="p-3 rounded-md bg-muted border border-border">
                  <p className="text-xs text-muted-foreground/70 mb-1">Search</p>
                  <p className="font-medium text-foreground">${result.usage.search_cost.toFixed(4)}</p>
                </div>
              )}
              {result.usage.ai_cost !== undefined && (
                <div className="p-3 rounded-md bg-muted border border-border">
                  <p className="text-xs text-muted-foreground/70 mb-1">AI</p>
                  <p className="font-medium text-foreground">${result.usage.ai_cost.toFixed(4)}</p>
                </div>
              )}
              {result.usage.compute_cost !== undefined && (
                <div className="p-3 rounded-md bg-muted border border-border">
                  <p className="text-xs text-muted-foreground/70 mb-1">Compute</p>
                  <p className="font-medium text-foreground">${result.usage.compute_cost.toFixed(4)}</p>
                </div>
              )}
              {result.usage.total_cost !== undefined && (
                <div className="p-3 rounded-md bg-primary border border-primary">
                  <p className="text-xs text-primary-foreground/70 mb-1">Total</p>
                  <p className="font-medium text-primary-foreground">${result.usage.total_cost.toFixed(4)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
