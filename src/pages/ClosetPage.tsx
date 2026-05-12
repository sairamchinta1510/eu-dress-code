import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ClosetCheck from '../components/ClosetCheck/ClosetCheck';
import styles from './ClosetPage.module.css';

const ClosetPage: React.FC = () => {
  const [params] = useSearchParams();
  const initialDressCodeId = params.get('dressCodeId') ?? undefined;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>🪞 Closet Check</h1>
        <p className={styles.subtitle}>Upload a photo of your wardrobe and AI will tell you what you have — and what to buy.</p>
      </header>
      <ClosetCheck initialDressCodeId={initialDressCodeId} />
    </div>
  );
};

export default ClosetPage;
