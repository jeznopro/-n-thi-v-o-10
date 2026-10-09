# HỆ THỐNG LÀM BÀI TỰ LUẬN MÔN TOÁN THCS

Hệ thống web hoàn chỉnh dành cho **Giáo viên và Học sinh THCS**:
- 📌 **Soạn đề & Hiển thị theo từng câu hỏi**: Giao diện rộng che gần ngang màn hình, thanh chuyển câu hỏi linh hoạt.
- 📐 **Hỗ trợ công thức Toán học**: Trình soạn thảo và hiển thị chuẩn LaTeX/KaTeX (căn thức, phân số, hình học, góc, tam giác, đường tròn).
- 📸 **Chèn ảnh bài làm riêng dưới từng câu**: Học sinh chụp ảnh bài giải viết tay, vẽ hình học và đính kèm trực tiếp dưới câu hỏi tương ứng.
- 💬 **Đánh giá & Nhận xét định tính (Không chấm điểm số)**: Giáo viên xem chi tiết từng câu cùng ảnh bài làm, gửi nhận xét/lời phê cho học sinh, hỗ trợ yêu cầu nộp lại bài khi cần và xuất danh sách ra Excel.
- ⏱️ **Tự động lưu nháp mỗi 30 giây**, đếm ngược thời gian làm bài, tự nộp khi hết giờ.

---

## 🚀 1. Hướng dẫn chạy trên Windows (1-Click)

Bạn chỉ cần **nhấp đúp chuột vào file**:
👉 **`CHAY_HE_THONG.bat`**

File này sẽ tự động:
1. Kiểm tra môi trường Node.js.
2. Tự động khởi động máy chủ Web Server trên cổng **5000**.
3. Tự động mở trình duyệt và đưa bạn vào thẳng trang đăng nhập: `http://localhost:5000`.

---

## 🔑 2. Tài khoản thử nghiệm có sẵn

Ngay tại trang đăng nhập, có sẵn **nút chọn nhanh tài khoản**:
- **Giáo viên Toán (Admin):**
  - Tên đăng nhập: `giaovien`
  - Mật khẩu: `Giaovien@123` *(Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên)*
- **Học sinh:**
  - `hs_tranvanb` / `Hocsinh@123` (Trần Văn Bình - Lớp 9A)
  - `hs_lethic` / `Hocsinh@123` (Lê Thị Cúc - Lớp 9A)
  - `hs_phamvand` / `Hocsinh@123` (Phạm Văn Dũng - Lớp 9A)

---

## 📱 3. Cho học sinh trong cùng mạng Wi-Fi làm bài
- Máy tính của bạn đang mở hệ thống, học sinh có thể dùng điện thoại kết nối chung Wi-Fi và truy cập địa chỉ IP máy bạn:
  👉 **`http://192.168.34.4:5000`** *(hoặc địa chỉ IP hiển thị khi chạy lệnh ipconfig)*.

---

## 🌐 4. Ứng dụng này có Deploy (đưa lên mạng) trên Vercel được không?

### ⚠️ Câu trả lời: **KHÔNG NÊN dùng Vercel trực tiếp cho kiến trúc này**, lý do:
1. **Vercel là môi trường Serverless (Không có ổ cứng lưu trữ cố định - Ephemeral Filesystem):**
   - Dự án hiện đang dùng **SQLite lưu thành 1 file cục bộ** (`data/database.sqlite`) và thư mục upload ảnh bài làm viết tay (`uploads/`).
   - Trên Vercel, sau mỗi vài phút không có truy cập hoặc khi hàm serverless khởi động lại container mới, **toàn bộ file SQLite và ảnh học sinh vừa nộp sẽ bị mất trắng**!
   - Thư viện `better-sqlite3` là mã nguồn C++ biên dịch (Native Addon), chạy trên môi trường Serverless Edge của Vercel thường bị lỗi biên dịch nhị phân.

---

## 🌟 5. Các giải pháp đưa lên mạng TỐT NHẤT & MIỄN PHÍ

### Cách 1: Dùng Render.com (Khuyên dùng số 1 - Miễn phí, 100% tương thích)
- Render hỗ trợ dịch vụ **Node.js Web Service** có máy chủ hoạt động liên tục (Persistent).
- Các bước:
  1. Đẩy code lên GitHub.
  2. Đăng nhập [render.com](https://render.com) -> Chọn **New Web Service** -> Chọn Repository GitHub của bạn.
  3. Cài đặt:
     - **Runtime:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Environment Variable:** `PORT=5000`, `JWT_SECRET=mat_khau_bao_mat_cua_ban`
  4. Render sẽ cấp cho bạn một đường link miễn phí dạng: `https://ten-du-an.onrender.com` có HTTPS để gửi cho học sinh làm bài từ bất kỳ đâu.

### Cách 2: Biến máy tính của bạn thành Server bằng Cloudflare Tunnel (Miễn phí & Không cần hosting)
Bạn muốn cho học sinh ở nhà làm bài mà không cần đưa code lên mạng:
1. Tải công cụ **Cloudflare Tunnel (cloudflared)** hoặc **Localtunnel**:
   ```bash
   npx localtunnel --port 5000
   ```
2. Bạn sẽ nhận được ngay một liên kết công khai (Ví dụ: `https://toan-thcs-online.loca.lt`).
3. Gửi link đó cho học sinh làm bài trực tiếp trên máy của bạn mà không tốn một đồng chi phí nào!
