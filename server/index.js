import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// 使用モデル（claude-haikuの最新バージョン）
const MODEL = 'claude-haiku-5-5';

// 自動分類に使うカテゴリ一覧（フロントエンドと揃えること）
const CATEGORIES = ['食費', '日用品', '外食', '交通費', '医療・健康', '衣類', '娯楽', 'その他'];
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('警告: ANTHROPIC_API_KEY が設定されていません。.env を確認してください。');
}

// APIキーは環境変数 ANTHROPIC_API_KEY から自動で読み込まれる
const anthropic = new Anthropic();

const app = express();
app.use(express.json({ limit: '15mb' }));

const PROMPT = `このレシート画像を読み取り、次のJSON形式のみで出力してください。説明文やコードブロックは不要です。

{
  "store": "店名（不明なら空文字）",
  "date": "購入日 YYYY-MM-DD（不明ならnull）",
  "items": [
    { "name": "商品名", "amount": 金額(整数・円), "category": "カテゴリ" }
  ]
}

ルール:
- category は次のいずれかから必ず選ぶ: ${CATEGORIES.join('、')}
- 飲食店のレシートは「外食」、スーパー等の食料品は「食費」、洗剤・消耗品などは「日用品」とする
- 小計・合計・税・お預り・お釣りの行は items に含めない
- 値引きは該当商品の金額に反映するか、負の金額の項目として含める
- 金額は税込の整数（円）で、カンマや通貨記号は含めない`;

// レシート画像を解析するAPI
app.post('/api/analyze', async (req, res) => {
  const { image, mediaType } = req.body ?? {};
  if (typeof image !== 'string' || !ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: '画像データまたは形式が不正です。' });
  }

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    res.json(normalizeResult(parseJson(text)));
  } catch (err) {
    console.error('解析エラー:', err);
    res.status(500).json({ error: 'レシートの読み取りに失敗しました。' });
  }
});

// モデル出力から最初の { ～ 最後の } を取り出してJSONとして解析する
function parseJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('JSONが見つかりません');
  return JSON.parse(text.slice(start, end + 1));
}

// 出力を検証し、想定外の値を補正する
function normalizeResult(raw) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((item) => ({
      name: String(item.name ?? '').trim(),
      amount: Math.round(Number(item.amount)),
      category: CATEGORIES.includes(item.category) ? item.category : 'その他',
    }))
    .filter((item) => item.name && Number.isFinite(item.amount));

  return { store: String(raw.store ?? '').trim(), date, items };
}

// 本番ビルド（dist）があれば静的配信する
const distDir = path.join(__dirname, '..', 'dist');
app.use(express.static(distDir));

app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});
