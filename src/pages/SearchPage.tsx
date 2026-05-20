import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { dressCodes } from '../data/dressCodes';
import { DressCode } from '../types';
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

/** Shopping links for a dress code based on its outfit data */
const shopLinksForCode = (dc: DressCode) => {
  const menTerm   = toShopTerm(dc.men.jacket   || dc.men.top    || dc.name + ' men outfit');
  const womenTerm = toShopTerm(dc.women.top     || dc.women.jacket || dc.name + ' women outfit');
  return onlineStores(menTerm, womenTerm, dc.formality);
};

/** A dress code result card with photos + shopping links */
const ResultCard: React.FC<{
  dc: DressCode;
  reason?: string;
  coords?: { lat: number; lng: number } | null;
}> = ({ dc, reason, coords }) => {
  const shops    = shopLinksForCode(dc);
  const mapTerm  = storeSearchTerm(dc.formality);
  const gMaps    = mapsUrl(mapTerm, coords?.lat, coords?.lng);

  return (
    <div className={styles.resultCard}>
      <Link to={`/dress-codes/${dc.id}`} className={styles.cardPhotoLink}>
        <div className={styles.cardPhotos}>
          <img src={dc.men.photo}   alt={`${dc.name} men`}   className={styles.cardPhoto} />
          <img src={dc.women.photo} alt={`${dc.name} women`} className={styles.cardPhoto} />
        </div>
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.cardIcon}>{dc.icon}</span>
          <div>
            <div className={styles.cardName}>{dc.name}</div>
            <div className={styles.cardFormality}>{dc.formalityLabel}</div>
          </div>
        </div>
        {reason && <p className={styles.cardReason}>{reason}</p>}
        <Link to={`/dress-codes/${dc.id}`} className={styles.cardLink}>View Full Guide →</Link>

        {/* Shopping links */}
        <div className={styles.cardShops}>
          <a href={gMaps} target="_blank" rel="noopener noreferrer" className={styles.cardMapsBtn}>
            📍 {coords ? 'Stores Near You' : 'Find Stores'}
          </a>
          <div className={styles.cardShopGrid}>
            {shops.map(s => (
              <div key={s.name} className={styles.cardShopRow}>
                <span className={styles.cardShopName}>{s.name}</span>
                <div className={styles.cardShopLinks}>
                  <a href={s.men}   target="_blank" rel="noopener noreferrer" className={styles.buyBtn}>👔 Men</a>
                  <a href={s.women} target="_blank" rel="noopener noreferrer" className={styles.buyBtn}>👗 Women</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SearchPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const coords = useGeolocation();
  const query = params.get('q') ?? '';
  const { results, recommendation, loading, error, search } = useLLMSearch(dressCodes);
  const ranRef = useRef(false);

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

  // When the AI returns a recommendation but no direct matches, find real dress
  // codes at the same (or adjacent) formality level to show as concrete cards.
  const relatedCodes = React.useMemo(() => {
    if (!recommendation || results.length > 0) return [];
    const exact = dressCodes.filter(d => d.formality === recommendation.formality);
    if (exact.length) return exact;
    return dressCodes.filter(d => Math.abs(d.formality - recommendation.formality) <= 1);
  }, [recommendation, results]);

  return (
    <div className={styles.page}>
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

      {/* ── Direct matches ── */}
      {!loading && results.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Matching Dress Codes</h2>
          <div className={styles.resultsGrid}>
            {results.map(({ dressCode: dc, reason }) => (
              <ResultCard key={dc.id} dc={dc} reason={reason} coords={coords} />
            ))}
          </div>
        </section>
      )}

      {/* ── AI recommendation + related real dress codes ── */}
      {!loading && recommendation && results.length === 0 && (
        <section className={styles.section}>
          {/* Context banner */}
          <div className={styles.recBanner}>
            <span className={styles.recBadge}>💡 AI Recommendation</span>
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
            <div className={styles.recOutfitHint}>
              <span>👔 {recommendation.menOutfit}</span>
              <span>👗 {recommendation.womenOutfit}</span>
            </div>
          </div>

          {/* Real dress code cards at matching formality */}
          {relatedCodes.length > 0 && (
            <>
              <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}>
                Closest Dress Codes — Shop Now
              </h2>
              <div className={styles.resultsGrid}>
                {relatedCodes.map(dc => (
                  <ResultCard
                    key={dc.id}
                    dc={dc}
                    reason={`Similar formality to ${recommendation.name}`}
                    coords={coords}
                  />
                ))}
              </div>
            </>
          )}

          {/* Store finder for the recommendation itself */}
          {(() => {
            const menTerm  = toShopTerm(recommendation.menOutfit);
            const womenTerm = toShopTerm(recommendation.womenOutfit);
            const stores   = onlineStores(menTerm, womenTerm, recommendation.formality);
            const gMaps    = mapsUrl(storeSearchTerm(recommendation.formality), coords?.lat, coords?.lng);
            return (
              <div className={styles.storeSection} style={{ marginTop: 24 }}>
                <h3 className={styles.storeHeader}>
                  🛍️ Shop "{recommendation.name}" directly
                </h3>
                <a href={gMaps} target="_blank" rel="noopener noreferrer" className={styles.mapsBtn}>
                  🗺️ {coords ? 'Open in Google Maps' : 'Search Stores Near Me'}
                </a>
                <div className={styles.onlineGrid} style={{ marginTop: 10 }}>
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
            );
          })()}
        </section>
      )}

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
