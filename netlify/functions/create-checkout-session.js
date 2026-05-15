// PepLab.us → PsiFi checkout session creator
//
// Receives a cart from the browser, validates it against a server-side
// price catalog (so customers cannot tamper with prices in DevTools),
// builds the order, and asks PsiFi for a hosted checkout URL.
//
// The browser never sees the PsiFi API key — it lives only in
// the PSIFI_API_KEY env var on Netlify.

const crypto = require('crypto');

// ─── Server-side price catalog ──────────────────────────────────────
// Canonical product names → unit price in USD. Names must match what
// shop.html / cart.js / product pages use. If a cart item's name isn't
// here we reject the request rather than pass through an unknown price.
const CATALOG = {
  'GLP-3 (RT) 10mg':              79.99,
  'GLP-3 (RT) 10mg — 1 Vial':     79.99,
  'GLP-3 (RT) 10mg — 3 Vials':   199.99,
  'BPC-157 5mg':                  42.99,
  'BPC-157 10mg':                 72.99,
  'TB-500 5mg':                   44.99,
  'SS-31 5mg':                    54.99,
  'Wolverine Blend':              79.99,
  'Tirzepatide 10mg':             89.99,
  'AOD-9604 5mg':                 38.99,
  '5-Amino-1MQ 50mg':             49.99,
  'MOTS-c 10mg':                  59.99,
  'L-Carnitine 500mg':            29.99,
  'Klow Blend 80mg':              99.99,
  'Ipamorelin 10mg':              39.99,
  'Sermorelin 5mg':               36.99,
  'CJC-1295 No DAC 5mg':          39.99,
  'CJC-1295 DAC 5mg':             44.99,
  'CJC-1295 Ipamorelin Blend':    64.99,
  'Tesamorelin 10mg':             69.99,
  'IGF-1 LR3 1mg':                79.99,
  'HCG 5000 IU':                  49.99,
  'Kisspeptin 10mg':              54.99,
  'Selank 5mg':                   34.99,
  'Semax 5mg':                    36.99,
  'DSIP 5mg':                     32.99,
  'Epithalon 10mg':               44.99,
  'NAD+ 500mg':                   64.99,
  'GHK-Cu':                       39.99,
  'Glow Blend 70mg':              84.99,
  'MT-1 10mg':                    39.99,
  'MT-2 10mg':                    34.99,
  'Bacteriostatic Water':         14.99,
  'Bacteriostatic Water 10mL':    14.99,
};

// Aliases for legacy / alternate names a cart might still send.
// Resolves to the canonical key in CATALOG.
const ALIASES = {
  // Legacy "Retatrutide" names — for carts saved before the GLP-3 rename
  'Retatrutide (GLP-3 RT) 10mg':                'GLP-3 (RT) 10mg',
  'Retatrutide (GLP-3 RT) 10mg — 1 Vial':       'GLP-3 (RT) 10mg — 1 Vial',
  'Retatrutide (GLP-3 RT) 10mg — 3 Vials':      'GLP-3 (RT) 10mg — 3 Vials',
  // Product page heading variants
  'Wolverine Blend (BPC-157 + TB-500)':         'Wolverine Blend',
  'Wolverine (BPC157/TB500 Blend)':             'Wolverine Blend',
  'KLOW Blend (80mg)':                           'Klow Blend 80mg',
  'KLOW 80mg (GLP/GIP + GHK-Cu Blend)':         'Klow Blend 80mg',
  'CJC-1295 No DAC + Ipamorelin Blend':         'CJC-1295 Ipamorelin Blend',
  'CJC-1295 No DAC + Ipamorelin (5mg/5mg)':     'CJC-1295 Ipamorelin Blend',
  'CJC 1295 No DAC 5mg':                         'CJC-1295 No DAC 5mg',
  'Bacteriostatic Water (10mL)':                'Bacteriostatic Water',
};

// Shipping rule mirrors the site UI: free over $250, otherwise $19.99
const FREE_SHIPPING_THRESHOLD = 250;
const FLAT_SHIPPING_RATE = 19.99;

function resolveCatalogKey(name) {
  if (CATALOG[name] != null) return name;
  const alias = ALIASES[name];
  if (alias && CATALOG[alias] != null) return alias;
  return null;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  // Method check
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  // Auth env check
  const apiKey = process.env.PSIFI_API_KEY;
  if (!apiKey) {
    console.error('PSIFI_API_KEY env var missing');
    return json(500, { error: 'Server misconfigured' });
  }

  // Parse body
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON' });
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : null;
  if (!rawItems || rawItems.length === 0) {
    return json(400, { error: 'Cart is empty' });
  }

  // Validate + re-price every item against the server-side catalog.
  // We trust nothing the client sent except (name, quantity).
  const psifiItems = [];
  let subtotal = 0;
  for (const item of rawItems) {
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const qty = Number.isInteger(item.quantity) && item.quantity > 0
      ? item.quantity
      : null;

    if (!name || !qty) {
      return json(400, { error: `Invalid item: ${JSON.stringify(item)}` });
    }

    const canonical = resolveCatalogKey(name);
    if (!canonical) {
      return json(400, { error: `Unknown product: ${name}` });
    }

    const price = CATALOG[canonical];
    subtotal += price * qty;

    psifiItems.push({
      name: canonical,
      price,
      quantity: qty,
    });
  }

  // Shipping
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  if (shippingCost > 0) {
    psifiItems.push({
      name: 'Shipping',
      price: shippingCost,
      quantity: 1,
    });
  }

  // Build origin for success/cancel URLs (works on netlify.app preview and peplab.us prod)
  const origin =
    event.headers['origin'] ||
    `https://${event.headers['host'] || 'peplab.us'}`;

  const psifiBody = {
    items: psifiItems,
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cancel`,
    metadata: {
      source: 'peplab.us',
      cart_subtotal: subtotal.toFixed(2),
      cart_shipping: shippingCost.toFixed(2),
    },
  };

  // PsiFi requires an Idempotency-Key header to prevent duplicate orders
  // on network retries. Fresh UUID per invocation.
  const idempotencyKey = crypto.randomUUID();

  // Call PsiFi
  let psifiRes, psifiData;
  try {
    psifiRes = await fetch('https://api.psifi.app/api/v2/checkout-sessions', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(psifiBody),
    });
    psifiData = await psifiRes.json();
  } catch (err) {
    console.error('PsiFi network error:', err);
    return json(502, { error: 'Payment provider unreachable' });
  }

  if (!psifiRes.ok) {
    console.error('PsiFi error response:', psifiRes.status, psifiData);
    return json(502, {
      error: 'Payment provider rejected the request',
      detail: psifiData,
    });
  }

  // PsiFi response shape may vary — we accept several common field names
  const checkoutUrl =
    psifiData.checkout_url ||
    psifiData.url ||
    psifiData.checkoutUrl ||
    psifiData.session_url ||
    null;

  if (!checkoutUrl) {
    console.error('PsiFi response missing checkout URL:', psifiData);
    return json(502, { error: 'Payment provider returned no URL' });
  }

  return json(200, { checkout_url: checkoutUrl });
};
