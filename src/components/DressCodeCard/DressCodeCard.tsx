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

function iconWrapClass(level: number): string {
  if (level >= 4) return `${styles.iconWrapper} ${styles.iconFormal}`;
  if (level === 3) return `${styles.iconWrapper} ${styles.iconSemi}`;
  return `${styles.iconWrapper} ${styles.iconCasual}`;
}

const formalityDots = (level: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < level ? styles.dotFilled : styles.dotEmpty} aria-hidden="true" />
  ));

const DressCodeCard: React.FC<Props> = ({ dressCode }) => {
  const badge = formalityBadge(dressCode.formality);
  return (
    <Link to={`/dress-codes/${dressCode.id}`} className={styles.card}>
      <div className={iconWrapClass(dressCode.formality)}>
        <span className={styles.icon} aria-hidden="true">{dressCode.icon}</span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{dressCode.name}</h3>
        <p className={styles.label}>{dressCode.formalityLabel}</p>
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
