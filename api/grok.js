export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const stream = req.body.stream === true;
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        ...req.body,
        model: req.body.model || 'grok-3-mini',
        messages: req.body.messages,
        max_tokens: req.body.max_tokens || 500
      })
    });

    // Streaming passthrough — used when Deepgram's Voice Agent calls this route
    // as a custom OpenAI-compatible LLM endpoint.
    if (stream && response.body) {
      res.status(response.status);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      for await (const chunk of response.body) res.write(chunk);
      return res.end();
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    // Spread the raw xAI payload so OpenAI-shaped consumers keep working,
    // and add the normalized `content` array the portfolio tools expect.
    return res.status(200).json({ ...data, content: [{ type: 'text', text }] });
  } catch (error) {
    return res.status(500).json({ error: 'Grok proxy error', details: error.message });
  }
}
