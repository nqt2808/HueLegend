# HueLegend — hai vi Admin tren Sepolia

> Trang thai: da cap nhat **ma nguon**, chua deploy hop dong moi, chua thay doi du lieu Sepolia cu.

> Ban cap nhat 08/11/2026: da sua loi chu tieng Viet bi ma hoa sai trong `src/components/AdminTab.tsx` (vi du `Quáº£n Trá»‹` thanh `Quản Trị`) va bo sung `test/text-encoding.test.cjs` de ngan tai phat. Sau khi dong bo, nhan `Ctrl+Shift+R` tren trinh duyet neu van thay noi dung cu do cache.

> Bo sung: danh sach RBAC trong trang Admin nay duoc tai lai tu su kien `RoleAssigned`/`RoleRevoked` cua dung hop dong Sepolia sau khi Admin ket noi, khong con chi duoc luu trong React state. Neu goi role da thanh cong, refresh trang khong xoa quyen tren blockchain; tuy nhien nguoi dung van phai chu dong chon vai tro va tai khoan MetaMask sau khi refresh.

> Neu vi thu hai da co `ROLE_ADMIN` tren hop dong cu nhung khong vao duoc khu vuc Admin, do la gioi han `onlyOwner` cua bytecode hien tai, khong phai do trang web xoa role. Khong gia mao quyen bang localStorage, khong hardcode bo qua kiem tra. Khi thay doi contract can duoc Owner xac nhan phuong an giu lich su va ky quy cu.

## 1. Dia chi duoc cau hinh

| Vi | Quyen tren ProjectCore moi |
| --- | --- |
| `0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c` | Owner + ROLE_ADMIN |
| `0x82d022a704706B2f144863D619D7418F8a0f19A7` | ROLE_ADMIN |

- Ca hai vi deu co the mo trang Admin, cap/thu hoi role, doi phi tao lo, doi vi quy, doi thoi han khoa ky quy va lam cac nghiep vu Producer / Inspector / Logistics / Retailer.
- Viec `transferOwnership` cua OpenZeppelin `Ownable` van **chi Owner** goi duoc; day la quyen so huu cap cao hon quyen quan tri ung dung.
- Neu Admin bi thu hoi `ROLE_ADMIN`, lan xac minh vi tiep theo se khoa quyen.
- Quan trong: Admin khong duoc giai thich thanh co quyen rut ETH cua vi nguoi khac. Ham `withdrawStake` chi rut so du cua `msg.sender`.

## Nguyen tac cap vai tro cho bat ky vi nao

- `grantRole(wallet, ROLE_ADMIN)`: vi duoc cap co the quan tri phan quyen, doi phi va thao tac tat ca khu vuc Producer, Inspector, Logistics, Retailer. Khong phu thuoc danh sach vi duoc hardcode; hai vi khoi tao chi la vai tro ban dau.
- `grantRole(wallet, ROLE_PRODUCER)`: vi co quyen tao lo va ghi chang Producer, nhung van phai dap ung quy tac coc va phi cua Producer.
- `grantRole(wallet, ROLE_INSPECTOR)`: vi co quyen kiem dinh, thu hoi chung nhan va ghi chang Inspector.
- `grantRole(wallet, ROLE_LOGISTICS)`: vi co quyen ghi chang van chuyen.
- `grantRole(wallet, ROLE_RETAILER)`: vi co quyen ghi chang/niem yet ban le; doanh thu/checkout on-chain hien chua duoc trien khai.
- Moi vai tro da cap la trang thai cua hop dong tren Sepolia, khong phai du lieu luu tren trinh duyet. Tai lai trang phai chon lai vi MetaMask; quyen thuc te duoc xac minh lai tu `hasRole`.
- `hasRole` cho biet **quyen co hieu luc** (Admin duoc ke thua tat ca vai tro). `hasDirectRole` cho biet vai tro **duoc gan rieng**, dung de kiem tra chinh xac cap/thu hoi. Thu hoi vai tro con cua Admin khong lam mat quyen ke thua; muon khoa quyen quan tri phai thu hoi `ROLE_ADMIN` (Owner van co quyen cao nhat).
- Smart contract tu choi role hash khong thuoc nam vai tro duoc ho tro va khong cho ghi chang mang role gia mao.
- **Chi ap dung sau khi trien khai bytecode moi**. Hien tai dia chi Sepolia cu van co gioi han `onlyOwner`, khong the sua bang frontend hay git push.

## 2. Tai sao can deploy hop dong moi?

Hop dong Sepolia cu `0xd689c22E4Fa4B8C80F374EF0F19D4Be6A5210f4C` dung `onlyOwner` cho quan tri. `grantRole(vi, ROLE_ADMIN)` tren hop dong cu **khong** cap cac quyen `onlyOwner`.

