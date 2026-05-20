import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dressCodes } from '../../data/dressCodes';
import { useLLMSearch } from '../../hooks/useLLMSearch';
import { useGeolocation } from '../../hooks/useGeolocation';
import styles from './SearchBar.module.css';

/** Extract the first key item from an outfit description for Amazon search */
const toShopTerm = (outfit: string) =>
  outfit.split(/,|\bor\b|\band\b/i)[0].trim().replace(/\s{2,}/g, ' ');

/** Google Maps stores near coordinates */
const mapsStoreUrl = (term: string, lat: number, lng: number) =>
  `https://www.google.com/maps/search/${encodeURIComponent(term)}/@${lat},${lng},14z`;

/** Generic Google Maps store search (no coords) */
const mapsStoreUrlGeneric = (term: string) =>
  `https://www.google.com/maps/search/${encodeURIComponent(term)}+near+me`;

/** Formality → Google Maps clothing store search term */
const storeSearchTerm = (formality: number) => {
  if (formality >= 5) return 'formal wear hire tuxedo';
  if (formality === 4) return 'formal wear suits black tie';
  if (formality === 3) return 'cocktail dress menswear suit shop';
  if (formality === 2) return 'smart casual clothing boutique';
  return 'clothing store fashion';
};

/** Online retailers by formality */
const onlineStores = (menTerm: string, womenTerm: string, formality: number) => {
  const stores = [
    { name: 'Amazon', men: `https://www.amazon.com/s?k=${encodeURIComponent(menTerm)}`, women: `https://www.amazon.com/s?k=${encodeURIComponent(womenTerm)}` },
    { name: 'ASOS',   men: `https://www.asos.com/search/?q=${encodeURIComponent(menTerm)}`, women: `https://www.asos.com/search/?q=${encodeURIComponent(womenTerm)}` },
    { name: 'Zalando', men: `https://www.zalando.com/catalog/?q=${encodeURIComponent(menTerm)}`, women: `https://www.zalando.com/catalog/?q=${encodeURIComponent(womenTerm)}` },
  ];
  if (formality <= 2) {
    stores.push({ name: 'Zara', men: `https://www.zara.com/ww/en/search?searchTerm=${encodeURIComponent(menTerm)}`, women: `https://www.zara.com/ww/en/search?searchTerm=${encodeURIComponent(womenTerm)}` });
  }
  return stores;
};

const SearchBar: React.FC = () => {
  const { results, recommendation, loading, error, search } = useLLMSearch(dressCodes);
  const coords = useGeolocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const showDropdown = query.trim().length > 0;

  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  const selectResult = useCallback((id: string) => {
    setQuery('');
    setActiveIndex(-1);
    search('');
    navigate(`/dress-codes/${id}`);
  }, [navigate, search]);

  const navigateToSearch = useCallback((q: string) => {
    if (q.trim()) {
      setQuery('');
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  }, [navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        selectResult(results[activeIndex].dressCode.id);
      } else {
        navigateToSearch(query);
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
  }, [query, results, search, activeIndex, selectResult, navigateToSearch]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        {loading ? (
          <span className={styles.spinner} role="status" aria-label="Searching…">⏳</span>
        ) : (
          <button
            className={styles.searchIcon}
            onClick={() => navigateToSearch(query)}
            aria-label="Search"
          >🔍</button>
        )}
        <input
          className={styles.input}
          type="search"
          placeholder="e.g. what to wear to a Monaco gala or a Bavarian wedding?"
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
          {loading && (
            <li className={styles.noResults} role="option" aria-selected={false}>Searching…</li>
          )}
          {error && (
            <li className={styles.errorMsg} role="option" aria-selected={false}>{error}</li>
          )}
          {!error && results.length === 0 && !loading && !recommendation && (
            <li className={styles.noResults} role="option" aria-selected={false}>No matching dress codes found</li>
          )}
          {!error && !loading && recommendation && results.length === 0 && (() => {
            const sampleCode =
              dressCodes.find(d => d.formality === recommendation.formality) ??
              dressCodes.find(d => d.formality === recommendation.formality + 1) ??
              dressCodes.find(d => d.formality === recommendation.formality - 1) ??
              dressCodes[0];
            const menTerm = toShopTerm(recommendation.menOutfit);
            const womenTerm = toShopTerm(recommendation.womenOutfit);
            const mapsTerm = storeSearchTerm(recommendation.formality);
            const mapsUrl = coords
              ? mapsStoreUrl(mapsTerm, coords.lat, coords.lng)
              : mapsStoreUrlGeneric(mapsTerm);
            const stores = onlineStores(menTerm, womenTerm, recommendation.formality);

            return (
              <li className={styles.recommendation} role="option" aria-selected={false}>
                <div className={styles.recHeader}>💡 AI Recommendation</div>
                <div className={styles.recName}>{recommendation.name}</div>
                <div className={styles.recFormality}>{recommendation.formalityLabel}</div>
                <p className={styles.recDescription}>{recommendation.description}</p>
                {recommendation.occasions.length > 0 && (
                  <p className={styles.recOccasions}>📅 {recommendation.occasions.join(' · ')}</p>
                )}

                {/* Sample photos */}
                <div className={styles.recPhotos}>
                  <div className={styles.recPhotoCol}>
                    <img src={sampleCode.men.photo} alt="Men sample" className={styles.recPhoto} />
                    <span className={styles.recPhotoLabel}>👔 Men</span>
                  </div>
                  <div className={styles.recPhotoCol}>
                    <img src={sampleCode.women.photo} alt="Women sample" className={styles.recPhoto} />
                    <span className={styles.recPhotoLabel}>👗 Women</span>
                  </div>
                </div>

                {/* Outfit descriptions */}
                <div className={styles.recOutfits}>
                  <p className={styles.recOutfitText}>👔 {recommendation.menOutfit}</p>
                  <p className={styles.recOutfitText}>👗 {recommendation.womenOutfit}</p>
                </div>

                {/* Nearby stores */}
                <div className={styles.recStoresSection}>
                  <div className={styles.recStoresHeader}>
                    📍 {coords ? 'Stores Near You' : 'Find Nearby Stores'}
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.recMapsBtn}
                  >
                    {coords ? '🗺️ Open in Google Maps' : '🗺️ Search Stores Near Me'}
                  </a>
                </div>

                {/* Online retailers */}
                <div className={styles.recStoresSection}>
                  <div className={styles.recStoresHeader}>🛍️ Buy Online</div>
                  <div className={styles.recOnlineGrid}>
                    {stores.map(s => (
                      <div key={s.name} className={styles.recOnlineStore}>
                        <span className={styles.recStoreName}>{s.name}</span>
                        <div className={styles.recStoreLinks}>
                          <a href={s.men} target="_blank" rel="noopener noreferrer" className={styles.recBuyBtn}>👔 Men</a>
                          <a href={s.women} target="_blank" rel="noopener noreferrer" className={styles.recBuyBtn}>👗 Women</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            );
          })()}
          {!error && !loading && results.map(({ dressCode: d, reason }, i) => (
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
