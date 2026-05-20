import React from 'react';
import { Link } from 'react-router-dom';
import { DressCode } from '../../types';
import styles from './DressCodeCard.module.css';

interface Props {
  dressCode: DressCode;
}

function formalityBadge(level: number): { label: string; cls: string } {
  if (level >= 4) return { label: 'Formal', cls: styles.badgeFormal };
  if (level === 3) return { label: 'Semi', cls: styles.badgeSemi };
  return { label: 'Casual', cls: styles.badgeCasual };
}

const formalityDots = (level: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < level ? styles.dotFilled : styles.dotEmpty} aria-hidden="true" />
  ));

const DressCodeCard: React.FC<Props> = ({ dressCode }) => {
  const badge = formalityBadge(dressCode.formality);
  return (
    <Link to={`/dress-codes/${dressCode.id}`} className={styles.card}>
      {/* Split photo thumbnail — men left, women right */}
      <div className={styles.thumb}>
        <img
          src={dressCode.men.photo}
          alt={`${dressCode.name} men`}
          className={`${styles.thumbImg} ${styles.thumbLeft}`}
          loading="lazy"
        />
        <img
          src={dressCode.women.photo}
          alt={`${dressCode.name} women`}
          className={`${styles.thumbImg} ${styles.thumbRight}`}
          loading="lazy"
        />
      </div>

      <div className={styles.body}>
        <div className={styles.nameRow}>
          <span className={styles.icon} aria-hidden="true">{dressCode.icon}</span>
          <h3 className={styles.name}>{dressCode.name}</h3>
        </div>
        <div className={styles.dots} aria-label={`Formality: ${dressCode.formality} out of 5`}>
          {formalityDots(dressCode.formality)}
        </div>
        <p className={styles.occasion}>{dressCode.occasions[0]}</p>
      </div>

      <span className={`${styles.badge} ${badge.cls}`}>{badge.label}</span>
    </Link>
  );
};

export default DressCodeCard;
