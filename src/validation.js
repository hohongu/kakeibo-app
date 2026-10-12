// receiptId を持つ登録済み明細をレシート単位にまとめ、[{ date, total, amounts }] を返す
function groupByReceipt(entries) {
  const receipts = new Map();
  for (const e of entries) {
    if (!e.receiptId) continue;
    const receipt = receipts.get(e.receiptId) ?? { date: e.date, total: 0, amounts: [] };
    receipt.total += e.amount;
    receipt.amounts.push(e.amount);
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

// 新しいレシートの明細のうち、登録済みの金額と一致するものを返す
// （商品名はOCRで読み取りごとに揺れるため金額で照合し、登録済みの1件には1回だけ対応させる）
function matchItems(items, existingAmounts) {
  const remaining = countAmounts(existingAmounts);
  const matched = [];
  for (const item of items) {
    const left = remaining.get(item.amount) ?? 0;
    if (left > 0) {
      remaining.set(item.amount, left - 1);
      matched.push(item);
    }
  }
  return matched;
}

// 重複と判定された場合、重複している明細の配列を返す（重複なしなら null）
// - receiptId を持つデータ: 同じ日付・合計金額のレシートがあれば重複
// - receiptId を持たない旧データ: レシート単位に分けられず店名も揺れるため、
//   同じ日付の旧データに、このレシートの金額がすべて（出現回数込みで）含まれれば重複
//   （警告のみなので多少の誤検知は許容する）
function findDuplicateItems(receipt, existingEntries) {
  const total = receipt.items.reduce((sum, item) => sum + item.amount, 0);
  let best = null;

  const consider = (amounts) => {
    const matched = matchItems(receipt.items, amounts);
    if (!best || matched.length > best.length) best = matched;
  };

  for (const r of groupByReceipt(existingEntries)) {
    if (r.date === receipt.date && r.total === total) consider(r.amounts);
  }

  const legacyAmounts = existingEntries
    .filter((e) => !e.receiptId && e.date === receipt.date)
    .map((e) => e.amount);
  if (receipt.items.length > 0) {
    const matched = matchItems(receipt.items, legacyAmounts);
    if (matched.length === receipt.items.length) consider(legacyAmounts);
  }

  return best;
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

  // 重複レシート（日付が読み取れた場合のみ判定）
  if (receipt.date && receipt.items.length > 0) {
    const duplicates = findDuplicateItems(receipt, existingEntries);
    if (duplicates) {
      const total = receipt.items.reduce((sum, item) => sum + item.amount, 0);
      // 合計だけ一致して金額の内訳が違う場合は、一致する項目がない旨を示す
      const detail =
        duplicates.length > 0
          ? `${receipt.items.length}項目中${duplicates.length}項目が重複: ` +
            duplicates.map((item) => `「${item.name}」`).join('')
          : `${receipt.items.length}項目中、金額が一致する項目はありません（合計のみ一致）`;
      warnings.push(
        `同じ日付（${receipt.date}）・合計金額（¥${total.toLocaleString()}）のレシートが` +
          '既に登録されています。重複登録の可能性があります。' +
          `（${detail}）`
      );
    }
  }

  return warnings;
}
