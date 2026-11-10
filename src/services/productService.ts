import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ProductItem {
  id?: string;
  name: string;
  category: string;
  description?: string;
  origin: string;
  imageUrl?: string;
  storeName?: string;
  listingPriceEth?: string;
  ocopStandard?: string;
}

export const fetchProductsFromSupabase = async (): Promise<ProductItem[] | null> => {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Loi lay danh sach san pham tu Supabase:', error);
      return null;
    }

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      origin: p.origin,
      imageUrl: p.image_url,
      storeName: p.store_name,
      listingPriceEth: p.listing_price_eth,
      ocopStandard: p.ocop_standard
    }));
  } catch (err) {
    console.error('Loi fetchProductsFromSupabase:', err);
    return null;
  }
};

export const saveProductToSupabase = async (product: ProductItem): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  try {
    const payload = {
      name: product.name,
      category: product.category,
      description: product.description || '',
      origin: product.origin || 'Thua Thien Hue, Viet Nam',
      image_url: product.imageUrl || '',
      store_name: product.storeName || '',
      listing_price_eth: product.listingPriceEth || '0.01',
      ocop_standard: product.ocopStandard || '4 sao OCOP'
    };

    const { error } = await supabase.from('products').insert(payload);
    if (error) {
      console.error('Loi luu san pham vao Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Loi saveProductToSupabase:', err);
    return false;
  }
};
