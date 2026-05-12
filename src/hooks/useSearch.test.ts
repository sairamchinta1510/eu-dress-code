import { renderHook } from '@testing-library/react';
import { useSearch } from './useSearch';
import { dressCodes } from '../data/dressCodes';

describe('useSearch', () => {
  it('returns all dress codes when query is empty', () => {
    const { result } = renderHook(() => useSearch(dressCodes, ''));
    expect(result.current).toHaveLength(12);
  });

  it('filters by dress code name', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'black tie'));
    expect(result.current.length).toBeGreaterThanOrEqual(1);
    expect(result.current.some((d) => d.id === 'black-tie')).toBe(true);
  });

  it('filters by occasion keyword', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'gala'));
    expect(result.current.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by shoe colour', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'patent leather'));
    expect(result.current.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array when no match', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'xyznotaword'));
    expect(result.current).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const { result } = renderHook(() => useSearch(dressCodes, 'CASUAL'));
    expect(result.current.length).toBeGreaterThan(0);
  });
});
