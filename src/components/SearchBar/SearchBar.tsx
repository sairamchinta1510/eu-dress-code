import React, { useState, useCallback } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectResult = useCallback((id: string) => {
    onChange('');
    setActiveIndex(-1);
    navigate(`/dress-codes/${id}`);
  }, [onChange, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      selectResult(results[activeIndex].id);
    } else if (e.key === 'Escape') {
      onChange('');
      setActiveIndex(-1);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.input}
          type="search"
          placeholder="Search dress codes, occasions, shoe colour…"
          value={query}
          onChange={(e) => { onChange(e.target.value); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          aria-label="Search dress codes"
          aria-expanded={showDropdown}
          aria-controls="search-results"
          aria-autocomplete="list"
          role="combobox"
          aria-activedescendant={activeIndex >= 0 ? `result-${activeIndex}` : undefined}
        />
        {query && (
          <button className={styles.clear} onClick={() => { onChange(''); setActiveIndex(-1); }} aria-label="Clear search">✕</button>
        )}
      </div>
      {showDropdown && (
        <ul id="search-results" className={styles.dropdown} role="listbox" aria-label="Search results">
          {results.length === 0 && (
            <li className={styles.noResults} role="option" aria-selected={false}>No dress codes found</li>
          )}
          {results.map((d, i) => (
            <li
              key={d.id}
              id={`result-${i}`}
              className={`${styles.result}${i === activeIndex ? ` ${styles.resultActive}` : ''}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => selectResult(d.id)}
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
