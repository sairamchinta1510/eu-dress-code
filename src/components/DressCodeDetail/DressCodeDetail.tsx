import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DressCode, OutfitDetail } from '../../types';
import styles from './DressCodeDetail.module.css';

interface Props {
  dressCode: DressCode;
}

const OutfitView: React.FC<{ outfit: OutfitDetail; gender: 'men' | 'women' }> = ({ outfit, gender }) => (
  <div className={styles.outfit}>
    <div className={styles.photoWrapper}>
      <img
        src={outfit.photo}
        alt={`${gender === 'men' ? 'Man' : 'Woman'} wearing the dress code`}
        className={styles.photo}
        loading="lazy"
      />
    </div>
    <div className={styles.details}>
      <h3 className={styles.sectionTitle}>Outfit Breakdown</h3>
      <ul className={styles.outfitList}>
        <li><span className={styles.fieldLabel}>Jacket / Outerwear</span><span>{outfit.jacket}</span></li>
        <li><span className={styles.fieldLabel}>Top / Shirt</span><span>{outfit.top}</span></li>
        <li><span className={styles.fieldLabel}>Bottom</span><span>{outfit.bottom}</span></li>
        <li>
          <span className={styles.fieldLabel}>Accessories</span>
          <span>{outfit.accessories.join(', ')}</span>
        </li>
        <li><span className={styles.fieldLabel}>Shoe Type</span><span>{outfit.shoeType}</span></li>
        <li className={styles.shoeColour}>
          <span className={styles.fieldLabel}>👟 Shoe Colour</span>
          <span className={styles.shoeColourValue}>{outfit.shoeColour}</span>
        </li>
      </ul>

      <h3 className={styles.sectionTitle}>Do's &amp; Don'ts</h3>
      <ul className={styles.doList}>
        {outfit.dos.map((item, i) => (
          <li key={i} className={styles.doItem}>✅ {item}</li>
        ))}
      </ul>
      <ul className={styles.dontList}>
        {outfit.donts.map((item, i) => (
          <li key={i} className={styles.dontItem}>❌ {item}</li>
        ))}
      </ul>
    </div>
  </div>
);

const DressCodeDetail: React.FC<Props> = ({ dressCode }) => {
  const [tab, setTab] = useState<'men' | 'women'>('men');
  const navigate = useNavigate();

  return (
    <div className={styles.wrapper}>
      <button className={styles.back} onClick={() => navigate(-1)} aria-label="Go back">← Back</button>

      <div className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">{dressCode.icon}</span>
        <div>
          <h1 className={styles.name}>{dressCode.name}</h1>
          <span className={styles.formalityBadge}>{dressCode.formalityLabel}</span>
        </div>
      </div>

      <p className={styles.description}>{dressCode.description}</p>

      <div className={styles.occasions} aria-label="Occasions">
        {dressCode.occasions.map((occ) => (
          <span key={occ} className={styles.occasionTag}>{occ}</span>
        ))}
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Gender">
        <button
          role="tab"
          aria-selected={tab === 'men'}
          className={tab === 'men' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setTab('men')}
        >
          👔 Men
        </button>
        <button
          role="tab"
          aria-selected={tab === 'women'}
          className={tab === 'women' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setTab('women')}
        >
          👗 Women
        </button>
      </div>

      <OutfitView outfit={tab === 'men' ? dressCode.men : dressCode.women} gender={tab} />
    </div>
  );
};

export default DressCodeDetail;
