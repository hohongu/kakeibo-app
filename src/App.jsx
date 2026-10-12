import { useRef, useState } from 'react';
import Charts from './components/Charts.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import Uploader from './components/Uploader.jsx';
import { useLocalStorage } from './useLocalStorage.js';
import { validateReceipt } from './validation.js';

// 今日の日付を YYYY-MM-DD で返す（レシートに日付がない場合の代替）
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function App() {
  // 明細データはローカルストレージに保存される
  const [entries, setEntries] = useLocalStorage('kakeibo-entries', []);
  // 検証で見つかった警告 [{ id, fileName, messages }]
  const [warnings, setWarnings] = useState([]);

  // 複数枚を続けて処理しても最新の明細で重複判定できるよう、refで保持する
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  // 読み取り結果を検証し、明細として追加する（警告があっても登録はする）
  function handleAnalyzed({ store, date, items }, fileName) {
    const messages = validateReceipt({ store, date, items }, entriesRef.current);
    if (messages.length > 0) {
      setWarnings((prev) => [...prev, { id: crypto.randomUUID(), fileName, messages }]);
    }

    const receiptId = crypto.randomUUID();
    const receiptDate = date || today();
    const added = items.map((item) => ({
      id: crypto.randomUUID(),
      receiptId,
      date: receiptDate,
      store,
      ...item,
    }));
    entriesRef.current = [...entriesRef.current, ...added];
    setEntries(entriesRef.current);
  }

  function handleChangeCategory(id, category) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, category } : e)));
  }

  function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function dismissWarning(id) {
    setWarnings((prev) => prev.filter((w) => w.id !== id));
  }

  return (
    <main className="container">
      <h1>レシート家計簿</h1>
      <Uploader onAnalyzed={handleAnalyzed} />

      {warnings.map((w) => (
        <div key={w.id} className="warning" role="alert">
          <div className="warning-body">
            <strong>⚠ {w.fileName}</strong>
            <ul>
              {w.messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
          <button className="link" onClick={() => dismissWarning(w.id)}>
            閉じる
          </button>
        </div>
      ))}

      <Charts entries={entries} />
      <ExpenseList
        entries={entries}
        onChangeCategory={handleChangeCategory}
        onDelete={handleDelete}
      />
    </main>
  );
}
