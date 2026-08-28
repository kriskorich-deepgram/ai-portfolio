export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Chat completions when the body carries `messages`; image generation otherwise.
    if (Array.isArray(req.body?.messages)) {
      const stream = req.body.stream === true;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          ...req.body,
          model: req.body.model || 'gpt-4o',
          max_tokens: req.body.max_tokens || 500,
        }),
      });

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
      return res
        .status(response.status)
        .json({ ...data, content: [{ type: 'text', text }] });
    }

    // Remove response_format if present — gpt-image-2 does not accept it
    const { response_format, ...body } = req.body;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('OpenAI response status:', response.status);
    console.log('OpenAI response:', JSON.stringify(data).substring(0, 200));
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy error', details: error.message });
  }
}
