import { dressCodes } from './dressCodes';

describe('dressCodes data', () => {
  it('has exactly 17 entries', () => {
    expect(dressCodes).toHaveLength(17);
  });

  it('every dress code has a unique id', () => {
    const ids = dressCodes.map((d) => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(17);
  });

  it('includes the new European dress codes in formality order', () => {
    expect(dressCodes.map((d) => d.id)).toEqual([
      'white-tie',
      'black-tie',
      'black-tie-optional',
      'morning-dress',
      'smart-elegant',
      'creative-black-tie',
      'cocktail',
      'festive',
      'lounge-suit',
      'business-formal',
      'business-casual',
      'garden-party',
      'apres-ski',
      'country-house',
      'smart-casual',
      'resort-casual',
      'casual',
    ]);
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

  it('includes the updated European accuracy examples in occasions and keywords', () => {
    expect(dressCodes.find((d) => d.id === 'morning-dress')?.occasions).toEqual(
      expect.arrayContaining(['Henley Royal Regatta', 'Cheltenham Festival']),
    );
    expect(dressCodes.find((d) => d.id === 'white-tie')?.occasions).toEqual(
      expect.arrayContaining(['Vienna Opera Ball', 'Viennese Balls']),
    );
    expect(dressCodes.find((d) => d.id === 'black-tie')?.occasions).toEqual(
      expect.arrayContaining(['Cannes Film Festival', 'BAFTA ceremony']),
    );
    expect(dressCodes.find((d) => d.id === 'creative-black-tie')?.occasions).toEqual(
      expect.arrayContaining(['Venice Film Festival', 'Cannes after-parties']),
    );
    expect(dressCodes.find((d) => d.id === 'smart-elegant')?.keywords).toEqual(
      expect.arrayContaining(['tenue élégante']),
    );
    expect(dressCodes.find((d) => d.id === 'festive')?.occasions).toEqual(
      expect.arrayContaining(['Dutch Sinterklaas dinners', 'Austrian Advent parties']),
    );
    expect(dressCodes.find((d) => d.id === 'country-house')?.occasions).toEqual(
      expect.arrayContaining(['Glyndebourne Festival Opera']),
    );
  });
});