ProjectCore khong co proxy nang cap. Thay doi Solidity va build website **khong thay bytecode** tren dia chi cu. Muon hai vi tu dang nhap va quan tri doc lap phai deploy ProjectCore moi, sau do chuyen cau hinh frontend/API sang dia chi moi.

**Du lieu cu khong tu di chuyen:** lo hang, checkpoint, kiem dinh, vai tro, ky quy va dia chi QR tham chieu hop dong cu. Can sao luu va quyet dinh chuyen du lieu truoc khi deploy. Sao chep lo bang giao dich moi khong the giu nguyen `block.timestamp`, `msg.sender`, gas hay transaction hash cu. Khong tu tuong la lich su cu da duoc sao chep nguyen ven.

## 3. Kiem tra local

Mo PowerShell tai thu muc du an da giai nen:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run compile:contract
npm.cmd run build
```

`src/constants.ts` hien van tro den hop dong **cu** de giu trang thai du lieu dang dung. Quyen Admin thu hai tren frontend chi duoc mo sau khi hop dong moi tra `isAdmin(address) == true`; tren hop dong cu se khong duoc mo nham.

## 4. Kiem thu quyen truoc khi doi frontend

1. **Owner:** `isAdmin(owner)` la `true`, `grantRole` / `setBatchCreationFee` thanh cong.
2. **Admin thu hai:** `isAdmin(admin2)` la `true`, vao day du tab va goi cac ham quan tri thanh cong.
3. **Vi khong co quyen:** `isAdmin(randomWallet)` la `false`; goi `grantRole` / `setBatchCreationFee` phai revert `UnauthorizedCaller`. Chon vai tro Admin tren web khong duoc mo cac tab rieng.
4. **Thu hoi:** khi `ROLE_ADMIN` bi thu hoi khoi Admin thu hai, hanh dong quan tri tiep theo phai revert va giao dien phai khoa khi cap nhat quyen.
5. **Doi mang/vi:** khi chuyen khoi Sepolia hoac khoa MetaMask, moi tab/hành dong dac quyen phai bi khoa.

Test unit/local va compile chua thay the kiem thu giao dich tren hop dong moi tai Sepolia.

## 5. Deploy bang MetaMask (chi sau khi chap nhan phuong an di chuyen du lieu)

```powershell
npm.cmd run dev
```

Truy cap `http://localhost:3000/deploy.html`. Chon vi Owner ban dau va Sepolia, kiem tra chi phi testnet, roi xac nhan deploy neu thuc su muon tao hop dong moi. Giao dien deploy yeu cau xac nhan canh bao va kiem tra ca hai Admin sau giao dich truoc khi cap nhat file dia chi.

Neu thanh cong, cong cu cap nhat `src/constants.ts` va `deployments/sepolia-latest.json`; `api/ipfs-metadata.js` uu tien dia chi tu deployment manifest khi khong co `HUELEGEND_CONTRACT_ADDRESS` trong moi truong.

**Bat buoc:** neu tren may/hosting co `HUELEGEND_CONTRACT_ADDRESS`, phai doi bien moi truong do sang dia chi moi (hoac xoa override), sau do khoi dong lai server. Khi deploy GitHub/Vercel, commit ca `src/constants.ts` va `deployments/sepolia-latest.json` da xac nhan, cap nhat URL/QR can thiet. Khong commit `PINATA_JWT`, private key hoac seed phrase.

## 6. Dong bo vao `Desktop\HueLegend` ma khong xoa folder cu

Giai nen `HueLegend-multi-admin-release.zip` truc tiep ra Desktop. Goi co hai phan:

- `Patch-only`: chi cac file thay doi, nen dung de cap nhat du an dang co.
- `Full-project`: ban du an day du de doi chieu; **khong ghi de nguyen thu muc Desktop cu** neu chua backup.

Trong PowerShell:

```powershell
$dst = "$env:USERPROFILE\Desktop\HueLegend"
$src = "$env:USERPROFILE\Desktop\HueLegend-multi-admin-release\Patch-only"
$backup = "$env:USERPROFILE\Desktop\HueLegend-backup-$(Get-Date -Format yyyyMMdd-HHmmss)"

if (!(Test-Path "$src\package.json")) { throw "Sai thu muc nguon: $src" }
if (Test-Path $dst) { robocopy $dst $backup /E /R:2 /W:2 }

# Xem truoc, CHUA chep
robocopy $src $dst /E /L /R:2 /W:2 /XD node_modules .git dist /XF .env .env.local .env.production
```

Sau khi da xem preview va xac nhan backup day du, xoa `/L` de sao chep:

```powershell
robocopy $src $dst /E /R:2 /W:2 /XD node_modules .git dist /XF .env .env.local .env.production
```

**Khong dung `/MIR` hay `/PURGE`**. `robocopy /E` khong xoa thu muc chi co o dich (vi du `web` neu no van con o may m). Nhung no co the **ghi de cac file trung ten**, vi vay backup va xem truoc la bat buoc.
