/**
 * Tiện ích dùng chung cho toàn bộ giao diện hệ thống
 */

// Định dạng thời gian hiển thị thân thiện tiếng Việt
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.includes('T') && !str.includes('Z')) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return dateStr;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

// Chống tấn công XSS và escape HTML an toàn cho toàn bộ ứng dụng
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Đếm số từ trong đoạn văn bản
function countWords(str) {
  if (!str) return 0;
  // Xóa các thẻ HTML nếu có
  const clean = str.replace(/<[^>]*>/g, ' ').trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

// Chuyển đổi Markdown và Công thức Toán KaTeX sang HTML chuẩn hoàn chỉnh
// Xử lý triệt để lỗi hiển thị mã LaTeX thô (\[ \], \( \), $$, $) do ngắt dòng <br>
function formatMathAndMarkdown(rawText) {
  if (!rawText) return '';
  let str = String(rawText);

  const mathBlocks = [];

  // 1. Thu thập Display Math: \[ ... \] hoặc $$ ... $$
  str = str.replace(/\\\[([\s\S]*?)\\\]/g, (match, code) => {
    const id = `___MATH_BLOCK_${mathBlocks.length}___`;
    mathBlocks.push({ type: 'display', code: code.trim() });
    return id;
  });
  str = str.replace(/\$\$([\s\S]*?)\$\$/g, (match, code) => {
    const id = `___MATH_BLOCK_${mathBlocks.length}___`;
    mathBlocks.push({ type: 'display', code: code.trim() });
    return id;
  });

  // 2. Thu thập Inline Math: \( ... \) hoặc $ ... $
  str = str.replace(/\\\(([\s\S]*?)\\\)/g, (match, code) => {
    const id = `___MATH_BLOCK_${mathBlocks.length}___`;
    mathBlocks.push({ type: 'inline', code: code.trim() });
    return id;
  });
  str = str.replace(/\$([^\$\n]+?)\$/g, (match, code) => {
    const id = `___MATH_BLOCK_${mathBlocks.length}___`;
    mathBlocks.push({ type: 'inline', code: code.trim() });
    return id;
  });

  // 3. Xử lý Markdown cơ bản: in đậm, nghiêng, ngắt dòng
  str = str
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n+/g, '<div style="height: 8px;"></div>')
    .replace(/\n/g, '<br>');

  // 4. Render Math bằng KaTeX và điền trở lại
  mathBlocks.forEach((item, index) => {
    const placeholder = `___MATH_BLOCK_${index}___`;
    let rendered = '';
    if (typeof katex !== 'undefined' && typeof katex.renderToString === 'function') {
      try {
        rendered = katex.renderToString(item.code, {
          displayMode: item.type === 'display',
          throwOnError: false
        });
        if (item.type === 'display') {
          rendered = `<div class="katex-display-block" style="margin: 8px 0; overflow-x: auto; text-align: center;">${rendered}</div>`;
        }
      } catch (e) {
        rendered = item.type === 'display' ? `$$${item.code}$$` : `$${item.code}$`;
      }
    } else {
      rendered = item.type === 'display' ? `$$${item.code}$$` : `$${item.code}$`;
    }
    str = str.replace(placeholder, rendered);
  });

  return str;
}

// Render công thức Toán học KaTeX trên toàn bộ hoặc một phần tử cụ thể
function renderMath(element = document.body) {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(element, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  }
}

// Phóng to ảnh bài làm viết tay (Lightbox Viewer)
function openLightbox(imgSrc) {
  let lightbox = document.getElementById('global-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'global-lightbox';
    lightbox.className = 'image-lightbox';
    lightbox.innerHTML = `
      <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
      <img id="lightbox-img" src="" alt="Ảnh bài làm phóng to" />
    `;
    document.body.appendChild(lightbox);

    lightbox.onclick = (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
        closeLightbox();
      }
    };
  }

  document.getElementById('lightbox-img').src = imgSrc;
  lightbox.classList.add('active');
}

function closeLightbox() {
  const lightbox = document.getElementById('global-lightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
  }
}

// Kiểm tra quyền và tải thông tin người dùng vào Navbar
async function checkAuthAndLoad(expectedRole = null) {
  try {
    const res = await apiRequest('/api/auth/me');
    const user = res.user;

    // Lưu vào localStorage để truy cập nhanh
    localStorage.setItem('user', JSON.stringify(user));

    // Kiểm tra đúng vai trò
    if (expectedRole && user.role !== expectedRole) {
      if (user.role === 'teacher') {
        window.location.href = '/teacher/index.html';
      } else {
        window.location.href = '/student/index.html';
      }
      return null;
    }

    // Hiển thị thông tin lên Navbar
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    const userAvatarEl = document.querySelector('.user-avatar');

    if (userNameEl) userNameEl.textContent = user.full_name;
    if (userRoleEl) userRoleEl.textContent = user.role === 'teacher' ? 'Giáo viên Toán' : 'Học sinh';
    if (userAvatarEl) userAvatarEl.textContent = user.full_name.charAt(0).toUpperCase();

    // Gắn sự kiện nút đăng xuất
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = async (e) => {
        e.preventDefault();
        const confirmLogout = await showConfirm('Đăng xuất', 'Thầy/Cô có chắc chắn muốn đăng xuất khỏi hệ thống không?');
        if (confirmLogout) {
          try {
            await apiRequest('/api/auth/logout', { method: 'POST' });
          } catch (e) {
            // bỏ qua
          }
          localStorage.clear();
          window.location.href = '/login.html';
        }
      };
    }

    // Toggle menu di động
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (mobileToggle && navMenu) {
      mobileToggle.onclick = () => {
        navMenu.classList.toggle('show');
      };
    }

    return user;
  } catch (error) {
    console.error('Lỗi kiểm tra phiên:', error);
    return null;
  }
}
