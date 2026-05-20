import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { dressCodes } from '../data/dressCodes';
import { useLLMSearch } from '../hooks/useLLMSearch';
import { useGeolocation } from '../hooks/useGeolocation';
import styles from './SearchPage.module.css';

const toShopTerm = (outfit: string) =>
  outfit.split(/,|\bor\b|\band\b/i)[0].trim().replace(/\s{2,}/g, ' ');

const mapsUrl = (term: string, lat?: number, lng?: number) =>
  lat && lng
    ? `https://www.google.com/maps/search/${encodeURIComponent(term)}/@${lat},${lng},14z`
    : `https://www.google.com/maps/search/${encodeURIComponent(term)}+near+me`;

const storeSearchTerm = (formality: number) => {
  if (formality >= 5) return 'formal wear hire tuxedo';
  if (formality === 4) return 'formal wear suits black tie';
  if (formality === 3) return 'cocktail dress menswear suit shop';
  if (formality === 2) return 'smart casual clothing boutique';
  return 'clothing store fashion';
};

const onlineStores = (menTerm: string, womenTerm: string, formality: number) => {
  const list = [
    { name: 'Amazon',  men: `https://www.amazon.com/s?k=${encodeURIComponent(menTerm)}`,          women: `https://www.amazon.com/s?k=${encodeURIComponent(womenTerm)}` },
    { name: 'ASOS',    men: `https://www.asos.com/search/?q=${encodeURIComponent(menTerm)}`,       women: `https://www.asos.com/search/?q=${encodeURIComponent(womenTerm)}` },
    { name: 'Zalando', men: `https://www.zalando.com/catalog/?q=${encodeURIComponent(menTerm)}`,   women: `https://www.zalando.com/catalog/?q=${encodeURIComponent(womenTerm)}` },
  ];
  if (formality <= 2) {
    list.push({ name: 'Zara', men: `https://www.zara.com/ww/en/search?searchTerm=${encodeURIComponent(menTerm)}`, women: `https://www.zara.com/ww/en/search?searchTerm=${encodeURIComponent(womenTerm)}` });
  }
  return list;
};

const SearchPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const coords = useGeolocation();
  const query = params.get('q') ?? '';
  const { results, recommendation, loading, error, search } = useLLMSearch(dressCodes);
  const ranRef = useRef(false);

  // Run search whenever the URL query changes
  useEffect(() => {
    if (query && !ranRef.current) {
      ranRef.current = true;
      search(query);
    }
    if (!query) ranRef.current = false;
  }, [query, search]);

  const handleGoSearch = (newQuery: string) => {
    if (!newQuery.trim()) return;
    ranRef.current = false;
    setParams({ q: newQuery });
  };

  return (
    <div className={styles.page}>
      {/* Search bar at top of results page */}
      <div className={styles.searchHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="Back">←</button>
        <InlineSearchBar initialQuery={query} onSearch={handleGoSearch} />
      </div>

      {query && (
        <p className={styles.queryLabel}>Results for "<strong>{query}</strong>"</p>
      )}

      {loading && (
        <div className={styles.loading}>
          <span className={styles.spinner}>⏳</span> Searching…
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* Matched dress codes */}
      {!loading && results.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Matching Dress Codes</h2>
          <div className={styles.resultsGrid}>
            {results.map(({ dressCode: dc, reason }) => (
              <Link key={dc.id} to={`/dress-codes/${dc.id}`} className={styles.resultCard}>
                <div className={styles.cardPhotos}>
                  <img src={dc.men.photo}   alt={`${dc.name} men`}   className={styles.cardPhoto} />
                  <img src={dc.women.photo} alt={`${dc.name} women`} className={styles.cardPhoto} />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardIcon}>{dc.icon}</span>
                    <div>
                      <div className={styles.cardName}>{dc.name}</div>
                      <div className={styles.cardFormality}>{dc.formalityLabel}</div>
                    </div>
                  </div>
                  {reason && <p className={styles.cardReason}>{reason}</p>}
                  <span className={styles.cardLink}>View Guide →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* AI Recommendation when no existing dress code matches */}
      {!loading && recommendation && results.length === 0 && (() => {
        const menTerm   = toShopTerm(recommendation.menOutfit);
        const womenTerm = toShopTerm(recommendation.womenOutfit);
        const stores    = onlineStores(menTerm, womenTerm, recommendation.formality);
        const mapTerm   = storeSearchTerm(recommendation.formality);
        const gMaps     = mapsUrl(mapTerm, coords?.lat, coords?.lng);

        // Always use Google Image search for AI recommendations — dress code photos
        // are European-only and will never match culture-specific recommendations
        const menImgSearch   = `https://www.google.com/search?q=${encodeURIComponent(recommendation.name + ' men outfit')}&tbm=isch`;
        const womenImgSearch = `https://www.google.com/search?q=${encodeURIComponent(recommendation.name + ' women outfit')}&tbm=isch`;

        return (
          <section className={styles.section}>
            <div className={styles.recBadge}>💡 AI Recommendation</div>
            <h2 className={styles.recName}>{recommendation.name}</h2>
            <p className={styles.recFormality}>{recommendation.formalityLabel}</p>
            <p className={styles.recDescription}>{recommendation.description}</p>
            {recommendation.occasions.length > 0 && (
              <div className={styles.occasions}>
                {recommendation.occasions.map(o => (
                  <span key={o} className={styles.occasionTag}>{o}</span>
                ))}
              </div>
            )}

            {/* Outfit details — real photos when available, image search link as fallback */}
            <div className={styles.outfitSection}>
              <div className={styles.outfitCol}>
                {recommendation.menPhoto
                  ? <img src={recommendation.menPhoto} alt="Men outfit example" className={styles.outfitPhoto} />
                  : (
                    <a
                      href={menImgSearch}
                      target="_blank" rel="noopener noreferrer"
                      className={styles.photoSearchBtn}
                    >
                      🔍 See Men's Outfit Examples
                    </a>
                  )
                }
                <div className={styles.outfitLabel}>👔 Men</div>
                <p className={styles.outfitText}>{recommendation.menOutfit}</p>
              </div>
              <div className={styles.outfitCol}>
                {recommendation.womenPhoto
                  ? <img src={recommendation.womenPhoto} alt="Women outfit example" className={styles.outfitPhoto} />
                  : (
                    <a
                      href={womenImgSearch}
                      target="_blank" rel="noopener noreferrer"
                      className={styles.photoSearchBtn}
                    >
                      🔍 See Women's Outfit Examples
                    </a>
                  )
                }
                <div className={styles.outfitLabel}>👗 Women</div>
                <p className={styles.outfitText}>{recommendation.womenOutfit}</p>
              </div>
            </div>

            {/* Stores near you */}
            <div className={styles.storeSection}>
              <h3 className={styles.storeHeader}>📍 {coords ? 'Stores Near You' : 'Find Nearby Stores'}</h3>
              <a href={gMaps} target="_blank" rel="noopener noreferrer" className={styles.mapsBtn}>
                🗺️ {coords ? 'Open in Google Maps' : 'Search Stores Near Me'}
              </a>
            </div>

            {/* Online retailers */}
            <div className={styles.storeSection}>
              <h3 className={styles.storeHeader}>🛍️ Buy Online</h3>
              <div className={styles.onlineGrid}>
                {stores.map(s => (
                  <div key={s.name} className={styles.onlineRow}>
                    <span className={styles.storeName}>{s.name}</span>
                    <div className={styles.storeLinks}>
                      <a href={s.men}   target="_blank" rel="noopener noreferrer" className={styles.buyBtn}>👔 Men</a>
                      <a href={s.women} target="_blank" rel="noopener noreferrer" className={styles.buyBtn}>👗 Women</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {!loading && !error && !recommendation && results.length === 0 && query && (
        <p className={styles.noResults}>No results found. Try a different query.</p>
      )}
    </div>
  );
};

/** Compact inline search bar used inside the SearchPage header */
const InlineSearchBar: React.FC<{ initialQuery: string; onSearch: (q: string) => void }> = ({ initialQuery, onSearch }) => {
  const [value, setValue] = React.useState(initialQuery);
  useEffect(() => { setValue(initialQuery); }, [initialQuery]);
  return (
    <div className={styles.inlineBar}>
      <input
        className={styles.inlineInput}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSearch(value); }}
        placeholder="Search dress codes or ask anything…"
        aria-label="Search"
      />
      <button className={styles.goBtn} onClick={() => onSearch(value)}>Go</button>
    </div>
  );
};

export default SearchPage;
