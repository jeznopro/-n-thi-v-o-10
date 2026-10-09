@echo off
chcp 65001 >nul
title KHỞI TẠO LẠI DỮ LIỆU MẪU MÔN TOÁN THCS
color 0E

echo ==============================================================================
echo            KHỞI TẠO LẠI DỮ LIỆU MẪU (SEED DATABASE)
echo ==============================================================================
echo.
echo CẢNH BÁO: Thao tác này sẽ nạp lại tài khoản giáo viên, học sinh và bài tập mẫu!
echo.
set /p confirm="Bạn có chắc chắn muốn nạp lại dữ liệu không? (Y/N): "
if /i "%confirm%" neq "Y" (
    echo Đã hủy thao tác.
    pause
    exit /b
)

cd /d "%~dp0"
node src/database/seed.js

echo.
echo ==============================================================================
echo Đã khôi phục dữ liệu mẫu thành công!
echo Giáo viên: giaovien / Giaovien@123
echo Học sinh:  hs_tranvanb, hs_lethic, hs_phamvand / Hocsinh@123
echo ==============================================================================
pause
