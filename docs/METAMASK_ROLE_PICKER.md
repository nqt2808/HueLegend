# Ket noi vai tro: yeu cau MetaMask chon lai tai khoan

## Thay doi

Khi bam **Ket noi vi > Chon vai tro** (hoac **Doi vai tro lam viec** tu vi dang ket noi):

1. HueLegend khoa menu rieng trong trang thai `connecting`.
2. Goi `wallet_requestPermissions` voi `eth_accounts`, yeu cau MetaMask hien hop chon/xac nhan tai khoan ngay ca khi trang web da tung duoc cap quyen.
3. Chi sau khi MetaMask tra ket qua cho phep, HueLegend moi doc tai khoan hien tai va mang.
4. Chuyen Sepolia neu can, sau do doc `owner()` va `hasRole()` tren hop dong de quyet dinh menu theo vai tro duoc chon.
5. Neu nguoi dung tu choi, MetaMask khong ho tro yeu cau chon lai, vi bi khoa, hoac RPC loi, khong tu dang nhap vi cu, menu nghiep vu van khoa.

Khong goi `eth_requestAccounts` khi bam ket noi nua vi API nay co the tra ve vi da duoc cap quyen ma khong hien bang chon lai.

**Luu y:** MetaMask va mot so vi khac co the hien popup khac nhau theo phien ban; ung dung da yeu cau hop chon tai khoan theo EIP-2255 nhung khong the dieu khien giao dien cua tien ich vi. Truong hop nha cung cap khong ho tro, ung dung dung o trang thai Guest thay vi tu su dung tai khoan cu.

HueLegend van kiem tra lai quyen mot cach lang le **sau khi da ket noi thanh cong** (khi doi mang, tai khoan, quay lai tab, va dinh ky) de phat hien quyen bi thu hoi. Viec nay khong phai auto-login, khong bao gio tu mo phien Guest.

## Kiem tra tren PowerShell

```powershell
Set-Location "$env:USERPROFILE\Desktop\HueLegend-MetaMask\HueLegend-main"
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

Kiem tra thu cong tren Chrome/MetaMask:

1. **Vi cu:** ket noi Producer voi vi A, ngat ket noi tren web, bam Ket noi > Producer. MetaMask phai hoi chon/xac nhan lai; web khong tu mo vi A truoc khi chon.
2. **Doi vi:** khi hop MetaMask mo, chon vi B khong co quyen Producer. Web chi cho phep khu vuc Customer, khong ke thua quyen cua vi A.
3. **Gian lan/tu choi:** mo hop chon vi, bam Cancel. Web ve Guest, chi thay cac menu cong khai.
4. **Tai lai trang:** F5 khi extension da co quyen ket noi. Web van la Guest cho den khi nguoi dung tu bam Ket noi > Chon vai tro.
5. **Rut quyen:** khi dang o Producer, Owner thu hoi role tren smart contract; thao tac nghiep vu tiep theo phai bi tu choi.

Neu MetaMask khong hien popup, kiem tra icon tien ich tren thanh cong cu va cua so MetaMask dang cho xu ly. Khong vo hieu hoa co che bao mat, khong can xoay vong permission bang cach xoa du lieu trinh duyet.
