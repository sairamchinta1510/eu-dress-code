import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dressCodes } from '../../data/dressCodes';
import { useLLMSearch } from '../../hooks/useLLMSearch';
import styles from './SearchBar.module.css';

const SearchBar: React.FC = () => {
  const { results, loading, error, search } = useLLMSearch(dressCodes);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const showDropdown = query.trim().length > 0;

  const selectResult = useCallback((id: string) => {
    setQuery('');
    setActiveIndex(-1);
    search('');
    navigate(`/dress-codes/${id}`);
  }, [navigate, search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        selectResult(results[activeIndex].dressCode.id);
      } else {
        search(query);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setQuery('');
      setActiveIndex(-1);
      search('');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        {loading ? (
          <span className={styles.spinner} role="status" aria-label="Searching…">⏳</span>
        ) : (
          <button
            className={styles.searchIcon}
            onClick={() => search(query)}
            aria-label="Search"
            tabIndex={-1}
          >🔍</button>
        )}
        <input
          className={styles.input}
          type="search"
          placeholder="Ask anything — e.g. something for a rainy outdoor lunch"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          aria-label="Search dress codes"
          aria-expanded={showDropdown}
          aria-controls="search-results"
          aria-autocomplete="list"
          role="combobox"
          aria-activedescendant={activeIndex >= 0 ? `result-${activeIndex}` : undefined}
        />
        {query && (
          <button
            className={styles.clear}
            onClick={() => { setQuery(''); setActiveIndex(-1); search(''); }}
            aria-label="Clear search"
          >✕</button>
        )}
      </div>
      {showDropdown && (
        <ul id="search-results" className={styles.dropdown} role="listbox" aria-label="Search results">
          {error && (
            <li className={styles.errorMsg} role="option" aria-selected={false}>{error}</li>
          )}
          {!error && results.length === 0 && !loading && (
            <li className={styles.noResults} role="option" aria-selected={false}>No dress codes found</li>
          )}
          {!error && results.map(({ dressCode: d, reason }, i) => (
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
                {reason ? (
                  <div className={styles.reason}>{reason}</div>
                ) : (
                  <div className={styles.resultSub}>{d.formalityLabel}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
