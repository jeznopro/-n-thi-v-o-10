@echo off
chcp 65001 >nul
title HỆ THỐNG LÀM BÀI TỰ LUẬN MÔN TOÁN THCS
color 0B

echo ==============================================================================
echo              HỆ THỐNG LÀM BÀI TỰ LUẬN MÔN TOÁN THCS
echo ==============================================================================
echo.

:: Di chuyển vào thư mục chứa file bat
cd /d "%~dp0"

:: Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Máy tính của bạn chưa cài Node.js!
    echo Vui lòng tải và cài đặt Node.js từ: https://nodejs.org
    echo.
    pause
    exit /b
)

:: Kiểm tra node_modules
if not exist "node_modules\" (
    echo [THÔNG BÁO] Đang cài đặt thư viện lần đầu... Vui lòng chờ ít giây...
    call npm install
    echo.
)

:: Kiểm tra database, nếu chưa có thì seed dữ liệu
if not exist "data\database.sqlite" (
    echo [THÔNG BÁO] Khởi tạo cơ sở dữ liệu mẫu...
    call npm run seed
    echo.
)

echo [1/2] Đang khởi động máy chủ Web Server trên cổng 5000...
echo [2/2] Đang tự động mở trình duyệt...
echo.

:: Tự động bật trình duyệt sau 2 giây
start "" "http://localhost:5000"

echo ==============================================================================
echo 📡 Máy tính hiện tại truy cập: http://localhost:5000
echo 🌐 Điện thoại (cùng mạng Wi-Fi): Xem địa chỉ IP máy bạn (VD: http://192.168.34.4:5000)
echo.
echo ⚠️  HÃY GIỮ CỬA SỔ NÀY MỞ KHI ĐANG DÙNG HỆ THỐNG.
echo    (Đóng cửa sổ này để tắt hệ thống)
echo ==============================================================================
echo.

:: Chạy server
node src/server.js

pause
