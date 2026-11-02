-- ====================================================================
-- HE THONG CO SO DU LIEU SUPABASE CHO DU AN HUELEGEND (ECO2432)
-- File Cập Nhật Va Cung Cap SQL Schema / Security Policies Cho Supabase
-- ====================================================================

-- 1. BANG NGUOI DUNG VA VAI TRO (USERS)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'ROLE_PRODUCER',
  role_title TEXT NOT NULL DEFAULT 'Co So San Xuat',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BANG SAN PHAM DAC SAN HUE (PRODUCTS)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  origin TEXT NOT NULL DEFAULT 'Thua Thien Hue, Viet Nam',
  image_url TEXT,
  store_name TEXT,
  listing_price_eth TEXT DEFAULT '0.01',
  ocop_standard TEXT DEFAULT '4 sao OCOP',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BANG LO HANG DAC SAN (BATCHES)
CREATE TABLE IF NOT EXISTS public.batches (
  batch_code TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  producer TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  exists BOOLEAN DEFAULT TRUE,
  is_listed BOOLEAN DEFAULT FALSE,
  category TEXT,
  listing_price_eth TEXT DEFAULT '0.01',
  store_name TEXT,
  star_rating TEXT DEFAULT '4 sao OCOP',
  ocop_standard TEXT DEFAULT '4 sao OCOP Hue',
  certification_no TEXT,
  quantity TEXT,
  current_stage TEXT,
  inspector_note TEXT,
  certificate_uri TEXT,
  image_url TEXT,
  production_date TEXT,
  expiry_date TEXT,
  tx_hash TEXT,
  verify_tx_hash TEXT,
  inspection_fee_paid TEXT DEFAULT '0.005',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BANG LICHSU CHECKPOINT / CHANG VAN CHUYEN (BATCH_HISTORY)
CREATE TABLE IF NOT EXISTS public.batch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL REFERENCES public.batches(batch_code) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  role TEXT NOT NULL,
  role_title TEXT NOT NULL,
  location TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  recorder TEXT NOT NULL,
  metadata_uri TEXT DEFAULT '',
  tx_hash TEXT DEFAULT '',
  condition_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BANG CHUNG NHAN OCOP VA KIEM DINH (CERTIFICATES)
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL REFERENCES public.batches(batch_code) ON DELETE CASCADE,
  inspector TEXT NOT NULL,
  note TEXT NOT NULL,
  certificate_uri TEXT,
  tx_hash TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BANG LOG DONG BO (SYNC_LOGS)
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHY MOC TANG TOC TRUY VAN (INDEXES)
CREATE INDEX IF NOT EXISTS idx_batches_batch_code ON public.batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_batches_producer ON public.batches(producer);
CREATE INDEX IF NOT EXISTS idx_batches_is_listed ON public.batches(is_listed);
CREATE INDEX IF NOT EXISTS idx_batches_tx_hash ON public.batches(tx_hash);
CREATE INDEX IF NOT EXISTS idx_batch_history_batch_code ON public.batch_history(batch_code);
CREATE INDEX IF NOT EXISTS idx_batch_history_tx_hash ON public.batch_history(tx_hash);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);

-- DONG BO THOI GIAN UPDATED_AT DONG
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_batches_updated_at ON public.batches;
CREATE TRIGGER set_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- KICH HOAT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- XOA SACH TOAN BO POLICY CU/PERMISSIVE DANGER POLICIES NEU CO
-- ====================================================================

-- Clean up USERS policies
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.users;
DROP POLICY IF EXISTS "Public Read Users" ON public.users;
DROP POLICY IF EXISTS "Public Insert/Update Users" ON public.users;
DROP POLICY IF EXISTS "Public Insert Users" ON public.users;
DROP POLICY IF EXISTS "Public Update Users" ON public.users;
DROP POLICY IF EXISTS "No Public Delete Users" ON public.users;

-- Clean up PRODUCTS policies
DROP POLICY IF EXISTS "Allow public read access" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.products;
DROP POLICY IF EXISTS "Enable update for all users" ON public.products;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.products;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Public Insert Products" ON public.products;
DROP POLICY IF EXISTS "Public Update Products" ON public.products;
DROP POLICY IF EXISTS "No Public Delete Products" ON public.products;

-- Clean up BATCHES policies
DROP POLICY IF EXISTS "Allow public read access" ON public.batches;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.batches;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.batches;
DROP POLICY IF EXISTS "Enable update for all users" ON public.batches;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.batches;
DROP POLICY IF EXISTS "Public Read Batches" ON public.batches;
DROP POLICY IF EXISTS "Public Insert Batches" ON public.batches;
DROP POLICY IF EXISTS "Public Update Batches" ON public.batches;
DROP POLICY IF EXISTS "No Public Delete Batches" ON public.batches;

-- Clean up BATCH_HISTORY policies
DROP POLICY IF EXISTS "Allow public read access" ON public.batch_history;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.batch_history;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.batch_history;
DROP POLICY IF EXISTS "Enable update for all users" ON public.batch_history;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.batch_history;
DROP POLICY IF EXISTS "Public Read Batch History" ON public.batch_history;
DROP POLICY IF EXISTS "Public Insert Batch History" ON public.batch_history;
DROP POLICY IF EXISTS "No Public Update Batch History" ON public.batch_history;
DROP POLICY IF EXISTS "No Public Delete Batch History" ON public.batch_history;

