/**
 * Client API Wrapper với tự động xử lý Cookie, Bearer Token và phản hồi lỗi
 */
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;

  const defaultHeaders = {
    'Accept': 'application/json'
  };

  // Nếu gửi JSON và body là string thì thêm Content-Type
  if (options.body && typeof options.body === 'string' && !options.headers?.['Content-Type']) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Đính kèm token lưu ở localStorage nếu có
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    },
    credentials: 'include' // Luôn gửi HttpOnly cookie kèm theo
  };

  try {
    const response = await fetch(url, config);

    // Xử lý download file (Excel, Binary)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('spreadsheet') || contentType.includes('octet-stream')) {
      if (!response.ok) {
        throw new Error('Lỗi khi tải tệp từ máy chủ.');
      }
      return await response.blob();
    }

    const data = await response.json();

    // Nếu mã lỗi 401: Chưa đăng nhập hoặc hết phiên
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login.html')) {
        window.location.href = '/login.html?expired=1';
      }
      throw new Error(data.message || 'Phiên làm việc đã kết thúc.');
    }

    // Nếu bị bắt buộc đổi mật khẩu lần đầu
    if (response.status === 403 && data.code === 'MUST_CHANGE_PASSWORD') {
      if (!window.location.pathname.includes('/change-password.html')) {
        window.location.href = '/change-password.html';
      }
      throw new Error(data.message);
    }

    if (!response.ok) {
      throw new Error(data.message || `Lỗi máy chủ (${response.status})`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Hiển thị thông báo Toast đẹp mắt
 * @param {string} message Nội dung thông báo
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {string} [title] Tiêu đề
 */
function showToast(message, type = 'info', title = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const titles = {
    success: 'Thành công',
    error: 'Đã xảy ra lỗi',
    warning: 'Cảnh báo',
    info: 'Thông báo'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-content">
      <div class="toast-title">${title || titles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  // Tự động ẩn sau 4 giây
  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Hộp thoại xác nhận tùy biến (Promise-based Confirm Dialog)
 */
function showConfirm(title, message, confirmText = 'Xác nhận', cancelText = 'Hủy bỏ') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay active';
    overlay.innerHTML = `
      <div class="custom-modal">
        <div class="custom-modal-header">
          <h3 class="custom-modal-title">${title}</h3>
          <button class="toast-close" id="modal-close-btn">&times;</button>
        </div>
        <div class="custom-modal-body">${message}</div>
        <div class="custom-modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn">${cancelText}</button>
          <button class="btn btn-primary" id="modal-confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (result) => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 250);
      resolve(result);
    };

    overlay.querySelector('#modal-confirm-btn').onclick = () => cleanup(true);
    overlay.querySelector('#modal-cancel-btn').onclick = () => cleanup(false);
    overlay.querySelector('#modal-close-btn').onclick = () => cleanup(false);
  });
}
