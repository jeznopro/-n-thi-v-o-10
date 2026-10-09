@echo off
chcp 65001 >nul
title MỞ LINK ONLINE CHO HỌC SINH - CLOUDFLARE TUNNEL
cls
echo ======================================================================
echo 🌐 ĐANG KHỞI TẠO ĐƯỜNG LINK ONLINE BẢO MẬT (HTTPS) QUA CLOUDFLARE...
echo ======================================================================
echo.
echo ⚠️  LƯU Ý QUAN TRỌNG:
echo  - Hãy chắc chắn rằng bạn đã chạy CHAY_HE_THONG.bat trước!
echo  - Giữ cửa sổ này mở trong suốt thời gian học sinh làm bài thi.
echo.
echo Đang kết nối tới máy chủ Cloudflare toàn cầu...
echo.

if not exist cloudflared.exe (
    echo [LỖI] Không tìm thấy file cloudflared.exe!
    pause
    exit /b
)

.\cloudflared.exe tunnel --url http://localhost:5000
pause