-- Clean up CERTIFICATES policies
DROP POLICY IF EXISTS "Allow public read access" ON public.certificates;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.certificates;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.certificates;
DROP POLICY IF EXISTS "Enable update for all users" ON public.certificates;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.certificates;
DROP POLICY IF EXISTS "Public Read Certificates" ON public.certificates;
DROP POLICY IF EXISTS "Public Insert Certificates" ON public.certificates;
DROP POLICY IF EXISTS "No Public Update Certificates" ON public.certificates;
DROP POLICY IF EXISTS "No Public Delete Certificates" ON public.certificates;

-- Clean up SYNC_LOGS policies
DROP POLICY IF EXISTS "Allow public read access" ON public.sync_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sync_logs;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.sync_logs;
DROP POLICY IF EXISTS "Public Read Sync Logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Public Insert Sync Logs" ON public.sync_logs;
DROP POLICY IF EXISTS "No Public Update Sync Logs" ON public.sync_logs;
DROP POLICY IF EXISTS "No Public Delete Sync Logs" ON public.sync_logs;

-- ====================================================================
-- THIET LAP CHINH SACH BAO MAT RLS MOI CHINH XAC VA THAT CHET
-- ====================================================================

-- 1. BANG USERS: Cho phep Read Tat ca; Chieu theo Admin wallet de cap vai tro dac quyen (ROLE_ADMIN, ROLE_INSPECTOR, ROLE_LOGISTICS, ROLE_RETAILER)
CREATE POLICY "Public Read Users" ON public.users FOR SELECT USING (true);

CREATE POLICY "Public Insert Users" ON public.users FOR INSERT WITH CHECK (
  wallet_address IS NOT NULL AND
  (
    role IS NULL OR 
    role = 'ROLE_PRODUCER' OR 
    LOWER(wallet_address) = LOWER('0x6F4C4e1FEF9827eDC7B64fCD53aED9aE1e065507')
  )
);

CREATE POLICY "Public Update Users" ON public.users FOR UPDATE USING (true) WITH CHECK (
  wallet_address IS NOT NULL AND
  (
    role IS NULL OR 
    role = 'ROLE_PRODUCER' OR 
    LOWER(wallet_address) = LOWER('0x6F4C4e1FEF9827eDC7B64fCD53aED9aE1e065507')
  )
);

CREATE POLICY "No Public Delete Users" ON public.users FOR DELETE USING (false);

-- 2. BANG PRODUCTS: Read cong khai; Insert/Update yeu cau du lieu hop le; Khong Delete
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Insert Products" ON public.products FOR INSERT WITH CHECK (name IS NOT NULL AND category IS NOT NULL);
CREATE POLICY "Public Update Products" ON public.products FOR UPDATE USING (true) WITH CHECK (name IS NOT NULL);
CREATE POLICY "No Public Delete Products" ON public.products FOR DELETE USING (false);

-- 3. BANG BATCHES: Read cong khai; Insert/Update kiem tra ma lo va san pham; Khong Delete
CREATE POLICY "Public Read Batches" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Public Insert Batches" ON public.batches FOR INSERT WITH CHECK (batch_code IS NOT NULL AND product_name IS NOT NULL AND producer IS NOT NULL);
CREATE POLICY "Public Update Batches" ON public.batches FOR UPDATE USING (true) WITH CHECK (batch_code IS NOT NULL);
CREATE POLICY "No Public Delete Batches" ON public.batches FOR DELETE USING (false);

-- 4. BANG BATCH_HISTORY: Audit Trail bat bien, Chi Insert, Cam Update va Delete
CREATE POLICY "Public Read Batch History" ON public.batch_history FOR SELECT USING (true);
CREATE POLICY "Public Insert Batch History" ON public.batch_history FOR INSERT WITH CHECK (batch_code IS NOT NULL AND step_name IS NOT NULL AND recorder IS NOT NULL);
CREATE POLICY "No Public Update Batch History" ON public.batch_history FOR UPDATE USING (false);
CREATE POLICY "No Public Delete Batch History" ON public.batch_history FOR DELETE USING (false);

-- 5. BANG CERTIFICATES: Chung nhan OCOP bat bien, Chi Insert, Cam Update va Delete
CREATE POLICY "Public Read Certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Public Insert Certificates" ON public.certificates FOR INSERT WITH CHECK (batch_code IS NOT NULL AND inspector IS NOT NULL AND note IS NOT NULL);
CREATE POLICY "No Public Update Certificates" ON public.certificates FOR UPDATE USING (false);
CREATE POLICY "No Public Delete Certificates" ON public.certificates FOR DELETE USING (false);

-- 6. BANG SYNC_LOGS: Nhat ky dong bo, Chi Read va Insert, Cam Update va Delete
CREATE POLICY "Public Read Sync Logs" ON public.sync_logs FOR SELECT USING (true);
CREATE POLICY "Public Insert Sync Logs" ON public.sync_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "No Public Update Sync Logs" ON public.sync_logs FOR UPDATE USING (false);
CREATE POLICY "No Public Delete Sync Logs" ON public.sync_logs FOR DELETE USING (false);

-- KICH HOAT REALTIME SUPABASE CHO CAC BANG
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.users,
    public.products,
    public.batches,
    public.batch_history,
    public.certificates,
    public.sync_logs;
COMMIT;
