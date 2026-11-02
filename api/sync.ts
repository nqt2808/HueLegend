import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Serverless Function cho API /api/sync
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Thiet lap tieu de CORS cho phep cac thiet bi truy cap
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'HueLegend Sync API on Vercel: Du lieu duoc dong bo qua Supabase Realtime Database.',
      timestamp: Date.now()
    });
  }

  if (req.method === 'POST') {
    return res.status(200).json({
      success: true,
      message: 'Du lieu da duoc tiep nhan. HueLegend khuyen nghi su dung Supabase Realtime client.',
      timestamp: Date.now()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
