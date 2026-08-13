import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const STORE_URL = 'http://codfroud.atwebpages.com/products.php';

const SYSTEM_TOOL_PROMPT = {
  role: 'system',
  content: `أنت محرك بحث متقدم لمنتجات متجر Codfroud.
مهمتك: تحليل استفسار الذكاء الاصطناعي الرئيسي وإرجاع JSON دقيق يحتوي على تفاصيل المنتجات وصورها الرئيسية وعدد الصور المتاحة.

قواعد الاستجابة:
1. الإجابة بصيغة JSON فقط دون أي نصوص إضافية.
2. نسق الهيكل المطلوب للرد:
{
  "query_analyzed": "استفسار النية الحقيقية",
  "matched_products": [
    {
      "id": 1,
      "name": "اسم المنتج",
      "price": 100,
      "stock": 5,
      "is_available": true,
      "main_image": "رابط الصورة الرئيسية الأولى فقط",
      "images_count": 3,
      "match_reason": "سبب التطابق"
    }
  ],
  "alternative_products": [],
  "out_of_stock_matches": []
}`
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, message } = req.body;
  const userQuery = query || message || '';

  try {
    const storeRes = await fetch(STORE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const catalogData = await storeRes.json();

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        SYSTEM_TOOL_PROMPT,
        {
          role: 'user',
          content: `طلب البحث: "${userQuery}"\n\nكتالوج المنتجات الحقيقي:\n${JSON.stringify(catalogData)}`
        }
      ]
    });

    const toolResult = JSON.parse(response.choices[0].message.content);

    return res.status(200).json({
      status: 'success',
      data: toolResult
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}
