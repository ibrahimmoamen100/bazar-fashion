import type { VercelRequest, VercelResponse } from '@vercel/node';

const FIREBASE_PROJECT_ID = 'store-49d01';
const FIREBASE_API_KEY = 'AIzaSyCqsuXR7r-OllrBzbzGcvnZTcsGNuHRI2w';

function parseFirestoreValue(value: any): any {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return parseFloat(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map((v: any) => parseFirestoreValue(v));
  }
  if ('mapValue' in value) {
    const obj: any = {};
    const fields = value.mapValue.fields || {};
    for (const k in fields) {
      obj[k] = parseFirestoreValue(fields[k]);
    }
    return obj;
  }
  if ('timestampValue' in value) return value.timestampValue;
  return null;
}

function parseFirestoreDocument(doc: any): any {
  if (!doc || !doc.fields) return null;
  const result: any = { id: doc.name.split('/').pop() };
  for (const key in doc.fields) {
    result[key] = parseFirestoreValue(doc.fields[key]);
  }
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products/${id}?key=${FIREBASE_API_KEY}`;
    const response = await fetch(firestoreUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Product not found' });
      }
      throw new Error(`Firestore REST API responded with status ${response.status}`);
    }

    const docData = await response.json();
    const product = parseFirestoreDocument(docData);

    if (!product) {
      return res.status(404).json({ error: 'Failed to parse product' });
    }

    // Set cache control for performance (cache in CDN for 10 minutes, serve stale while revalidating in background)
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=3600');

    return res.status(200).json({
      id: product.id,
      name: product.name || '',
      description: product.description || '',
      image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '/logo3.png',
      price: product.price || 0,
      category: product.category || '',
      brand: product.brand || '',
      availability: product.isArchived ? 'OutOfStock' : 'InStock',
    });
  } catch (error: any) {
    console.error('Error fetching product meta:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
