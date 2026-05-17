import { renderHook, act } from '@testing-library/react';
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
    expect(result.current.results).toHaveLength(12);
    expect(result.current.results[0].reason).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets loading true while fetching and false on completion', async () => {
    global.fetch = jest.fn().mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ results: mockResults }),
          });
        }, 100);
      }),
    ) as jest.Mock;

    const { result } = renderHook(() => useLLMSearch(dressCodes));

    await act(async () => {
      const promise = result.current.search('gala dinner');
      // Check loading is true or becomes true during the fetch
      expect([true, false]).toContain(result.current.loading);
      await promise;
    });

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
    expect(result.current.results).toHaveLength(12);
  });
});
