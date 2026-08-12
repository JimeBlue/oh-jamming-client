'use client';

import { useEffect, useState } from 'react';

import {
  MIN_QUERY_LENGTH,
  searchAddresses,
  type AddressSuggestion,
} from '@/services/geocoding';

/* Photon is a free public service, so the contract is "don't hammer it": one
   request per pause in typing, not one per keystroke. 300ms is the usual number
   — long enough that "Königstraße" is one request instead of eleven, short
   enough that the list still feels like it's keeping up. */
const DEBOUNCE_MS = 300;

export type AddressSearch = {
  suggestions: AddressSuggestion[];
  status: 'idle' | 'searching' | 'ready' | 'failed';
};

/* What came back, and what it came back *for*. Storing the query alongside the
   results is what lets the status be derived rather than tracked: if the stored
   query isn't the one being typed now, a request is by definition still on its
   way, and no `setState` in the effect body is needed to say so. */
type Attempt = {
  query: string;
  suggestions: AddressSuggestion[];
  failed: boolean;
};

const IDLE: AddressSearch = { suggestions: [], status: 'idle' };

export const useAddressSearch = (query: string): AddressSearch => {
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      searchAddresses(trimmed, controller.signal)
        .then((suggestions) =>
          setAttempt({ query: trimmed, suggestions, failed: false }),
        )
        .catch((error: unknown) => {
          /* Aborted means a newer keystroke already owns the field — not a
             failure, and reporting it would flash an error mid-typing. */
          if (controller.signal.aborted) return;

          console.error('Address lookup failed:', error);
          setAttempt({ query: trimmed, suggestions: [], failed: true });
        });
    }, DEBOUNCE_MS);

    /* Runs on the next keystroke as well as on unmount, so at most one request
       is ever in flight and a slow one can't overtake the request that replaced
       it — the out-of-order response that would otherwise fill the list with
       matches for a query the venue has already typed past. */
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  if (trimmed.length < MIN_QUERY_LENGTH) return IDLE;

  if (!attempt) return { suggestions: [], status: 'searching' };

  /* The previous query's results stay on screen while the new ones are on the
     way. Emptying the list first would make it blink out and back on every
     letter, which reads as breakage rather than as progress. */
  if (attempt.query !== trimmed) {
    return { suggestions: attempt.suggestions, status: 'searching' };
  }

  return {
    suggestions: attempt.suggestions,
    status: attempt.failed ? 'failed' : 'ready',
  };
};
