import { useState, useCallback } from 'react';
import { DressCode } from '../types';

export interface SearchResult {
  dressCode: DressCode;
  relevance: number;
  reason: string;
}

const allAsResults = (dressCodes: DressCode[]): SearchResult[] =>
  dressCodes.map((d) => ({ dressCode: d, relevance: 0, reason: '' }));

export const useLLMSearch = (dressCodes: DressCode[]) => {
  const [results, setResults] = useState<SearchResult[]>(() => allAsResults(dressCodes));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(allAsResults(dressCodes));
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const summaries = dressCodes.map(({ id, name, description, occasions, keywords }) => ({
      id, name, description, occasions, keywords,
    }));

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, dressCodes: summaries }),
      });

      const data = await res.json() as { results?: { id: string; relevance: number; reason: string }[]; error?: string };

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [dressCodes]);

  return { results, loading, error, search };
};
