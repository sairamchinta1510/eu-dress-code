import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const BottomNav: React.FC = () => (
  <nav className={styles.nav}>
    <NavLink to="/" end className={({ isActive }) => isActive ? `${styles.tab} active` : styles.tab}>
      <span className={styles.icon}>🏠</span>
      <span className={styles.label}>Home</span>
    </NavLink>
    <NavLink to="/calendar" className={({ isActive }) => isActive ? `${styles.tab} active` : styles.tab}>
      <span className={styles.icon}>📅</span>
      <span className={styles.label}>Calendar</span>
    </NavLink>
    <NavLink to="/closet" className={({ isActive }) => isActive ? `${styles.tab} active` : styles.tab}>
      <span className={styles.icon}>👗</span>
      <span className={styles.label}>Closet</span>
    </NavLink>
  </nav>
);

export default BottomNav;
