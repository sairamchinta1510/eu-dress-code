import React, { useState, useRef } from 'react';
import { dressCodes } from '../../data/dressCodes';
import { ClosetResult } from '../../types';
import styles from './ClosetCheck.module.css';

interface Props {
  initialDressCodeId?: string;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ClosetCheck: React.FC<Props> = ({ initialDressCodeId }) => {
  const [dressCodeId, setDressCodeId] = useState(initialDressCodeId || 'lounge-suit');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ClosetResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleAnalyse = async () => {
    if (!photo) return;
    setLoading(true);
    setError(null);
    try {
      const imageBase64 = await toBase64(photo);
      const res = await fetch('/api/analyze-closet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, dressCodeId }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: ClosetResult = await res.json() as ClosetResult;
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.field}>
        <label htmlFor="dressCodeSelect" className={styles.label}>Target Dress Code</label>
        <select
          id="dressCodeSelect"
          aria-label="Target dress code"
          className={styles.select}
          value={dressCodeId}
          onChange={(e) => setDressCodeId(e.target.value)}
        >
          {dressCodes.map((dc) => (
            <option key={dc.id} value={dc.id}>{dc.icon} {dc.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.photoSection}>
        {preview ? (
          <div className={styles.previewWrapper}>
            <img src={preview} alt="Closet preview" className={styles.preview} />
            <button
              className={styles.changeBtn}
              onClick={() => { setPhoto(null); setPreview(null); setResult(null); }}
            >
              Change Photo
            </button>
          </div>
        ) : (
          <button className={styles.uploadBtn} onClick={() => inputRef.current?.click()}>
            <span className={styles.uploadIcon} aria-hidden="true">📷</span>
            <span>Upload Closet Photo</span>
          </button>
        )}
        <input
          data-testid="photo-input"
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className={styles.hiddenInput}
          aria-label="Upload closet photo"
        />
      </div>

      <button
        className={styles.analyseBtn}
        onClick={handleAnalyse}
        disabled={!photo || loading}
        aria-label="Analyse my closet"
      >
        {loading ? 'Analysing…' : '🔍 Analyse My Closet'}
      </button>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {result && (
        <div className={styles.results} aria-label="Analysis results">
          {result.found.length > 0 && (
            <div className={styles.resultSection}>
              <h3 className={styles.resultTitle}>✅ You Have</h3>
              <ul className={styles.resultList}>
                {result.found.map((item, i) => (
                  <li key={i} className={styles.foundItem}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {result.missing.length > 0 && (
            <div className={styles.resultSection}>
              <h3 className={styles.resultTitle}>❌ Missing</h3>
              <ul className={styles.resultList}>
                {result.missing.map((item, i) => (
                  <li key={i} className={styles.missingItem}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {result.suggestions.length > 0 && (
            <div className={styles.resultSection}>
              <h3 className={styles.resultTitle}>🛍️ Suggested Purchases</h3>
              <ul className={styles.resultList}>
                {result.suggestions.map((item, i) => (
                  <li key={i} className={styles.suggestionItem}>
                    <span>{item}</span>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(item + ' buy')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.shopLink}
                    >
                      Search →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClosetCheck;
