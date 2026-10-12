import { CATEGORIES } from '../categories.js';

// 登録済みの明細一覧（カテゴリの修正・削除が可能）
export default function ExpenseList({ entries, onChangeCategory, onDelete, onDeleteAll }) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  // 重複相手がまだ残っている明細（2番目に登録された側）を太字にする
  const ids = new Set(entries.map((e) => e.id));
  const isDuplicate = (e) => Boolean(e.duplicateOf) && ids.has(e.duplicateOf);

  // 全削除は取り消せないため、確認してから実行する
  function handleDeleteAll() {
    if (window.confirm(`明細${entries.length}件をすべて削除します。元に戻せません。よろしいですか？`)) {
      onDeleteAll();
    }
  }

  return (
    <section className="card">
      <h2>明細一覧</h2>
      {sorted.length === 0 ? (
        <p className="empty">まだデータがありません。レシートを読み込んでください。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th>店名</th>
                <th>商品名</th>
                <th className="num">金額</th>
                <th>カテゴリ</th>
                <th>
                  <button className="link" onClick={handleDeleteAll}>
                    全削除
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td className={isDuplicate(e) ? 'dup' : ''}>{e.date}</td>
                  <td className={isDuplicate(e) ? 'dup' : ''}>{e.store}</td>
                  <td className={isDuplicate(e) ? 'dup' : ''}>{e.name}</td>
                  <td className={e.amount < 0 ? 'num negative' : 'num'}>
                    {e.amount < 0 ? '-' : ''}¥{Math.abs(e.amount).toLocaleString()}
                  </td>
                  <td>
                    <select
                      value={e.category}
                      onChange={(ev) => onChangeCategory(e.id, ev.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="link" onClick={() => onDelete(e.id)}>
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
