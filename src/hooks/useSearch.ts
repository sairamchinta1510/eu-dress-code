import { useMemo } from 'react';
import { DressCode } from '../types';

const getSearchableText = (d: DressCode): string => [
  d.name,
  d.description,
  ...d.occasions,
  ...d.keywords,
  d.men.jacket, d.men.top, d.men.bottom,
  ...d.men.accessories,
  d.men.shoeType, d.men.shoeColour,
  d.women.jacket, d.women.top, d.women.bottom,
  ...d.women.accessories,
  d.women.shoeType, d.women.shoeColour,
].join(' ').toLowerCase();

export const useSearch = (dressCodes: DressCode[], query: string): DressCode[] =>
  useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dressCodes;
    return dressCodes.filter((d) => getSearchableText(d).includes(q));
  }, [dressCodes, query]);
