import { CATEGORIES } from '../categories.js';

// 登録済みの明細一覧（カテゴリの修正・削除が可能）
export default function ExpenseList({ entries, onChangeCategory, onDelete }) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.store}</td>
                  <td>{e.name}</td>
                  <td className="num">¥{e.amount.toLocaleString()}</td>
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
