// One-shot admin function: creates all PepLab products in PsiFi.
//
// Usage: GET /.netlify/functions/create-products
// Behavior: idempotent — checks existing products by name first;
// only creates ones that don't exist yet. Returns the full
// name → productId map so it can be baked into checkout-session.js.
//
// DELETE this function after products are seeded.

// Canonical product catalog (same prices as create-checkout-session)
const PRODUCTS = [
  { name: 'GLP-3 (RT) 10mg',              price: 79.99 },
  { name: 'GLP-3 (RT) 10mg — 1 Vial',     price: 79.99 },
  { name: 'GLP-3 (RT) 10mg — 3 Vials',    price: 199.99 },
  { name: 'BPC-157 5mg',                  price: 42.99 },
  { name: 'BPC-157 10mg',                 price: 72.99 },
  { name: 'TB-500 5mg',                   price: 44.99 },
  { name: 'SS-31 5mg',                    price: 54.99 },
  { name: 'Wolverine Blend',              price: 79.99 },
  { name: 'Tirzepatide 10mg',             price: 89.99 },
  { name: 'AOD-9604 5mg',                 price: 38.99 },
  { name: '5-Amino-1MQ 50mg',             price: 49.99 },
  { name: 'MOTS-c 10mg',                  price: 59.99 },
  { name: 'L-Carnitine 500mg',            price: 29.99 },
  { name: 'Klow Blend 80mg',              price: 99.99 },
  { name: 'Ipamorelin 10mg',              price: 39.99 },
  { name: 'Sermorelin 5mg',               price: 36.99 },
  { name: 'CJC-1295 No DAC 5mg',          price: 39.99 },
  { name: 'CJC-1295 DAC 5mg',             price: 44.99 },
  { name: 'CJC-1295 Ipamorelin Blend',    price: 64.99 },
  { name: 'Tesamorelin 10mg',             price: 69.99 },
  { name: 'IGF-1 LR3 1mg',                price: 79.99 },
  { name: 'HCG 5000 IU',                  price: 49.99 },
  { name: 'Kisspeptin 10mg',              price: 54.99 },
  { name: 'Selank 5mg',                   price: 34.99 },
  { name: 'Semax 5mg',                    price: 36.99 },
  { name: 'DSIP 5mg',                     price: 32.99 },
  { name: 'Epithalon 10mg',               price: 44.99 },
  { name: 'NAD+ 500mg',                   price: 64.99 },
  { name: 'GHK-Cu',                       price: 39.99 },
  { name: 'Glow Blend 70mg',              price: 84.99 },
  { name: 'MT-1 10mg',                    price: 39.99 },
  { name: 'MT-2 10mg',                    price: 34.99 },
  { name: 'Bacteriostatic Water',         price: 14.99 },
  // Special line item for paid shipping
  { name: 'Shipping',                     price: 19.99 },
];

const PSIFI = 'https://api.psifi.app/api/v2';

async function listAllProducts(apiKey) {
  // Paginate through everything. PsiFi list responses include has_more.
  const items = [];
  let after = null;
  for (let i = 0; i < 20; i++) { // hard safety cap
    const url = new URL(`${PSIFI}/products`);
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('starting_after', after);
    const r = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' },
    });
    const body = await r.json();
    if (!r.ok) throw new Error(`List failed: ${r.status} ${JSON.stringify(body)}`);
    const batch = body.data || [];
    items.push(...batch);
    if (!body.has_more) break;
    after = batch[batch.length - 1]?.id;
    if (!after) break;
  }
  return items;
}

async function createProduct(apiKey, product) {
  const crypto = require('crypto');
  const r = await fetch(`${PSIFI}/products`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Idempotency-Key': crypto.randomUUID(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: product.name,
      price: product.price,
      currency: 'USD',
      type: 'internal',
      status: 'active',
      description: `${product.name} — research compound, for in-vitro laboratory research use only.`,
    }),
  });
  const body = await r.json();
  return { ok: r.ok, status: r.status, body };
}

exports.handler = async () => {
  const apiKey = process.env.PSIFI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'PSIFI_API_KEY not set' };
  }

  let existing;
  try {
    existing = await listAllProducts(apiKey);
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Could not list existing PsiFi products', detail: e.message }),
    };
  }

  // Build a name → id map of what already exists
  const existingMap = {};
  for (const p of existing) {
    existingMap[p.name] = p.id;
  }

  const created = [];
  const skipped = [];
  const failed = [];

  for (const p of PRODUCTS) {
    if (existingMap[p.name]) {
      skipped.push({ name: p.name, id: existingMap[p.name], reason: 'already exists' });
      continue;
    }
    try {
      const res = await createProduct(apiKey, p);
      if (res.ok && res.body && res.body.id) {
        created.push({ name: p.name, id: res.body.id, price: p.price });
        existingMap[p.name] = res.body.id;
      } else {
        failed.push({ name: p.name, status: res.status, body: res.body });
      }
    } catch (e) {
      failed.push({ name: p.name, error: e.message });
    }
  }

  // Final map: name → productId for everything we care about
  const nameToId = {};
  for (const p of PRODUCTS) {
    if (existingMap[p.name]) nameToId[p.name] = existingMap[p.name];
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: {
        total_requested: PRODUCTS.length,
        created: created.length,
        skipped: skipped.length,
        failed: failed.length,
      },
      name_to_id: nameToId,
      created,
      skipped,
      failed,
    }, null, 2),
  };
};
