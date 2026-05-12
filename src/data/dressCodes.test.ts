import { dressCodes } from './dressCodes';

describe('dressCodes data', () => {
  it('has exactly 12 entries', () => {
    expect(dressCodes).toHaveLength(12);
  });

  it('every dress code has a unique id', () => {
    const ids = dressCodes.map((d) => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(12);
  });

  it('every dress code has men and women outfits with shoeColour', () => {
    dressCodes.forEach((d) => {
      expect(d.men.shoeColour).toBeTruthy();
      expect(d.women.shoeColour).toBeTruthy();
    });
  });

  it('every dress code has at least one occasion', () => {
    dressCodes.forEach((d) => {
      expect(d.occasions.length).toBeGreaterThan(0);
    });
  });
});
