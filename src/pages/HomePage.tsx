import React from 'react';
import SearchBar from '../components/SearchBar/SearchBar';
import DressCodeCard from '../components/DressCodeCard/DressCodeCard';
import { dressCodes } from '../data/dressCodes';
import styles from './HomePage.module.css';

const HomePage: React.FC = () => (
  <div className={styles.page}>
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.accentBar} aria-hidden="true" />
        <div>
          <h1 className={styles.title}>EU Dress Code Guide</h1>
          <p className={styles.subtitle}>Know exactly what to wear, every time</p>
        </div>
      </div>
      <div className={styles.searchWrapper}>
        <SearchBar />
      </div>
    </header>
    <section className={styles.grid} aria-label="Dress codes">
      <p className={styles.sectionLabel}>All Dress Codes · {dressCodes.length}</p>
      {dressCodes.map((dc) => (
        <DressCodeCard key={dc.id} dressCode={dc} />
      ))}
    </section>
  </div>
);

export default HomePage;
