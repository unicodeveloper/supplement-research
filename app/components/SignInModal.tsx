'use client';

import { initiateOAuthFlow, OAuthFormValues } from '@/lib/oauth';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  formValues?: OAuthFormValues;
}

export default function SignInModal({ isOpen, onClose, formValues }: SignInModalProps) {
  const handleSignIn = () => {
    initiateOAuthFlow(formValues);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6 relative border border-border">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground/60 hover:text-muted-foreground transition-all p-1 hover:bg-accent rounded"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Modal Content */}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Sign in with Valyu
            </h2>

            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Valyu powers the supplement research app with real-time access to comprehensive health and wellness data.
            </p>

            {/* Free Credits Banner */}
            <div className="bg-accent/30 border border-accent rounded-md p-3 mb-5">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-lg">🎁</span>
                <span className="text-sm font-medium text-primary">
                  $10 Free Credits
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                New accounts get $10 in free search credits. No credit card required.
              </p>
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleSignIn}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-2 mb-3 text-sm"
            >
              <span>Sign in with Valyu</span>
            </button>

            <p className="text-xs text-muted-foreground/70">
              Don't have an account? You can create one during sign-in.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
