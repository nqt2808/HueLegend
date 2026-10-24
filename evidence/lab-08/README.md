# BẰNG CHỨNG THỰC HÀNH LAB 8 — DỰ ÁN HUELEGEND

- **Học phần:** Tiền điện tử & Hợp đồng thông minh (ECO2432)
- **Tên dự án nhóm:** **HueLegend** — Truy xuất nguồn gốc đặc sản Huế trên Blockchain
- **Thành viên nhóm (2 người):**
  1. **Ngô Thị Thuỷ Vân** — MSV: `23K4300023`
  2. **Ngô Quỳnh Trang** — MSV: `23K4300041`
- **Tiêu đề commit nộp bài:**
  ```bash
  lab-08: khoi tao codebase nhom va dac ta v0.1
  ```

---

## 1. Sản phẩm nộp theo yêu cầu Lab 8

### 1.1. Một câu giới thiệu sản phẩm và chủ đề đã chọn (Checkpoint 1):
> *"Nhóm xây HueLegend cho các cơ sở làng nghề và du khách mua đặc sản Huế để minh bạch lịch sử nguồn gốc từng lô hàng qua mã QR bất biến trên blockchain."*

### 1.2. Danh mục tài liệu nộp:
1. [`PROJECT_PLAN.md`](../../docs/PROJECT_PLAN.md):
   - Phân công đủ 4 vai (Đặc tả, Hợp đồng, Giao diện, Kiểm thử) và có kế hoạch xoay vai trước Lab 15.
   - Định nghĩa rõ Người dùng và vấn đề.
   - Các mốc bắt buộc từ Lab 9 đến Lab 15.
2. [`SPEC.md`](../../docs/SPEC.md):
   - Đặc tả v0.1 với đầy đủ 4 quy tắc có thể kiểm thử (Ai làm gì, khi nào, giới hạn, lỗi thì sao).
3. [`ECONOMIC_RULES.md`](../../docs/ECONOMIC_RULES.md):
   - Đủ 4 mục bắt buộc: Dòng tiền/quyền lợi, Giới hạn chống lạm dụng, Quyền quản trị, Tình huống người dùng bị thiệt.
4. [`AI_JOURNAL.md`](../../docs/AI_JOURNAL.md):
   - Thực hiện đúng prompt phản biện đóng vai người dùng thận trọng, nêu 5 cách lạm dụng và nhóm giải trình sửa quy tắc / chấp nhận rủi ro có lộ trình.
5. [`README.md`](../../README.md):
   - Trả lời đầy đủ 4 câu hỏi chuẩn đầu ra cho người lạ mở repo.

---

## 2. Mã nguồn và Giao diện đã chuẩn bị

- Smart Contract lõi: [`ProjectCore.sol`](../../contracts/project/ProjectCore.sol) (Solidity ^0.8.20, CEI, chú thích tiếng Việt không dấu).
- Bộ kiểm thử: [`ProjectCore.test.js`](../../test/ProjectCore.test.js) (Bao gồm ca kiểm thử gian lận TC-03).
- Giao diện DApp: [`web/index.html`](../../web/index.html) (Phong cách Cố Đô hoàng gia, sinh mã QR động và Timeline).
- Bài học kỹ thuật: [`contracts/training/`](../../contracts/training/) (Chuẩn bị cho Lab 9, 10, 13).

---

## 3. Nhật ký kiểm tra Commit nhóm
*(Đảm bảo toàn bộ các thành viên đều có commit trong lịch sử git của repository)*.
