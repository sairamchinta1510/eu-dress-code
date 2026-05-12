import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalConfig';
import BottomNav from './components/BottomNav/BottomNav';
import HomePage from './pages/HomePage';
import DressCodePage from './pages/DressCodePage';
import CalendarPage from './pages/CalendarPage';
import ClosetPage from './pages/ClosetPage';
import styles from './App.module.css';

const App: React.FC = () => (
  <MsalProvider instance={msalInstance}>
    <BrowserRouter>
      <div className={styles.app}>
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dress-codes/:id" element={<DressCodePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/closet" element={<ClosetPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  </MsalProvider>
);

export default App;
