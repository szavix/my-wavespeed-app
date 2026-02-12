export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const imageUrl = req.query?.url;
    if (!imageUrl) {
      res.status(400).json({ error: 'Missing url parameter' });
      return;
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    res.status(200).json({ dataUrl });
  } catch (err) {
    console.error('Image proxy error:', err);
    res.status(500).json({ error: err?.message || 'Unknown server error' });
  }
}
