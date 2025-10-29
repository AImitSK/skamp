# AI Usage Tracking Pattern für API-Routen

## Imports hinzufügen

```typescript
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { checkAILimit } from '@/lib/usage/usage-tracker';
import { estimateAIWords, trackAIUsage } from '@/lib/ai/helpers/usage-tracker';
```

## POST-Handler mit Auth wrappen

```typescript
// VORHER:
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // ...
  }
}

// NACHHER:
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data = await req.json();  // ← req statt request!
      // ...
    }
  });
}
```

## Limit-Check VOR dem AI-Flow

```typescript
// Nach Validierung, vor Flow-Aufruf:

const estimatedWords = estimateAIWords(inputText, expectedOutputWords);

try {
  const limitCheck = await checkAILimit(auth.organizationId, estimatedWords);

  if (!limitCheck.allowed) {
    console.warn('⚠️ AI limit exceeded:', {
      current: limitCheck.current,
      limit: limitCheck.limit,
      remaining: limitCheck.remaining,
      wouldExceed: limitCheck.wouldExceed
    });

    return NextResponse.json(
      {
        error: `AI-Limit erreicht! Du hast bereits ${limitCheck.current} von ${limitCheck.limit} AI-Wörtern verwendet. Noch verfügbar: ${limitCheck.remaining} Wörter.`,
        limitInfo: {
          current: limitCheck.current,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining,
          wouldExceed: limitCheck.wouldExceed,
          requestedAmount: estimatedWords
        }
      },
      { status: 429 }
    );
  }

  console.log('✅ AI limit check passed:', {
    current: limitCheck.current,
    limit: limitCheck.limit,
    remaining: limitCheck.remaining,
    estimated: estimatedWords
  });
} catch (limitError) {
  console.error('❌ Error checking AI limit:', limitError);
  return NextResponse.json(
    { error: 'Fehler beim Prüfen des AI-Limits. Bitte kontaktiere den Support.' },
    { status: 500 }
  );
}
```

## Usage-Tracking NACH dem AI-Flow

```typescript
// Nach Flow-Aufruf, vor Response:

try {
  const inputText = /* alle Input-Texte kombinieren */;
  const outputText = /* alle Output-Texte kombinieren */;

  await trackAIUsage(auth.organizationId, inputText, outputText);
} catch (trackingError) {
  console.error('⚠️ Failed to track AI usage:', trackingError);
  // Nicht werfen - Generation war erfolgreich
}
```

## Estimated Output Words pro Flow-Typ

- **generate-headlines**: 150 words
- **generate-press-release**: 800 words
- **generate-structured**: 800 words
- **text-transform**: 300 words (oder input * 1.2)
- **email-insights**: 200 words
- **email-response**: 150 words
- **analyze-keyword-seo**: 300 words
