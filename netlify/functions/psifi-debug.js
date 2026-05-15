// Temporary debug endpoint — probes the PsiFi API to discover endpoint
// shapes (products, etc.). DELETE after we know what we need.
//
// Usage: GET /.netlify/functions/psifi-debug
// Output: JSON dump of responses from a few candidate endpoints.

exports.handler = async () => {
  const apiKey = process.env.PSIFI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'no api key' };
  }

  // Try a bunch of likely product-related endpoints with GET to see which exist
  const candidates = [
    'https://api.psifi.app/api/v2/products',
    'https://api.psifi.app/api/v2/products?limit=5',
    'https://api.psifi.app/api/v2/catalog',
    'https://api.psifi.app/api/v2/inventory',
    'https://api.psifi.app/api/v2/me',
    'https://api.psifi.app/api/v2/account',
    'https://api.psifi.app/api/v2/checkout-sessions?limit=1',
  ];

  const results = {};
  for (const url of candidates) {
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json',
        },
      });
      let body;
      const text = await r.text();
      try { body = JSON.parse(text); } catch { body = text.slice(0, 500); }
      results[url] = { status: r.status, body };
    } catch (e) {
      results[url] = { error: e.message };
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(results, null, 2),
  };
};
