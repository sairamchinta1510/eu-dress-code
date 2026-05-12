import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent } from '../../types';
import { getDressCodeById } from '../../data/dressCodes';
import styles from './CalendarView.module.css';

interface Props {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const CalendarView: React.FC<Props> = ({ events, loading, error, onRefresh }) => {
  const navigate = useNavigate();

  useEffect(() => { onRefresh(); }, [onRefresh]);

  if (loading) return <div className={styles.state}>Loading calendar…</div>;
  if (error) return (
    <div className={styles.stateError}>
      {error} <button onClick={onRefresh}>Retry</button>
    </div>
  );
  if (events.length === 0) return <div className={styles.state}>No events in the next 7 days.</div>;

  return (
    <ul className={styles.list} aria-label="Upcoming events">
      {events.map((event) => {
        const dc = event.detectedDressCodeId ? getDressCodeById(event.detectedDressCodeId) : null;
        return (
          <li
            key={event.id}
            className={`${styles.item}${dc ? ` ${styles.itemClickable}` : ''}`}
            onClick={() => dc && navigate(`/dress-codes/${dc.id}`)}
            onKeyDown={(e) => {
              if (dc && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                navigate(`/dress-codes/${dc.id}`);
              }
            }}
            role={dc ? 'button' : undefined}
            tabIndex={dc ? 0 : undefined}
            aria-label={dc ? `${event.subject} — ${dc.name} required. Tap for details.` : undefined}
          >
            <div className={styles.eventHeader}>
              <div className={styles.eventInfo}>
                <p className={styles.subject}>{event.subject}</p>
                <p className={styles.time}>{formatDate(event.start.dateTime)}</p>
              </div>
              {dc ? (
                <span className={styles.badge}>{dc.icon} {dc.name}</span>
              ) : (
                <span className={styles.badgeUnknown}>No code</span>
              )}
            </div>
            {event.bodyPreview && (
              <p className={styles.preview}>{event.bodyPreview.slice(0, 80)}…</p>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default CalendarView;
