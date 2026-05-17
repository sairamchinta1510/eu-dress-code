import { useState, useCallback } from 'react';
import { useMsal as useMsalLib } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { loginRequest } from '../msalConfig';
import { CalendarEvent } from '../types';

const KEYWORD_MAP: Array<{ patterns: string[]; dressCodeId: string }> = [
  { patterns: ['white tie'], dressCodeId: 'white-tie' },
  { patterns: ['black tie optional'], dressCodeId: 'black-tie-optional' },
  { patterns: ['black tie', 'gala', 'formal dinner', 'award ceremony', 'award dinner'], dressCodeId: 'black-tie' },
  { patterns: ['morning dress', 'ascot'], dressCodeId: 'morning-dress' },
  { patterns: ['creative black tie'], dressCodeId: 'creative-black-tie' },
  { patterns: ['cocktail', 'evening reception'], dressCodeId: 'cocktail' },
  { patterns: ['lounge suit', 'wedding', 'conference', 'summit'], dressCodeId: 'lounge-suit' },
  { patterns: ['board meeting', 'board of directors', 'formal meeting', 'interview'], dressCodeId: 'business-formal' },
  { patterns: ['client meeting', 'client lunch', 'client visit', 'office', 'team meeting'], dressCodeId: 'business-casual' },
  { patterns: ['garden party', 'outdoor', 'barbecue', 'bbq', 'yacht', 'boat'], dressCodeId: 'resort-casual' },
];

export const detectDressCode = (title: string, body: string): string | undefined => {
  const text = `${title} ${body}`.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.patterns.some((p) => text.includes(p))) {
      return entry.dressCodeId;
    }
  }
  return undefined;
};

export const useMsal = () => {
  const { instance, accounts } = useMsalLib();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignedIn = accounts.length > 0;
  const userName = accounts[0]?.name ?? '';
  const userEmail = accounts[0]?.username ?? '';

  const signIn = useCallback(async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    }
  }, [instance]);

  const signOut = useCallback(() => {
    instance.logoutPopup().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Sign out failed');
    });
  }, [instance]);

  const fetchEvents = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const account = accounts[0];
      let token;
      try {
        token = await instance.acquireTokenSilent({ ...loginRequest, account });
      } catch (e) {
        if (e instanceof InteractionRequiredAuthError) {
          token = await instance.acquireTokenPopup({ ...loginRequest, account });
        } else {
          throw e;
        }
      }
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 7);

      const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${end.toISOString()}&$orderby=start/dateTime&$top=20`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });

      if (!res.ok) throw new Error('Failed to fetch calendar events');

      const data = await res.json() as { value?: Record<string, unknown>[] };
      const mapped: CalendarEvent[] = (data.value ?? []).map((e) => {
        const event = e as {
          id: string;
          subject: string;
          start: { dateTime: string; timeZone: string };
          end: { dateTime: string; timeZone: string };
          bodyPreview: string;
        };
        return {
          id: event.id,
          subject: event.subject,
          start: event.start,
          end: event.end,
          bodyPreview: event.bodyPreview,
          detectedDressCodeId: detectDressCode(event.subject ?? '', event.bodyPreview ?? ''),
        };
      });
      setEvents(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [instance, accounts, isSignedIn]);

  return { isSignedIn, userName, userEmail, events, loading, error, signIn, signOut, fetchEvents };
};
