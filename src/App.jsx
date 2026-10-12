import { useRef, useState } from 'react';
import Charts from './components/Charts.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import Uploader from './components/Uploader.jsx';
import { useLocalStorage } from './useLocalStorage.js';
import { recheckReceipt, validateReceipt } from './validation.js';

// 今日の日付を YYYY-MM-DD で返す（レシートに日付がない場合の代替）
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function App() {
  // 明細データはローカルストレージに保存される
  const [entries, setEntries] = useLocalStorage('kakeibo-entries', []);
  // 検証で見つかった警告 [{ id, fileName, receiptId, date, messages, targetIds, resolved }]
  const [warnings, setWarnings] = useState([]);

  // 複数枚を続けて処理しても最新の明細で重複判定できるよう、refで保持する
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  // 読み取り結果を検証し、明細として追加する（警告があっても登録はする）
  function handleAnalyzed({ store, date, items }, fileName) {
    const receiptId = crypto.randomUUID();
    const { warnings: messages, targetIds } = validateReceipt(
      { store, date, items },
      entriesRef.current
    );
    if (messages.length > 0) {
      // date は読み取り結果のまま（null可）を保持し、再確認でも同じ条件で判定する
      // targetIds は重複していた登録済み明細のID（一部削除後の再確認に使う）
      setWarnings((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          fileName,
          receiptId,
          date,
          messages,
          targetIds,
          resolved: false,
        },
      ]);
    }

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

  // 重複を削除した後などに、現在の明細で警告を再判定する
  function handleRecheck(warning) {
    const own = entries.filter((e) => e.receiptId === warning.receiptId);
    const others = entries.filter((e) => e.receiptId !== warning.receiptId);
    const receipt = {
      store: own[0]?.store ?? '',
      date: warning.date,
      items: own.map(({ name, amount, category }) => ({ name, amount, category })),
    };
    const result = recheckReceipt(receipt, others, warning.targetIds ?? []);

    setWarnings((prev) =>
      prev.map((w) =>
        w.id !== warning.id
          ? w
          : result.warnings.length > 0
            ? { ...w, messages: result.warnings, targetIds: result.targetIds, resolved: false }
            : { ...w, resolved: true }
      )
    );
  }

  function dismissWarning(id) {
    setWarnings((prev) => prev.filter((w) => w.id !== id));
  }

  return (
    <main className="container">
      <h1>レシート家計簿</h1>
      <Uploader onAnalyzed={handleAnalyzed} />

      {warnings.map((w) => (
        <div key={w.id} className={w.resolved ? 'warning resolved' : 'warning'} role="alert">
          <div className="warning-body">
            <strong>{w.resolved ? '✓' : '⚠'} {w.fileName}</strong>
            {w.resolved ? (
              <p>警告の原因は解消されています。</p>
            ) : (
              <ul>
                {w.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="warning-actions">
            {!w.resolved && (
              <button className="recheck" onClick={() => handleRecheck(w)}>
                再確認
              </button>
            )}
            <button className="link" onClick={() => dismissWarning(w.id)}>
              閉じる
            </button>
          </div>
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
