import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { dressCodes } from '../data/dressCodes';
import { DressCode, AiRecommendation } from '../types';
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

/** A full dress-code detail card matching the DressCodeDetail layout */
const ResultCard: React.FC<{
  dc: DressCode;
  reason?: string;
  coords?: { lat: number; lng: number } | null;
}> = ({ dc, reason, coords }) => {
  const [tab, setTab] = React.useState<'men' | 'women'>('men');
  const outfit = tab === 'men' ? dc.men : dc.women;
  const shops  = shopLinksForCode(dc);
  const mapTerm = storeSearchTerm(dc.formality);
  const gMaps   = mapsUrl(mapTerm, coords?.lat, coords?.lng);
  const shopTerm = tab === 'men'
    ? toShopTerm(dc.men.jacket || dc.men.top || dc.name + ' men outfit')
    : toShopTerm(dc.women.top  || dc.women.jacket || dc.name + ' women outfit');

  return (
    <div className={styles.resultCard}>
      {/* ── Left: photo panel ── */}
      <div className={styles.cardImagePanel}>
        <img
          key={outfit.photo}
          src={outfit.photo}
          alt={`${dc.name} ${tab}`}
          className={styles.cardHeroImg}
        />
        <div className={styles.cardFormalityOverlay}>
          <span className={styles.cardFormalityLabel}>FORMALITY</span>
          <div className={styles.cardDots}>
            {[1,2,3,4,5].map(i => (
              <span key={i} className={i <= dc.formality ? styles.dotFilled : styles.dotEmpty} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: content panel ── */}
      <div className={styles.cardContent}>
        {/* Title row */}
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitleIcon}>{dc.icon}</span>
          <div>
            <h3 className={styles.cardTitle}>{dc.name}</h3>
            <p className={styles.cardFormalityText}>{dc.formalityLabel}</p>
          </div>
          <Link to={`/dress-codes/${dc.id}`} className={styles.cardFullGuideBtn}>Full Guide →</Link>
        </div>

        {/* Occasions */}
        <div className={styles.cardOccasions}>
          {dc.occasions.slice(0, 4).map(o => (
            <span key={o} className={styles.occasionTag}>{o}</span>
          ))}
        </div>

        {/* Men / Women tabs */}
        <div className={styles.cardTabs}>
          <button
            className={`${styles.cardTab} ${tab === 'men' ? styles.cardTabActive : ''}`}
            onClick={() => setTab('men')}
          >👔 Men</button>
          <button
            className={`${styles.cardTab} ${tab === 'women' ? styles.cardTabActive : ''}`}
            onClick={() => setTab('women')}
          >👗 Women</button>
        </div>

        {/* Outfit breakdown */}
        <p className={styles.outfitBreakdownLabel}>OUTFIT BREAKDOWN</p>
        <ul className={styles.outfitList}>
          {outfit.jacket && (
            <li className={styles.outfitItem}>
              <span className={styles.fieldLabel}>JACKET / OUTERWEAR</span>
              <span className={styles.fieldValue}>{outfit.jacket}</span>
            </li>
          )}
          {outfit.top && (
            <li className={styles.outfitItem}>
              <span className={styles.fieldLabel}>TOP / SHIRT</span>
              <span className={styles.fieldValue}>{outfit.top}</span>
            </li>
          )}
          {outfit.bottom && (
            <li className={styles.outfitItem}>
              <span className={styles.fieldLabel}>BOTTOM</span>
              <span className={styles.fieldValue}>{outfit.bottom}</span>
            </li>
          )}
          {outfit.accessories.length > 0 && (
            <li className={styles.outfitItem}>
              <span className={styles.fieldLabel}>ACCESSORIES</span>
              <span className={styles.fieldValue}>{outfit.accessories.join(', ')}</span>
            </li>
          )}
          {outfit.shoeType && (
            <li className={styles.outfitItem}>
              <span className={styles.fieldLabel}>SHOE TYPE</span>
              <span className={styles.fieldValue}>{outfit.shoeType}</span>
            </li>
          )}
          {outfit.shoeColour && (
            <li className={`${styles.outfitItem} ${styles.shoeRow}`}>
              <span className={styles.fieldLabel}>👟 SHOE COLOUR</span>
              <span className={styles.shoeColourValue}>{outfit.shoeColour}</span>
            </li>
          )}
        </ul>

        {/* Shopping links */}
        <div className={styles.cardShops}>
          <a href={gMaps} target="_blank" rel="noopener noreferrer" className={styles.cardMapsBtn}>
            📍 {coords ? 'Stores Near You' : 'Find Stores'}
          </a>
          <div className={styles.cardShopGrid}>
            {shops.map(s => (
              <a
                key={s.name}
                href={tab === 'men' ? s.men : s.women}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shopStoreBtn}
              >
                {s.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Full AI recommendation card — same layout as ResultCard, photo placeholder when no Pexels photo */
const RecommendationCard: React.FC<{
  rec: AiRecommendation;
  coords?: { lat: number; lng: number } | null;
}> = ({ rec, coords }) => {
  const [tab, setTab] = React.useState<'men' | 'women'>('men');
  const photoUrl    = tab === 'men' ? rec.menPhoto    : rec.womenPhoto;
  const searchTerm  = tab === 'men'
    ? (rec.menPhotoSearch   || toShopTerm(rec.menOutfit)   + ' fashion')
    : (rec.womenPhotoSearch || toShopTerm(rec.womenOutfit) + ' fashion');
  const outfitText  = tab === 'men' ? rec.menOutfit : rec.womenOutfit;
  const googleImagesUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}&tbm=isch`;
  const menTerm   = toShopTerm(rec.menOutfit   || rec.name + ' men outfit');
  const womenTerm = toShopTerm(rec.womenOutfit || rec.name + ' women outfit');
  const stores = onlineStores(menTerm, womenTerm, rec.formality);
  const gMaps  = mapsUrl(storeSearchTerm(rec.formality), coords?.lat, coords?.lng);

  return (
    <div className={styles.resultCard}>
      {/* ── Left: photo or placeholder ── */}
      <div className={styles.cardImagePanel}>
        {photoUrl ? (
          <img src={photoUrl} alt={`${rec.name} ${tab}`} className={styles.cardHeroImg} />
        ) : (
          <a href={googleImagesUrl} target="_blank" rel="noopener noreferrer" className={styles.photoPlaceholder}>
            <span className={styles.photoPlaceholderIcon}>{tab === 'men' ? '👔' : '👗'}</span>
            <span className={styles.photoPlaceholderText}>Browse outfit inspiration</span>
            <span className={styles.photoPlaceholderQuery}>🔍 {searchTerm}</span>
          </a>
        )}
        <div className={styles.cardFormalityOverlay}>
          <span className={styles.cardFormalityLabel}>FORMALITY</span>
          <div className={styles.cardDots}>
            {[1,2,3,4,5].map(i => (
              <span key={i} className={i <= rec.formality ? styles.dotFilled : styles.dotEmpty} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: content ── */}
      <div className={styles.cardContent}>
        <div className={styles.cardTitleRow}>
          <div style={{ flex: 1 }}>
            <h3 className={styles.cardTitle}>{rec.name}</h3>
            <p className={styles.cardFormalityText}>{rec.formalityLabel}</p>
          </div>
          <span className={styles.aiBadge}>💡 AI</span>
        </div>

        <p className={styles.recDescText}>{rec.description}</p>

        {rec.occasions.length > 0 && (
          <div className={styles.cardOccasions}>
            {rec.occasions.slice(0, 4).map(o => (
              <span key={o} className={styles.occasionTag}>{o}</span>
            ))}
          </div>
        )}

        {/* Men / Women tabs */}
        <div className={styles.cardTabs}>
          <button className={`${styles.cardTab} ${tab === 'men' ? styles.cardTabActive : ''}`} onClick={() => setTab('men')}>👔 Men</button>
          <button className={`${styles.cardTab} ${tab === 'women' ? styles.cardTabActive : ''}`} onClick={() => setTab('women')}>👗 Women</button>
        </div>

        <p className={styles.outfitBreakdownLabel}>OUTFIT</p>
        <p className={styles.recOutfitText}>{outfitText}</p>

        {/* Shopping */}
        <div className={styles.cardShops}>
          <a href={gMaps} target="_blank" rel="noopener noreferrer" className={styles.cardMapsBtn}>
            📍 {coords ? 'Stores Near You' : 'Find Stores'}
          </a>
          <div className={styles.cardShopGrid}>
            {stores.map(s => (
              <a key={s.name} href={tab === 'men' ? s.men : s.women} target="_blank" rel="noopener noreferrer" className={styles.shopStoreBtn}>
                {s.name}
              </a>
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

  // (relatedCodes removed — AI recommendation now shown as its own card)

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

      {/* ── AI recommendation ── */}
      {!loading && recommendation && results.length === 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>AI Recommendation</h2>
          <RecommendationCard rec={recommendation} coords={coords} />
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
