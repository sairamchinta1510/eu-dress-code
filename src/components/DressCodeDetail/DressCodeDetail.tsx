import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DressCode } from '../../types';
import { dressCodes } from '../../data/dressCodes';
import styles from './DressCodeDetail.module.css';

interface Props {
  dressCode: DressCode;
}

const DressCodeDetail: React.FC<Props> = ({ dressCode }) => {
  const [tab, setTab] = useState<'men' | 'women'>('men');
  const navigate = useNavigate();

  const currentIndex = dressCodes.findIndex((d) => d.id === dressCode.id);
  const prevCode = currentIndex > 0 ? dressCodes[currentIndex - 1] : null;
  const nextCode = currentIndex < dressCodes.length - 1 ? dressCodes[currentIndex + 1] : null;

  const outfit = tab === 'men' ? dressCode.men : dressCode.women;

  return (
    <div className={styles.wrapper}>
      <div className={styles.carousel}>
        <div className={styles.imagePanel}>
          <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="All dress codes">
            ← All Codes
          </button>

          <img
            src={outfit.photo}
            alt={`${dressCode.name} ${tab === 'men' ? 'men' : 'women'} outfit`}
            className={styles.heroImage}
          />

          <div className={styles.imageNav}>
            <button
              className={styles.navBtn}
              onClick={() => prevCode && navigate(`/dress-codes/${prevCode.id}`)}
              disabled={!prevCode}
              aria-label="Previous dress code"
            >
              ‹
            </button>
            <span className={styles.navCounter}>{currentIndex + 1} / {dressCodes.length}</span>
            <button
              className={styles.navBtn}
              onClick={() => nextCode && navigate(`/dress-codes/${nextCode.id}`)}
              disabled={!nextCode}
              aria-label="Next dress code"
            >
              ›
            </button>
          </div>

          <div className={styles.formalityOverlay}>
            <span className={styles.formalityLabel}>{dressCode.formalityLabel}</span>
            <div className={styles.formalityDots}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={i < dressCode.formality ? styles.dotFilled : styles.dotEmpty} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.contentPanel}>
          <div className={styles.contentInner}>
            <div className={styles.titleRow}>
              <span className={styles.titleIcon} aria-hidden="true">{dressCode.icon}</span>
              <h1 className={styles.title}>{dressCode.name}</h1>
            </div>

            <p className={styles.description}>{dressCode.description}</p>

            <div className={styles.occasions}>
              {dressCode.occasions.map((occ) => (
                <span key={occ} className={styles.occasionTag}>{occ}</span>
              ))}
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Select gender">
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

            <h2 className={styles.sectionTitle}>Outfit Breakdown</h2>
            <ul className={styles.outfitList}>
              <li>
                <span className={styles.fieldLabel}>Jacket / Outerwear</span>
                <span className={styles.fieldValue}>{outfit.jacket}</span>
              </li>
              <li>
                <span className={styles.fieldLabel}>Top / Shirt</span>
                <span className={styles.fieldValue}>{outfit.top}</span>
              </li>
              <li>
                <span className={styles.fieldLabel}>Bottom</span>
                <span className={styles.fieldValue}>{outfit.bottom}</span>
              </li>
              <li>
                <span className={styles.fieldLabel}>Accessories</span>
                <span className={styles.fieldValue}>{outfit.accessories.join(', ')}</span>
              </li>
              <li>
                <span className={styles.fieldLabel}>Shoe Type</span>
                <span className={styles.fieldValue}>{outfit.shoeType}</span>
              </li>
              <li className={styles.shoeRow}>
                <span className={styles.fieldLabel}>👟 Shoe Colour</span>
                <span className={styles.shoeColourValue}>{outfit.shoeColour}</span>
              </li>
            </ul>

            <h2 className={styles.sectionTitle}>Do's</h2>
            <ul className={styles.ruleList}>
              {outfit.dos.map((item, i) => (
                <li key={i} className={styles.doItem}>✅ {item}</li>
              ))}
            </ul>

            <h2 className={styles.sectionTitle}>Don'ts</h2>
            <ul className={styles.ruleList}>
              {outfit.donts.map((item, i) => (
                <li key={i} className={styles.dontItem}>❌ {item}</li>
              ))}
            </ul>

            <Link
              to={`/closet?dressCodeId=${dressCode.id}`}
              className={styles.closetBtn}
            >
              🪞 Check My Closet for This Look
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DressCodeDetail;
