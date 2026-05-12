import React from 'react';
import { Link } from 'react-router-dom';
import { DressCode } from '../../types';
import styles from './DressCodeCard.module.css';

interface Props {
  dressCode: DressCode;
}

const formalityDots = (level: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < level ? styles.dotFilled : styles.dotEmpty} aria-hidden="true" />
  ));

const DressCodeCard: React.FC<Props> = ({ dressCode }) => (
  <Link to={`/dress-codes/${dressCode.id}`} className={styles.card}>
    <div className={styles.iconWrapper}>
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
  </Link>
);

export default DressCodeCard;
