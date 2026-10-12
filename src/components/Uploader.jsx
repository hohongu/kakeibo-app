import { useRef, useState } from 'react';
import { fileToBase64Jpeg } from '../imageUtils.js';

// レシート画像のアップロードと解析リクエストを行うコンポーネント
export default function Uploader({ onAnalyzed }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // ドラッグ中かどうか（ドロップ領域のハイライト用）
  const [dragging, setDragging] = useState(false);

  // 選択またはドロップされたファイルを順番に解析する
  async function processFiles(files) {
    if (files.length === 0 || loading) return;

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

  function handleChange(e) {
    processFiles(Array.from(e.target.files ?? []));
  }

  // カード全体をドロップ領域にする（画像以外のファイルは無視する）
  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    processFiles(files);
  }

  return (
    <section
      className={dragging ? 'card dropzone dragging' : 'card dropzone'}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
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
