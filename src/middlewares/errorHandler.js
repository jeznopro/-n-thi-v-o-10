/**
 * Middleware bắt và xử lý lỗi tập trung
 */
function errorHandler(err, req, res, next) {
  console.error('Lỗi hệ thống:', err);

  // Lỗi do Multer upload file
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Dung lượng tệp vượt quá giới hạn tối đa cho phép (25MB).'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Lỗi tải tệp: ${err.message}`
    });
  }

  // Lỗi cú pháp JSON request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu JSON gửi lên không hợp lệ.'
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.'
  });
}

module.exports = errorHandler;
