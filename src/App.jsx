import Charts from './components/Charts.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import Uploader from './components/Uploader.jsx';
import { useLocalStorage } from './useLocalStorage.js';

// 今日の日付を YYYY-MM-DD で返す（レシートに日付がない場合の代替）
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function App() {
  // 明細データはローカルストレージに保存される
  const [entries, setEntries] = useLocalStorage('kakeibo-entries', []);

  // 読み取り結果を明細として追加する
  function handleAnalyzed({ store, date, items }) {
    const receiptDate = date || today();
    const added = items.map((item) => ({
      id: crypto.randomUUID(),
      date: receiptDate,
      store,
      ...item,
    }));
    setEntries((prev) => [...prev, ...added]);
  }

  function handleChangeCategory(id, category) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, category } : e)));
  }

  function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <main className="container">
      <h1>レシート家計簿</h1>
      <Uploader onAnalyzed={handleAnalyzed} />
      <Charts entries={entries} />
      <ExpenseList
        entries={entries}
        onChangeCategory={handleChangeCategory}
        onDelete={handleDelete}
      />
    </main>
  );
}
