# Ra soat ban ZIP HueLegend-Huelegend-van (08/11/2026)

## Nguon va ket luan

- Nguon doi chieu: `HueLegend-Huelegend-van (1).zip` do nguoi dung gui, cac tep chu yeu duoc cap nhat ngay 02/11/2026.
- Nen tang hien tai: React + Vite + TypeScript, source tren `main` da co phan quyen on-chain, metadata IPFS, quan ly kho, chat luong va buoc van chuyen.
- **Khong thay the toan bo source hien tai bang ZIP cu**: viec do se lam mat cac tinh nang va ban sua bao mat moi hon.

## Nhung phan duoc giu / hoan thien

| Hang muc | Xu ly |
|---|---|
| `admin.html` cua ban web cu | Tao `public/admin.html` va `web/admin.html` chuyen ve SPA chinh, vi chi thay tab Admin khi co quyen da xac minh on-chain. Khong mo quyen qua URL. |
| File ABI rieng `ProjectCore_abi.json` | Sinh tu cung ket qua bien dich `ProjectCore.sol`, khong sua ABI bang tay; phat hanh tai `public/` va `web/`. |
| Mau cau hinh moi truong | Bo sung `.env.example` cho RPC Sepolia, IPFS gateway va PINATA_JWT phia server; khong dua secret vao client. |
| Huong dan cap nhat Windows | Su dung `git pull --ff-only` va `npm run build:web` tu repo o Desktop, sao luu truoc neu co thay doi local. |
| Kiem thu tuong thich | Them kiem tra trang admin cu, dong bo ABI, secret server va ca gian lan quyen bang du lieu Supabase. |

## Nhung phan chua the nhap an toan tu ZIP cu

1. **`supabase_schema.sql`, `src/lib/supabase.ts` va cac service lien quan:** chinh sach RLS trong ban cu cho phep public ghi / sua du lieu quan trong, va role do client gui co the bi mao danh. Can thiet ke dang nhap bang chu ky vi, kiem tra nonce va rang buoc role on-chain o backend truoc khi khoi phuc.
2. **`api/sync.ts` va hang doi offline:** endpoint ban cu co the phan hoi thanh cong khi chua luu thuc. Khong duoc hien thong bao da dong bo khi khong co xac nhan luu du lieu.
3. **Mo phong `simulatedRole`, role trong localStorage va du lieu mau:** khong duoc dung de cap quyen hoac tao lich su blockchain. Quyen thuc te phai doc tu `owner()`, `isAdmin()` va `hasRole()` cua contract dung mang.
4. **Thanh toan, don hang, escrow va rut phi:** ban ZIP cu mo phong hash giao dich va khong co hop dong thanh toan tuong ung. Can chot mo hinh thanh toan, ben nhan tien, co che hoan tien va backend don hang truoc khi phat trien.
5. **Quan tri da vi tren Sepolia:** contract moi trong source ho tro nhieu Admin, nhung dia chi Sepolia hien tai `0xd689c22E4Fa4B8C80F374EF0F19D4Be6A5210f4C` van la bytecode cu dung `onlyOwner`. Chua deploy / chuyen du lieu / cap quyen tren hop dong moi. Xem `docs/MULTI_ADMIN_DEPLOY.md`.

## Nguyen tac xac minh

- Vi duoc cap mot vai tro chi mo **nhung quyen cua vai tro do**; vi co nhieu vai tro nhan **hop** quyen. Admin hop le tren contract moi ke thua toan bo quyen nghiep vu.
- Sau khi refresh, doi tai khoan, doi mang hoac thu hoi quyen, web doc lai thong tin tu blockchain; khong phuc hoi quyen tu cache. Client chi kiem tra UX; smart contract la noi thuc thi ranh gioi bao mat.
- Khong cong bo khoa rieng, seed phrase, `PINATA_JWT` hoac token dich vu len GitHub.

## Lenh kiem tra

```powershell
cd "$env:USERPROFILE\Desktop\HueLegend"
npm.cmd test
npm.cmd run build:web
```

Ket qua phai duoc kiem tra lai tren may nguoi dung va bang vi Sepolia that; test source khong thay the nghiem thu ket noi on-chain hay audit hop dong.
