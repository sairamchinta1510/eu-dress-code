import React from 'react';
import { useMsal } from '../hooks/useMsal';
import CalendarView from '../components/CalendarView/CalendarView';
import styles from './CalendarPage.module.css';

const CalendarPage: React.FC = () => {
  const { isSignedIn, userName, userEmail, events, loading, error, signIn, signOut, fetchEvents } = useMsal();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>📅 Calendar</h1>
        {isSignedIn ? (
          <div className={styles.user}>
            <div>
              <p className={styles.userName}>{userName}</p>
              <p className={styles.userEmail}>{userEmail}</p>
            </div>
            <button className={styles.signOutBtn} onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <div className={styles.signInSection}>
            <p className={styles.signInText}>Connect your Outlook calendar to see dress codes for upcoming events.</p>
            <button className={styles.signInBtn} onClick={signIn}>
              Sign in with Microsoft
            </button>
          </div>
        )}
      </header>
      {isSignedIn && (
        <CalendarView events={events} loading={loading} error={error} onRefresh={fetchEvents} />
      )}
    </div>
  );
};

export default CalendarPage;
