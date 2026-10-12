import { useRef, useState } from 'react';
import { fileToBase64Jpeg } from '../imageUtils.js';

// レシート画像のアップロードと解析リクエストを行うコンポーネント
export default function Uploader({ onAnalyzed }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleChange(e) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setLoading(true);
    setError('');
    const failed = [];

    // 複数枚は1枚ずつ順番に処理する
    for (const file of files) {
      try {
        const image = await fileToBase64Jpeg(file);
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image, mediaType: 'image/jpeg' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '読み取りに失敗しました。');
        onAnalyzed(data, file.name);
      } catch (err) {
        failed.push(`${file.name}: ${err.message}`);
      }
    }

    if (failed.length > 0) setError(failed.join(' / '));
    setLoading(false);
    // 同じファイルを再選択できるように入力をリセットする
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <section className="card">
      <h2>レシートを読み込む</h2>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        disabled={loading}
      />
      {loading && <p className="status">読み取り中…</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
