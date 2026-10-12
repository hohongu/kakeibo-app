import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { CATEGORIES, CATEGORY_COLORS } from '../categories.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// カテゴリ別の集計テーブルと円グラフ
export function CategorySummary({ entries }) {
  if (entries.length === 0) return null;

  // カテゴリ別合計
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  let total = 0;
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    total += e.amount;
  }

  const categories = CATEGORIES.filter((c) => byCategory[c] !== 0);

  const pieData = {
    labels: categories,
    datasets: [
      {
        data: categories.map((c) => byCategory[c]),
        backgroundColor: categories.map((c) => CATEGORY_COLORS[c]),
      },
    ],
  };

  return (
    <section className="card">
      <h2>カテゴリ別集計</h2>
      <div className="chart-row">
        <div className="chart-box pie">
          <Pie data={pieData} options={{ plugins: { legend: { display: false } } }} />
        </div>
        <table className="summary">
          <tbody>
            {categories.map((c) => (
              <tr key={c}>
                <td>
                  <span className="dot" style={{ background: CATEGORY_COLORS[c] }} />
                  {c}
                </td>
                <td className="num">¥{byCategory[c].toLocaleString()}</td>
              </tr>
            ))}
            <tr className="total">
              <td>合計</td>
              <td className="num">¥{total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// 月別の棒グラフ
export function MonthlyChart({ entries }) {
  if (entries.length === 0) return null;

  // 月別合計（YYYY-MM）
  const byMonth = {};
  for (const e of entries) {
    const month = e.date.slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + e.amount;
  }
  const months = Object.keys(byMonth).sort();

  const barData = {
    labels: months,
    datasets: [
      {
        label: '支出合計（円）',
        data: months.map((m) => byMonth[m]),
        backgroundColor: '#2196f3',
      },
    ],
  };

  return (
    <section className="card">
      <h2>月別支出</h2>
      <div className="chart-box wide">
        <Bar data={barData} options={{ plugins: { legend: { display: false } } }} />
      </div>
    </section>
  );
}
