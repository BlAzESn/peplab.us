// One-shot admin function: attaches product images to each PsiFi product.
//
// Usage: GET /.netlify/functions/update-product-images
// Behavior: for each product in our catalog, PATCH /api/v2/products/{id}
// with the canonical product image URL hosted on peplab.us.
//
// DELETE this function after running.

const crypto = require('crypto');

// productId → public image URL
// Using peplab.us so the URL is portable across hosts.
const HOST = 'https://peplab.us';
const IMG = (file) => `${HOST}/assets/products/${file}`;

const UPDATES = [
  { id: 'PSIFI-6a06496c8353e17a770e8014-000002', img: IMG('glp3rt.webp') },                   // GLP-3 (RT) 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000003', img: IMG('glp3rt.webp') },                   // GLP-3 (RT) 10mg — 1 Vial
  { id: 'PSIFI-6a06496c8353e17a770e8014-000004', img: IMG('glp3rt.webp') },                   // GLP-3 (RT) 10mg — 3 Vials
  { id: 'PSIFI-6a06496c8353e17a770e8014-000005', img: IMG('bpc157-5mg.webp') },               // BPC-157 5mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000006', img: IMG('bpc157-10mg.webp') },              // BPC-157 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000007', img: IMG('tb500-5mg.webp') },                // TB-500 5mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000008', img: IMG('ss31-5mg.webp') },                 // SS-31 5mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000009', img: IMG('wolverine-blend.webp') },          // Wolverine Blend
  { id: 'PSIFI-6a06496c8353e17a770e8014-000010', img: IMG('tirzepatide-10mg.webp') },         // Tirzepatide 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000011', img: IMG('aod9604-5mg.webp') },              // AOD-9604 5mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000012', img: IMG('5amino1mq-50mg.webp') },           // 5-Amino-1MQ 50mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000013', img: IMG('motsc-10mg.webp') },               // MOTS-c 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000014', img: IMG('l-carnitine-500mg.webp') },        // L-Carnitine 500mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000015', img: IMG('klow-blend-80mg.webp') },          // Klow Blend 80mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000016', img: IMG('ipamorelin-10mg.webp') },          // Ipamorelin 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000017', img: IMG('sermorelin-5mg.webp') },           // Sermorelin 5mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000018', img: IMG('cjc1295-nodac-5mg.webp') },        // CJC-1295 No DAC 5mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000019', img: IMG('cjc1295-dac-5mg.webp') },          // CJC-1295 DAC 5mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000020', img: IMG('cjc1295-ipamorelin-blend.webp') }, // CJC-1295 Ipamorelin Blend
  { id: 'PSIFI-6a06496c8353e17a770e8014-000021', img: IMG('tesamorelin-10mg.webp') },         // Tesamorelin 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000022', img: IMG('igf1-lr3-1mg.webp') },             // IGF-1 LR3 1mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000023', img: IMG('hcg-5000iu.webp') },               // HCG 5000 IU
  { id: 'PSIFI-6a06496c8353e17a770e8014-000024', img: IMG('kisspeptin-10mg.webp') },          // Kisspeptin 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000025', img: IMG('selank-5mg.webp') },               // Selank 5mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000026', img: IMG('semax-5mg.webp') },                // Semax 5mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000027', img: IMG('selank-5mg.webp') },               // DSIP 5mg — placeholder, no DSIP image exists
  { id: 'PSIFI-6a06496c8353e17a770e8014-000028', img: IMG('epithalon-10mg.webp') },           // Epithalon 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000029', img: IMG('nad-500mg.webp') },                // NAD+ 500mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000030', img: IMG('ghk-cu.webp') },                   // GHK-Cu
  { id: 'PSIFI-6a06496c8353e17a770e8014-000031', img: IMG('glow-blend-70mg.webp') },          // Glow Blend 70mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000032', img: IMG('mt1-10mg.webp') },                 // MT-1 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000033', img: IMG('mt2-10mg.webp') },                 // MT-2 10mg
  { id: 'PSIFI-6a06496c8353e17a770e8014-000034', img: IMG('bacteriostatic-water.webp') },     // Bacteriostatic Water
  // 000035 is "Shipping" — no product image needed
];

const PSIFI = 'https://api.psifi.app/api/v2';

async function tryUpdate(apiKey, id, img, method) {
  const r = await fetch(`${PSIFI}/products/${encodeURIComponent(id)}`, {
    method,
    headers: {
      'x-api-key': apiKey,
      'Idempotency-Key': crypto.randomUUID(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ images: [{ url: img }] }),
  });
  const body = await r.json();
  return { ok: r.ok, status: r.status, body, method };
}

async function updateOne(apiKey, { id, img }) {
  // PsiFi rejected PATCH with "No such resource". Try PUT first (REST
  // standard for resource update), fall back to POST (Stripe-style) if
  // PUT also returns 404/405.
  let res = await tryUpdate(apiKey, id, img, 'PUT');
  if (!res.ok && (res.status === 404 || res.status === 405)) {
    res = await tryUpdate(apiKey, id, img, 'POST');
  }
  return res;
}

exports.handler = async () => {
  const apiKey = process.env.PSIFI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: 'no api key' };

  const succeeded = [];
  const failed = [];

  for (const u of UPDATES) {
    try {
      const res = await updateOne(apiKey, u);
      if (res.ok) {
        succeeded.push({ id: u.id, img: u.img, images_in_response: res.body && res.body.images });
      } else {
        failed.push({ id: u.id, status: res.status, body: res.body });
      }
    } catch (e) {
      failed.push({ id: u.id, error: e.message });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: {
        total: UPDATES.length,
        succeeded: succeeded.length,
        failed: failed.length,
      },
      succeeded,
      failed,
    }, null, 2),
  };
};
