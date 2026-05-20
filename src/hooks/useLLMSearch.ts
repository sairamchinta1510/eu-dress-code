import { useState, useCallback, useRef } from 'react';
import { DressCode, AiRecommendation } from '../types';

export interface SearchResult {
  dressCode: DressCode;
  relevance: number;
  reason: string;
}

const allAsResults = (dressCodes: DressCode[]): SearchResult[] =>
  dressCodes.map((d) => ({ dressCode: d, relevance: 0, reason: '' }));

export const useLLMSearch = (dressCodes: DressCode[]) => {
  const [results, setResults] = useState<SearchResult[]>(() => allAsResults(dressCodes));
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(allAsResults(dressCodes));
      setRecommendation(null);
      setError(null);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const summaries = dressCodes.map(({ id, name, description, occasions, keywords }) => ({
      id, name, description, occasions, keywords,
    }));

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL ?? ''}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, dressCodes: summaries }),
        signal: controller.signal,
      });

      const data = await res.json() as {
        results?: { id: string; relevance: number; reason: string }[];
        recommendation?: AiRecommendation | null;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? 'Search failed');
      }

      const mapped: SearchResult[] = (data.results ?? [])
        .map(({ id, relevance, reason }) => {
          const dressCode = dressCodes.find((d) => d.id === id);
          return dressCode ? { dressCode, relevance, reason } : null;
        })
        .filter((r): r is SearchResult => r !== null);

      setResults(mapped);
      setRecommendation(data.recommendation ?? null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Stale request cancelled — do not update state
      }
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setRecommendation(null);
    } finally {
      // Only clear loading if this is still the current request
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [dressCodes]);

  return { results, recommendation, loading, error, search };
};
