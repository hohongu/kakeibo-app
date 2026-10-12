// receiptId を持つ登録済み明細をレシート単位にまとめ、[{ date, total }] を返す
function groupByReceipt(entries) {
  const receipts = new Map();
  for (const e of entries) {
    if (!e.receiptId) continue;
    const receipt = receipts.get(e.receiptId) ?? { date: e.date, total: 0 };
    receipt.total += e.amount;
    receipts.set(e.receiptId, receipt);
  }
  return [...receipts.values()];
}

// 金額ごとの出現回数を数える
function countAmounts(amounts) {
  const counts = new Map();
  for (const a of amounts) counts.set(a, (counts.get(a) ?? 0) + 1);
  return counts;
}

// レシートIDを持たない旧データのうち、同じ日付・店名の明細の金額構成が
// このレシートの k 回分と一致するものがあれば true
function matchesLegacyGroup(receipt, existingEntries) {
  if (receipt.items.length === 0) return false;
  const target = countAmounts(receipt.items.map((i) => i.amount));

  const groups = new Map();
  for (const e of existingEntries) {
    if (e.receiptId || e.date !== receipt.date || e.store !== receipt.store) continue;
    groups.set(e.store, [...(groups.get(e.store) ?? []), e.amount]);
  }

  return [...groups.values()].some((amounts) => {
    const counts = countAmounts(amounts);
    const k = amounts.length / receipt.items.length;
    if (!Number.isInteger(k) || k < 1) return false;
    return (
      counts.size === target.size &&
      [...target].every(([amount, n]) => counts.get(amount) === n * k)
    );
  });
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
    const sameTotal = groupByReceipt(existingEntries).some(
      (r) => r.date === receipt.date && r.total === total
    );
    // receiptId を持たない旧データはレシート単位に分けられないため、
    // 同じ日付・店名の明細の金額構成が、このレシートの k 回分（k>=1）と一致するかで判定する
    // （商品名はOCRで読み取りごとに揺れるため、金額のみで比較する）
    const sameItems = matchesLegacyGroup(receipt, existingEntries);
    const duplicated = sameTotal || sameItems;
    if (duplicated) {
      warnings.push(
        `同じ日付（${receipt.date}）・合計金額（¥${total.toLocaleString()}）のレシートが` +
          '既に登録されています。重複登録の可能性があります。'
      );
    }
  }

  return warnings;
}
