import { renderHook, act, waitFor } from '@testing-library/react';
import { useLLMSearch } from './useLLMSearch';
import { dressCodes } from '../data/dressCodes';

const mockResults = [
  { id: 'black-tie', relevance: 5, reason: 'Formal evening event requiring a tuxedo.' },
  { id: 'cocktail', relevance: 3, reason: 'Semi-formal reception attire.' },
];

describe('useLLMSearch', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns all dress codes with no reason when query is empty', () => {
    const { result } = renderHook(() => useLLMSearch(dressCodes));
    expect(result.current.results).toHaveLength(17);
    expect(result.current.results[0].reason).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets loading true while fetching and false on completion', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => { resolveFetch = resolve; });

    global.fetch = jest.fn().mockReturnValue(fetchPromise) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    // Start search but don't await — check loading mid-flight
    let searchPromise: Promise<void>;
    act(() => {
      searchPromise = result.current.search('gala dinner');
    });

    await waitFor(() => expect(result.current.loading).toBe(true));

    // Resolve the fetch
    act(() => {
      resolveFetch({
        ok: true,
        json: async () => ({ results: mockResults }),
      });
    });

    await act(async () => { await searchPromise; });
    expect(result.current.loading).toBe(false);
  });

  it('maps API results to full DressCode objects with reasons', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    }) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      await result.current.search('formal evening');
    });

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results[0].dressCode.id).toBe('black-tie');
    expect(result.current.results[0].relevance).toBe(5);
    expect(result.current.results[0].reason).toBe('Formal evening event requiring a tuxedo.');
    expect(result.current.results[1].dressCode.id).toBe('cocktail');
  });

  it('sets error when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Search failed' }),
    }) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      await result.current.search('something');
    });

    expect(result.current.error).toBe('Search failed');
    expect(result.current.results).toHaveLength(0);
  });

  it('sets error when fetch throws (network failure)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      await result.current.search('gala');
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.results).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });

  it('resets to all dress codes when search is called with empty string', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    }) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      await result.current.search('gala');
    });
    expect(result.current.results).toHaveLength(2);

    act(() => {
      result.current.search('');
    });
    expect(result.current.results).toHaveLength(17);
  });

  it('sends only summary fields to the API (not full DressCode objects)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    }) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      await result.current.search('test query');
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    
    expect(body.query).toBe('test query');
    expect(body.dressCodes).toHaveLength(17);
    // Summary only — should NOT contain men/women/formality/icon fields
    expect(body.dressCodes[0]).toHaveProperty('id');
    expect(body.dressCodes[0]).toHaveProperty('name');
    expect(body.dressCodes[0]).toHaveProperty('description');
    expect(body.dressCodes[0]).toHaveProperty('occasions');
    expect(body.dressCodes[0]).toHaveProperty('keywords');
    expect(body.dressCodes[0]).not.toHaveProperty('men');
    expect(body.dressCodes[0]).not.toHaveProperty('women');
  });

  it('uses REACT_APP_API_URL env var as fetch base URL', async () => {
    process.env.REACT_APP_API_URL = 'https://eu-dress-code.vercel.app';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    }) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      await result.current.search('gala dinner');
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toBe('https://eu-dress-code.vercel.app/api/search');

    delete process.env.REACT_APP_API_URL;
  });
});
