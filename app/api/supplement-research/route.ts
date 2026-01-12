import { NextRequest, NextResponse } from 'next/server';
import { Valyu } from "valyu-js";
import { isSelfHostedMode } from "@/lib/mode";

// OAuth proxy URL for Valyu platform mode
const VALYU_OAUTH_PROXY_URL = `${process.env.VALYU_APP_URL || 'https://platform.valyu.ai'}/api/oauth/proxy`;

// Vercel Pro plan allows up to 800s (13.3 minutes)
export const maxDuration = 800;

/**
 * Call Valyu API - either through OAuth proxy or directly via SDK
 */
async function callValyuDeepResearch(
  input: string,
  supplementName: string,
  valyuAccessToken?: string
) {
  // Define deliverables for supplement research
  const deliverables: Array<{
    type: "csv" | "docx";
    description: string;
    columns?: string[];
    include_headers?: boolean;
  }> = [
    {
      type: "csv" as const,
      description: `CSV file listing supplement brands selling ${supplementName}, including brand name, price per serving, dosage, third-party testing status, form (capsule/powder/liquid), and where to buy`,
      columns: ["Brand", "Product Name", "Price", "Price Per Serving", "Dosage", "Form", "Third-Party Tested", "Rating", "Where to Buy"],
      include_headers: true
    },
    {
      type: "docx" as const,
      description: `One-page summary document about ${supplementName} covering: what it is, key benefits, recommended dosage, best time to take, potential side effects, who should avoid it, and drug interactions`
    }
  ];

  if (valyuAccessToken) {
    // Use OAuth proxy in valyu mode
    const response = await fetch(VALYU_OAUTH_PROXY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${valyuAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '/v1/deepresearch/tasks',
        method: 'POST',
        body: {
          input,
          model: "fast",
          output_formats: ["markdown", "pdf"],
          deliverables
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Check for auth errors (invalid/expired token)
      if (response.status === 401 || response.status === 403 ||
          errorData.error?.includes('invalid_token') ||
          errorData.error?.includes('expired') ||
          errorData.error?.includes('unauthorized')) {
        const authError = new Error('AUTH_REQUIRED');
        (authError as any).isAuthError = true;
        throw authError;
      }
      throw new Error(errorData.error || `Proxy request failed: ${response.status}`);
    }

    return response.json();
  } else {
    // Use SDK directly in self-hosted mode
    const valyu = new Valyu();
    return valyu.deepresearch.create({
      input,
      model: "fast",
      outputFormats: ["markdown", "pdf"],
      deliverables
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isSelfHosted = isSelfHostedMode();

    // Get Valyu access token from Authorization header (for valyu mode)
    const authHeader = req.headers.get('Authorization');
    const valyuAccessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    // In valyu mode, require authentication
    if (!isSelfHosted && !valyuAccessToken) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Sign in with Valyu to continue.",
      }, { status: 401 });
    }

    const { supplementName, researchFocus, currentSupplements, healthGoals } = await req.json();

    if (!supplementName) {
      return NextResponse.json({ error: 'Supplement name is required' }, { status: 400 });
    }

    // Build dynamic sections based on user input
    let interactionSection = '';
    if (currentSupplements) {
      interactionSection = `
    IMPORTANT - INTERACTION CHECK:
    The user is currently taking: ${currentSupplements}
    Please thoroughly analyze potential interactions between ${supplementName} and these supplements/medications.
    Include: timing considerations, absorption interference, contraindications, and safety recommendations.`;
    }

    let stackSection = '';
    if (healthGoals) {
      stackSection = `
    STACK BUILDING:
    The user's health goals are: ${healthGoals}
    Based on these goals, suggest complementary supplements that would work well with ${supplementName}.
    Include: synergistic combinations, optimal timing/dosing schedule, and what to avoid combining.`;
    }

    // Construct research query for supplement analysis
    const researchQuery = `Research the supplement: ${supplementName}.
    ${researchFocus ? `Focus areas: ${researchFocus}` : ''}
    ${interactionSection}
    ${stackSection}

    Provide a comprehensive analysis including:
    - What ${supplementName} is and how it works in the body
    - Scientific evidence for its benefits (cite studies where possible)
    - Recommended dosage and best time to take it
    - Different forms available (capsule, powder, liquid, etc.) and bioavailability
    - Potential side effects and contraindications
    - Drug interactions to be aware of
    - Who should and shouldn't take this supplement
    - Quality markers to look for when buying (third-party testing, certifications)
    - Top brands and products available with pricing
    - Natural food sources as alternatives

    Be thorough but focus on evidence-based information from reputable sources.`;

    // Create deep research task
    const task = await callValyuDeepResearch(
      researchQuery,
      supplementName,
      isSelfHosted ? undefined : valyuAccessToken
    );

    if (!task.deepresearch_id) {
      throw new Error('Failed to create deep research task');
    }

    // Return task ID immediately for client-side polling
    return NextResponse.json({
      success: true,
      deepresearch_id: task.deepresearch_id,
      status: 'queued',
      message: 'Research task created. Poll the status endpoint to check progress.'
    });

  } catch (error) {
    console.error('Deep research error:', error);

    // Check if it's an auth error
    if ((error as any)?.isAuthError || (error instanceof Error && error.message === 'AUTH_REQUIRED')) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Your session has expired. Please sign in again.",
      }, { status: 401 });
    }

    return NextResponse.json({
      error: `Failed to perform deep research: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
