import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CertificateItem {
  id?: string;
  batchCode: string;
  inspector: string;
  note: string;
  certificateUri?: string;
  txHash?: string;
  verifiedAt?: string;
}

export const fetchCertificatesFromSupabase = async (batchCode?: string): Promise<CertificateItem[] | null> => {
  if (!isSupabaseConfigured) return null;

  try {
    let query = supabase.from('certificates').select('*').order('verified_at', { ascending: false });
    if (batchCode) {
      query = query.eq('batch_code', batchCode);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Loi doc giay chung nhan tu Supabase:', error);
      return null;
    }

    return (data || []).map((c) => ({
      id: c.id,
      batchCode: c.batch_code,
      inspector: c.inspector,
      note: c.note,
      certificateUri: c.certificate_uri,
      txHash: c.tx_hash,
      verifiedAt: c.verified_at
    }));
  } catch (err) {
    console.error('Loi fetchCertificatesFromSupabase:', err);
    return null;
  }
};

export const saveCertificateToSupabase = async (cert: CertificateItem): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  try {
    const payload = {
      batch_code: cert.batchCode,
      inspector: cert.inspector,
      note: cert.note,
      certificate_uri: cert.certificateUri || '',
      tx_hash: cert.txHash || '',
      verified_at: cert.verifiedAt || new Date().toISOString()
    };

    const { error } = await supabase.from('certificates').insert(payload);
    if (error) {
      console.error('Loi luu giay chung nhan vao Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Loi saveCertificateToSupabase:', err);
    return false;
  }
};
