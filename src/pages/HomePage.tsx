import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar/SearchBar';
import DressCodeCard from '../components/DressCodeCard/DressCodeCard';
import { dressCodes } from '../data/dressCodes';
import styles from './HomePage.module.css';

const FORMALITY_GROUPS = [
  { label: 'Ultra Formal & White Tie', min: 5, max: 5 },
  { label: 'Formal Evening', min: 4, max: 4 },
  { label: 'Semi-Formal', min: 3, max: 3 },
  { label: 'Smart', min: 2, max: 2 },
  { label: 'Casual', min: 1, max: 1 },
];

// Curated pool of hero photos — both genders, only the most striking shots
const HERO_POOL: { id: string; gender: 'men' | 'women' }[] = [
  { id: 'white-tie',     gender: 'women' },
  { id: 'white-tie',     gender: 'men'   },
  { id: 'black-tie',     gender: 'women' },
  { id: 'black-tie',     gender: 'men'   },
  { id: 'smart-elegant', gender: 'women' },
  { id: 'smart-elegant', gender: 'men'   },
  { id: 'garden-party',  gender: 'women' },
  { id: 'cocktail',      gender: 'women' },
  { id: 'morning-dress', gender: 'women' },
  { id: 'festive',       gender: 'men'   },
];

// Featured strip — always show these 5 codes
const FEATURED_IDS = ['white-tie', 'black-tie', 'cocktail', 'smart-elegant', 'garden-party'];
const featuredCodes = FEATURED_IDS.map(id => dressCodes.find(d => d.id === id)!).filter(Boolean);

const HomePage: React.FC = () => {
  // Pick a random dress code once per page load — both genders shown side by side
  const [heroIdx] = useState(() => Math.floor(Math.random() * HERO_POOL.length));
  const heroCode = dressCodes.find(d => d.id === HERO_POOL[heroIdx].id)!;

  return (
    <div className={styles.page}>

      {/* ── Hero: split layout — text left, photo right ───── */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.heroEyebrow}>European Dress Code Guide</p>
          <h1 className={styles.heroTitle}>Dress<br />perfectly,<br />every time.</h1>
          <p className={styles.heroSub}>17 European dress codes. Every occasion covered — from White Tie galas to Alpine après-ski.</p>
          <div className={styles.heroSearch}>
            <SearchBar />
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroPhotoSplit}>
            <div className={styles.heroPhotoHalf}>
              <img src={heroCode.men.photo} alt={`${heroCode.name} men`} className={styles.heroImg} />
              <div className={styles.heroPhotoTag}>👔 Men</div>
            </div>
            <div className={styles.heroPhotoHalf}>
              <img src={heroCode.women.photo} alt={`${heroCode.name} women`} className={styles.heroImg} />
              <div className={styles.heroPhotoTag}>👗 Women</div>
            </div>
          </div>
          <div className={styles.heroImgLabel}>
            <span className={styles.heroImgIcon}>{heroCode.icon}</span>
            <span className={styles.heroImgName}>{heroCode.name}</span>
          </div>
        </div>
      </div>

      {/* ── Featured horizontal strip ─────────────────── */}
      <section className={styles.featuredSection} aria-label="Featured dress codes">
        <h2 className={styles.featuredHeading}>Featured</h2>
        <div className={styles.featuredScroll}>
          {featuredCodes.map((dc, i) => {
            const photo = i % 2 === 0 ? dc.men.photo : dc.women.photo;
            const genderLabel = i % 2 === 0 ? 'men' : 'women';
            return (
              <Link key={dc.id} to={`/dress-codes/${dc.id}`} className={styles.featuredCard}>
                <img src={photo} alt={`${dc.name} ${genderLabel}`} className={styles.featuredImg} />
                <div className={styles.featuredOverlay}>
                  <span className={styles.featuredIcon}>{dc.icon}</span>
                  <span className={styles.featuredName}>{dc.name}</span>
                  <span className={styles.featuredLabel}>{dc.formalityLabel}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── All codes grouped by formality ───────────── */}
      <section className={styles.allSection} aria-label="All dress codes">
        {FORMALITY_GROUPS.map(group => {
          const items = dressCodes.filter(d => d.formality >= group.min && d.formality <= group.max);
          if (!items.length) return null;
          return (
            <div key={group.label} className={styles.group}>
              <h2 className={styles.groupHeading}>{group.label}</h2>
              <div className={styles.groupList}>
                {items.map(dc => <DressCodeCard key={dc.id} dressCode={dc} />)}
              </div>
            </div>
          );
        })}
      </section>

    </div>
  );
};

export default HomePage;
