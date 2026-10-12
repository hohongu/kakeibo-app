// receiptId を持つ登録済み明細をレシート単位にまとめ、[{ date, total, entries }] を返す
function groupByReceipt(entries) {
  const receipts = new Map();
  for (const e of entries) {
    if (!e.receiptId) continue;
    const receipt = receipts.get(e.receiptId) ?? { date: e.date, total: 0, entries: [] };
    receipt.total += e.amount;
    receipt.entries.push(e);
    receipts.set(e.receiptId, receipt);
  }
  return [...receipts.values()];
}

// 新しいレシートの明細のうち、登録済み明細と金額が一致するものを探す
// （商品名はOCRで読み取りごとに揺れるため金額で照合し、登録済みの1件には1回だけ対応させる）
// 戻り値: { matched: 一致した新しい明細の配列, targetIds: 対応した登録済み明細のID配列,
//          pairs: [{ index: 新しい明細の位置, targetId: 対応した登録済み明細のID }] }
function matchItems(items, candidateEntries) {
  const pool = new Map(); // 金額 -> 未対応の登録済み明細IDの配列
  for (const e of candidateEntries) {
    pool.set(e.amount, [...(pool.get(e.amount) ?? []), e.id]);
  }

  const matched = [];
  const targetIds = [];
  const pairs = [];
  items.forEach((item, index) => {
    const ids = pool.get(item.amount);
    if (ids && ids.length > 0) {
      const targetId = ids.shift();
      targetIds.push(targetId);
      matched.push(item);
      pairs.push({ index, targetId });
    }
  });
  return { matched, targetIds, pairs };
}

// 日付・合計金額の一致、または旧データとの金額の包含による重複を探す（重複なしなら null）
// - receiptId を持つデータ: 同じ日付・合計金額のレシートがあれば重複
// - receiptId を持たない旧データ: レシート単位に分けられず店名も揺れるため、
//   同じ日付の旧データに、このレシートの金額がすべて（出現回数込みで）含まれれば重複
//   （警告のみなので多少の誤検知は許容する）
function findDuplicate(receipt, existingEntries) {
  const total = receipt.items.reduce((sum, item) => sum + item.amount, 0);
  let best = null;

  const consider = (result) => {
    if (!best || result.matched.length > best.matched.length) best = result;
  };

  for (const r of groupByReceipt(existingEntries)) {
    if (r.date === receipt.date && r.total === total) {
      consider(matchItems(receipt.items, r.entries));
    }
  }

  const legacy = existingEntries.filter((e) => !e.receiptId && e.date === receipt.date);
  const legacyResult = matchItems(receipt.items, legacy);
  if (legacyResult.matched.length === receipt.items.length) consider(legacyResult);

  return best;
}

// 負の金額の警告メッセージ
function negativeWarnings(items) {
  return items
    .filter((item) => item.amount < 0)
    .map(
      (item) =>
        `「${item.name}」の金額が負の値です（-¥${Math.abs(item.amount).toLocaleString()}）。` +
        '値引きでなければ読み取り誤りの可能性があります。'
    );
}

// 重複した項目の内訳テキスト
function duplicateDetail(items, matched) {
  if (matched.length === 0) {
    return `${items.length}項目中、金額が一致する項目はありません（合計のみ一致）`;
  }
  const names = matched.map((item) => `「${item.name}」`).join('');
  return `${items.length}項目中${matched.length}項目が重複: ${names}`;
}

// 読み取ったレシートを検証する（登録自体は止めない）
// receipt: { store, date(読み取れなければnull), items }
// 戻り値: { warnings: 警告メッセージの配列, targetIds: 重複した登録済み明細のID配列,
//          pairs: [{ index: 新しい明細の位置, targetId }] }
//   targetIds は「再確認」で、一部だけ削除された場合の判定に使う
//   pairs は、重複した明細に「どの登録済み明細と重複か」を記録するために使う
export function validateReceipt(receipt, existingEntries) {
  const warnings = negativeWarnings(receipt.items);
  let targetIds = [];
  let pairs = [];

  // 重複レシート（日付が読み取れた場合のみ判定）
  if (receipt.date && receipt.items.length > 0) {
    const dup = findDuplicate(receipt, existingEntries);
    if (dup) {
      const total = receipt.items.reduce((sum, item) => sum + item.amount, 0);
      warnings.push(
        `同じ日付（${receipt.date}）・合計金額（¥${total.toLocaleString()}）のレシートが` +
          '既に登録されています。重複登録の可能性があります。' +
          `（${duplicateDetail(receipt.items, dup.matched)}）`
      );
      targetIds = dup.targetIds;
      pairs = dup.pairs;
    }
  }

  return { warnings, targetIds, pairs };
}

// 削除などの後に、現在の明細で警告を再判定する
// receipt: このレシートに現在残っている明細, others: このレシート以外の明細
// targetIds: 警告時に重複していた登録済み明細のID
// 一部だけ削除された場合（合計金額が変わる）も、残っている重複項目を検出する
export function recheckReceipt(receipt, others, targetIds) {
  const negatives = negativeWarnings(receipt.items);
  if (receipt.items.length === 0) return { warnings: negatives, targetIds: [] };

  // 日付・合計金額での判定（何も削除していなければ元の警告と同じ結果になる）
  const result = validateReceipt(receipt, others);
  if (result.targetIds.length > 0 || result.warnings.length > negatives.length) {
    return result;
  }

  // 一部削除で合計が変わっていても、重複していた登録済み明細と金額が
  // 一致する項目が残っていれば、重複として警告する
  const targets = others.filter((e) => targetIds.includes(e.id));
  const { matched, targetIds: stillIds } = matchItems(receipt.items, targets);
  if (matched.length > 0) {
    return {
      warnings: [
        ...negatives,
        '登録済みのレシートと重複している項目が残っています。' +
          `（${duplicateDetail(receipt.items, matched)}）`,
      ],
      targetIds: stillIds,
    };
  }

  return { warnings: negatives, targetIds: [] };
}
