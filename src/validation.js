// 登録済み明細をレシート単位にまとめ、{ レシートキー: { date, total } } を返す
// receiptId を持たない旧データは、同じ日付・店名の明細を1枚のレシートとして扱う
function groupByReceipt(entries) {
  const receipts = new Map();
  for (const e of entries) {
    const key = e.receiptId ?? `legacy:${e.date}:${e.store}`;
    const receipt = receipts.get(key) ?? { date: e.date, store: e.store, total: 0 };
    receipt.total += e.amount;
    receipts.set(key, receipt);
  }
  return [...receipts.values()];
}

// 読み取ったレシートを検証し、警告メッセージの配列を返す（登録自体は止めない）
// receipt: { store, date(読み取れなければnull), items }
export function validateReceipt(receipt, existingEntries) {
  const warnings = [];

  // 金額が負の値の明細
  for (const item of receipt.items) {
    if (item.amount < 0) {
      warnings.push(
        `「${item.name}」の金額が負の値です（-¥${Math.abs(item.amount).toLocaleString()}）。` +
          '値引きでなければ読み取り誤りの可能性があります。'
      );
    }
  }

  // 同一の日付・合計金額のレシートが既にある場合（日付が読み取れた場合のみ判定）
  if (receipt.date) {
    const total = receipt.items.reduce((sum, item) => sum + item.amount, 0);
    const duplicated = groupByReceipt(existingEntries).some(
      (r) => r.date === receipt.date && r.total === total
    );
    if (duplicated) {
      warnings.push(
        `同じ日付（${receipt.date}）・合計金額（¥${total.toLocaleString()}）のレシートが` +
          '既に登録されています。重複登録の可能性があります。'
      );
    }
  }

  return warnings;
}
