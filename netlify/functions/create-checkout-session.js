// PepLab.us → PsiFi checkout session creator
//
// Receives a cart from the browser, validates names against the
// server-side allowlist, looks up the corresponding PsiFi productId,
// and creates a PsiFi hosted checkout session.
//
// PsiFi's API fetches name and price from its own product database
// (created via the seed script). All we send is { productId, quantity }.
//
// The PsiFi API key never reaches the browser — it lives only in
// the PSIFI_API_KEY env var on Netlify.

const crypto = require('crypto');

// ─── Server-side catalog: name → { psifiId, price } ────────────────
// Prices here are display/audit only (PsiFi uses its own DB price).
// The map serves three purposes:
//   1. Allowlist — reject unknown product names
//   2. Compute subtotal for the free-shipping threshold
//   3. Audit trail in PsiFi session metadata
const CATALOG = {
  'GLP-3 (RT) 10mg':              { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000002', price: 79.99 },
  'GLP-3 (RT) 10mg — 1 Vial':     { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000003', price: 79.99 },
  'GLP-3 (RT) 10mg — 3 Vials':    { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000004', price: 199.99 },
  'BPC-157 5mg':                  { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000005', price: 42.99 },
  'BPC-157 10mg':                 { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000006', price: 72.99 },
  'TB-500 5mg':                   { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000007', price: 44.99 },
  'SS-31 5mg':                    { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000008', price: 54.99 },
  'Wolverine Blend':              { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000009', price: 79.99 },
  'Tirzepatide 10mg':             { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000010', price: 89.99 },
  'AOD-9604 5mg':                 { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000011', price: 38.99 },
  '5-Amino-1MQ 50mg':             { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000012', price: 49.99 },
  'MOTS-c 10mg':                  { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000013', price: 59.99 },
  'L-Carnitine 500mg':            { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000014', price: 29.99 },
  'Klow Blend 80mg':              { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000015', price: 99.99 },
  'Ipamorelin 10mg':              { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000016', price: 39.99 },
  'Sermorelin 5mg':               { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000017', price: 36.99 },
  'CJC-1295 No DAC 5mg':          { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000018', price: 39.99 },
  'CJC-1295 DAC 5mg':             { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000019', price: 44.99 },
  'CJC-1295 Ipamorelin Blend':    { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000020', price: 64.99 },
  'Tesamorelin 10mg':             { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000021', price: 69.99 },
  'IGF-1 LR3 1mg':                { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000022', price: 79.99 },
  'HCG 5000 IU':                  { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000023', price: 49.99 },
  'Kisspeptin 10mg':              { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000024', price: 54.99 },
  'Selank 5mg':                   { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000025', price: 34.99 },
  'Semax 5mg':                    { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000026', price: 36.99 },
  'DSIP 5mg':                     { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000027', price: 32.99 },
  'Epithalon 10mg':               { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000028', price: 44.99 },
  'NAD+ 500mg':                   { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000029', price: 64.99 },
  'GHK-Cu':                       { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000030', price: 39.99 },
  'Glow Blend 70mg':              { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000031', price: 84.99 },
  'MT-1 10mg':                    { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000032', price: 39.99 },
  'MT-2 10mg':                    { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000033', price: 34.99 },
  'Bacteriostatic Water':         { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000034', price: 14.99 },
  'Bacteriostatic Water 10mL':    { psifiId: 'PSIFI-6a06496c8353e17a770e8014-000034', price: 14.99 },
};

const SHIPPING_PSIFI_ID = 'PSIFI-6a06496c8353e17a770e8014-000035';
const FREE_SHIPPING_THRESHOLD = 250;
const FLAT_SHIPPING_RATE = 19.99;

// Aliases — legacy names from earlier versions of the cart.
// Resolves to a canonical key in CATALOG.
const ALIASES = {
  'Retatrutide (GLP-3 RT) 10mg':                'GLP-3 (RT) 10mg',
  'Retatrutide (GLP-3 RT) 10mg — 1 Vial':       'GLP-3 (RT) 10mg — 1 Vial',
  'Retatrutide (GLP-3 RT) 10mg — 3 Vials':      'GLP-3 (RT) 10mg — 3 Vials',
  'Wolverine Blend (BPC-157 + TB-500)':         'Wolverine Blend',
  'Wolverine (BPC157/TB500 Blend)':             'Wolverine Blend',
  'KLOW Blend (80mg)':                           'Klow Blend 80mg',
  'KLOW 80mg (GLP/GIP + GHK-Cu Blend)':         'Klow Blend 80mg',
  'CJC-1295 No DAC + Ipamorelin Blend':         'CJC-1295 Ipamorelin Blend',
  'CJC-1295 No DAC + Ipamorelin (5mg/5mg)':     'CJC-1295 Ipamorelin Blend',
  'CJC 1295 No DAC 5mg':                         'CJC-1295 No DAC 5mg',
  'Bacteriostatic Water (10mL)':                'Bacteriostatic Water',
};

function resolveCatalogKey(name) {
  if (CATALOG[name]) return name;
  const alias = ALIASES[name];
  if (alias && CATALOG[alias]) return alias;
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
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.PSIFI_API_KEY;
  if (!apiKey) {
    console.error('PSIFI_API_KEY env var missing');
    return json(500, { error: 'Server misconfigured' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : null;
  if (!rawItems || rawItems.length === 0) {
    return json(400, { error: 'Cart is empty' });
  }

  // Resolve every cart item against the catalog
  const psifiItems = [];
  const auditItems = [];
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

    const entry = CATALOG[canonical];
    subtotal += entry.price * qty;

    // PsiFi's API requires BOTH productId AND name/price on each item,
    // despite their own error messages suggesting otherwise.
    psifiItems.push({
      productId: entry.psifiId,
      name: canonical,
      price: entry.price,
      quantity: qty,
    });
    auditItems.push({
      name: canonical,
      price: entry.price,
      quantity: qty,
    });
  }

  // Shipping
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  if (shippingCost > 0) {
    psifiItems.push({
      productId: SHIPPING_PSIFI_ID,
      name: 'Shipping',
      price: FLAT_SHIPPING_RATE,
      quantity: 1,
    });
  }

  // Build origin for success/cancel URLs
  const origin =
    event.headers['origin'] ||
    `https://${event.headers['host'] || 'peplab.us'}`;

  // PsiFi has TWO distinct checkout products:
  //   1. /checkout-sessions — only for onramp / NFT / gaming (no Apple Pay, no shipping)
  //   2. /payment-links — for physical goods with shipping + Apple Pay (what we need)
  // Dashboard-created payment links use #2 and work correctly. Use the
  // same endpoint via API.
  const psifiBody = {
    items: psifiItems,
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cancel`,
    fee_payer: 'merchant',
    // Best-guess address collection fields; PsiFi will ignore any it
    // doesn't recognize. If shipping form doesn't appear, log will
    // show the actual fields needed on this endpoint.
    shipping_address_collection: { allowed_countries: ['US'] },
    collect_shipping_address: true,
    collect_billing_address: true,
    metadata: {
      source: 'peplab.us',
      cart_subtotal: subtotal.toFixed(2),
      cart_shipping: shippingCost.toFixed(2),
      cart_total: (subtotal + shippingCost).toFixed(2),
      items_snapshot: JSON.stringify(auditItems),
    },
  };

  const idempotencyKey = crypto.randomUUID();

  let psifiRes, psifiData;
  try {
    psifiRes = await fetch('https://api.psifi.app/api/v2/payment-links', {
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
    console.error('Request body that was rejected:', JSON.stringify(psifiBody));
    return json(502, {
      error: 'Payment provider rejected the request',
      detail: psifiData,
    });
  }

  // Log the full successful response so we can verify which fields PsiFi
  // accepted (fee_payer, payment methods, etc.) for the session.
  console.log('PsiFi session created:', JSON.stringify(psifiData));

  const checkoutUrl =
    psifiData.checkout_url ||
    psifiData.url ||
    psifiData.checkoutUrl ||
    psifiData.session_url ||
    psifiData.hosted_url ||
    null;

  if (!checkoutUrl) {
    console.error('PsiFi response missing checkout URL:', psifiData);
    return json(502, {
      error: 'Payment provider returned no URL',
      detail: psifiData,
    });
  }

  return json(200, { checkout_url: checkoutUrl });
};
