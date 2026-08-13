import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const STORE_URL = 'http://codfroud.atwebpages.com/products.php';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { message } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: message }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_store_products',
            description: 'جلب قائمة منتجات المتجر الحالية والتحقق من الأسعار والمخزون',
            parameters: { type: 'object', properties: {} }
          }
        }
      ]
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      // إرسال User-Agent لتخطي حظر Awardspace للطلبات الآلية
      const storeRes = await fetch(STORE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      const productsData = await storeRes.json();

      const finalResponse = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: message },
          responseMessage,
          {
            role: 'tool',
            tool_call_id: responseMessage.tool_calls[0].id,
            content: JSON.stringify(productsData)
          }
        ]
      });

      return res.status(200).json({ answer: finalResponse.choices[0].message.content });
    }

    return res.status(200).json({ answer: responseMessage.content });

  } catch (error) {
    // إرجاع رسالة الخطأ الحقيقية لمعرفتها فوراً
    return res.status(500).json({ error: 'خطأ بالسيرفر: ' + error.message });
  }
}
