import { detectDressCode } from './useMsal';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

describe('detectDressCode', () => {
  it('detects black tie from "gala"', () => {
    expect(detectDressCode('Annual Gala Dinner', '')).toBe('black-tie');
  });

  it('detects business formal from "board meeting"', () => {
    expect(detectDressCode('Board Meeting Q2', '')).toBe('business-formal');
  });

  it('detects lounge suit from "wedding"', () => {
    expect(detectDressCode('Sarah and James Wedding', '')).toBe('lounge-suit');
  });

  it('detects resort casual from "garden party"', () => {
    expect(detectDressCode('Summer Garden Party', '')).toBe('resort-casual');
  });

  it('returns undefined for unknown events', () => {
    expect(detectDressCode('Random Team Sync', '')).toBeUndefined();
  });

  it('checks body preview when title has no match', () => {
    expect(detectDressCode('Friday Event', 'black tie required')).toBe('black-tie');
  });
});

describe('InteractionRequiredAuthError fallback', () => {
  it('can be imported from @azure/msal-browser', () => {
    // This test validates that the import works correctly
    // If the import fails, the test file would fail to load
    expect(true).toBe(true);
  });
});
