import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GrantedWallet } from '../types';

export const fetchGrantedWalletsFromSupabase = async (): Promise<GrantedWallet[] | null> => {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('Loi doc danh sach vi duoc cap quyen tu Supabase:', error);
      return null;
    }

    if (!data) return [];

    return data.map((u) => ({
      address: u.wallet_address,
      role: u.role,
      roleTitle: u.role_title,
      grantedAt: new Date(u.granted_at || u.created_at).toLocaleDateString('vi-VN'),
      status: u.status || 'ACTIVE'
    }));
  } catch (err) {
    console.error('Loi fetchGrantedWalletsFromSupabase:', err);
    return null;
  }
};

export const saveGrantedWalletToSupabase = async (wallet: GrantedWallet): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  try {
    const payload = {
      wallet_address: wallet.address,
      role: wallet.role,
      role_title: wallet.roleTitle,
      status: wallet.status || 'ACTIVE',
      granted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'wallet_address' });

    if (error) {
      console.error('Loi luu vi cap quyen vao Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Loi saveGrantedWalletToSupabase:', err);
    return false;
  }
};

export const subscribeToWalletsRealtime = (onChange: () => void) => {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('realtime_users_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
