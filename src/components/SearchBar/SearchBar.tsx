import React from 'react';
import { useNavigate } from 'react-router-dom';
import { dressCodes } from '../../data/dressCodes';
import { useSearch } from '../../hooks/useSearch';
import styles from './SearchBar.module.css';

interface Props {
  query: string;
  onChange: (q: string) => void;
}

const SearchBar: React.FC<Props> = ({ query, onChange }) => {
  const results = useSearch(dressCodes, query);
  const navigate = useNavigate();
  const showDropdown = query.trim().length > 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.input}
          type="search"
          placeholder="Search dress codes, occasions, shoe colour…"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Search dress codes"
        />
        {query && (
          <button className={styles.clear} onClick={() => onChange('')} aria-label="Clear search">✕</button>
        )}
      </div>
      {showDropdown && (
        <ul className={styles.dropdown} role="listbox">
          {results.length === 0 && (
            <li className={styles.noResults}>No dress codes found</li>
          )}
          {results.map((d) => (
            <li
              key={d.id}
              className={styles.result}
              role="option"
              aria-selected={false}
              onClick={() => { onChange(''); navigate(`/dress-codes/${d.id}`); }}
            >
              <span className={styles.resultIcon}>{d.icon}</span>
              <div>
                <div className={styles.resultName}>{d.name}</div>
                <div className={styles.resultSub}>{d.formalityLabel}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
