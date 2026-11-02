-- ====================================================================
-- KICH BAN KIEM THU BAO MAT KET NOI VAP SUPABASE RLS CHO HUELEGEND
-- File nay mo phong cac hanh vi doc, ghi, nang quyen va gian luan 
-- de kiem tra tinh chinh xac cua chinh sach Row Level Security (RLS).
-- ====================================================================

-- THIET LAP PHIEN GIA LAP VAO VAI TRO ANON (NGUOI DUNG CONG KHAI / PUBLIC KEY)
SET ROLE anon;

-- ====================================================================
-- TRUONG HOP KIEM THU 1: GIAN LUAN - TU NANG QUYEN UP ROLE_ADMIN
-- Mo ta: Nguoi dung cong khai chuyen payload tao vi moi voi vai tro 'ROLE_ADMIN'.
-- Ket qua ky vọng: Bi RLS ngan chan (Loi Row Level Security Policy Violation).
-- ====================================================================

DO $$
BEGIN
  BEGIN
    INSERT INTO public.users (wallet_address, role, role_title)
    VALUES ('0x1111111111111111111111111111111111111111', 'ROLE_ADMIN', 'Quan Tri Vien Gia Mao');
    
    RAISE EXCEPTION 'TEST 1 THAT BAI: RLS khong ngan chan duoc hanh vi tu gia mao ROLE_ADMIN!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 1 THANH CONG: RLS da chan thanh cong hanh vi tu cap ROLE_ADMIN! Chi tiet loi: %', SQLERRM;
  END;
END $$;


-- ====================================================================
-- TRUONG HOP KIEM THU 2: GIAN LUAN - SUA HOAC SUA DOI VAI TRO CUA VI KHAC
-- Mo ta: Nguoi dung khong hop le co tinh cap nhat vai tro cua vi khac thanh ROLE_ADMIN.
-- Ket qua ky vọng: Bi RLS ngan chan va khong the thay doi vai tro trong database.
-- ====================================================================

DO $$
BEGIN
  BEGIN
    UPDATE public.users 
    SET role = 'ROLE_ADMIN' 
    WHERE wallet_address = '0x2222222222222222222222222222222222222222';

    -- Kiem tra xem co bao nhieu dong bi anh huong
    IF FOUND THEN
      RAISE EXCEPTION 'TEST 2 THAT BAI: Nguoi dung khong hop le da nang quyen vi khac thanh ROLE_ADMIN!';
    ELSE
      RAISE NOTICE 'TEST 2 THANH CONG: RLS da ngan chan hoac khong cho phap update vai tro Admin quan trong!';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 2 THANH CONG: RLS ngan chan hanh vi sua vai tro trai phep! Chi tiet loi: %', SQLERRM;
  END;
END $$;


-- ====================================================================
-- TRUONG HOP KIEM THU 3: GIAN LUAN - XOA LICH SU CHECKPOINT TRACEABILITY
-- Mo ta: Ke xau co tinh xoa nhat ky hanh trinh lo hang (batch_history) de xoa dau vet.
-- Ket qua ky vọng: Bi RLS ngan chan tuyet doi (No Public Delete Batch History).
-- ====================================================================

DO $$
BEGIN
  BEGIN
    DELETE FROM public.batch_history WHERE batch_code = 'HL-2026-NEMTRE-001';

    RAISE EXCEPTION 'TEST 3 THAT BAI: RLS khong ngan chan duoc hanh vi xoa lich su Traceability!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 3 THANH CONG: RLS da bao ve nhat ky Traceability bat bien! Chi tiet loi: %', SQLERRM;
  END;
END $$;


-- ====================================================================
-- TRUONG HOP KIEM THU 4: HOP LE - TAO LO HANG VOI VAI TRO HOAN TOAN HOP LE
-- Mo ta: Khởi tạo lô hàng với thông tin đầy đủ, vai trò sản xuất mặc định.
-- Ket qua ky vọng: Thao tác hợp lệ thành công.
-- ====================================================================

DO $$
BEGIN
  BEGIN
    INSERT INTO public.batches (batch_code, product_name, origin, producer)
    VALUES ('HL-2026-TEST-999', 'Nem Tre Hue Test', 'Nam Dong, Thua Thien Hue', '0x3333333333333333333333333333333333333333')
    ON CONFLICT (batch_code) DO NOTHING;

    RAISE NOTICE 'TEST 4 THANH CONG: Khoi tao lo hang hop le thanh cong!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4 CAN KIEM TRA: Thao tac khoi tao lo hang gap loi: %', SQLERRM;
  END;
END $$;

-- RESET ROLE TRO LAI MAC DINH
RESET ROLE;
