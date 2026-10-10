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

// ============================================================
// HỆ THỐNG CHUYỂN ĐỔI GIAO DIỆN (DROPDOWN MENU HIỂN THỊ DANH SÁCH)
// ============================================================
const THEMES_INFO = {
  cozy: {
    name: 'Thư viện ấm',
    icon: '🏛️',
    desc: 'Cozy Library • Trầm lắng & Dễ đọc'
  },
  classic: {
    name: 'Hiện đại',
    icon: '⚡',
    desc: 'Classic Blue • Trực quan & Năng động'
  },
  minimal: {
    name: 'Tối giản',
    icon: '◻️',
    desc: 'Minimalism • Đơn sắc & Tập trung'
  }
};

function getCurrentTheme() {
  return localStorage.getItem('app-theme') || 'cozy';
}

function applyTheme(theme) {
  document.documentElement.classList.remove('theme-classic', 'theme-cozy', 'theme-minimal');
  document.body.classList.remove('theme-classic', 'theme-cozy', 'theme-minimal');

  if (theme === 'classic') {
    document.documentElement.classList.add('theme-classic');
    document.body.classList.add('theme-classic');
  } else if (theme === 'minimal') {
    document.documentElement.classList.add('theme-minimal');
    document.body.classList.add('theme-minimal');
  } else {
    document.documentElement.classList.add('theme-cozy');
    document.body.classList.add('theme-cozy');
  }
  localStorage.setItem('app-theme', theme);
  updateThemeSwitcherUI(theme);
  updateBrandTexts(theme);
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
}

function toggleAppTheme() {
  const current = getCurrentTheme();
  const themes = ['cozy', 'classic', 'minimal'];
  const nextIdx = (themes.indexOf(current) + 1) % themes.length;
  applyTheme(themes[nextIdx]);
}

function updateThemeSwitcherUI(theme) {
  const info = THEMES_INFO[theme] || THEMES_INFO['cozy'];
  document.querySelectorAll('.theme-current-icon').forEach(el => el.textContent = info.icon);
  document.querySelectorAll('.theme-current-text').forEach(el => el.textContent = info.name);

  document.querySelectorAll('.theme-dropdown-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelectorAll(`.theme-opt-${theme}`).forEach(item => {
    item.classList.add('active');
  });
}

function updateBrandTexts(theme) {
  const logoEl = document.querySelector('.brand-logo');
  const brandTitleEl = document.querySelector('.brand-text h1');
  const brandSubEl = document.querySelector('.brand-text p');
  const avatarEl = document.querySelector('.user-avatar');

  if (theme === 'classic') {
    if (logoEl) {
      logoEl.innerHTML = '∑';
      logoEl.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      logoEl.style.color = '#FFFFFF';
    }
    if (brandTitleEl) brandTitleEl.textContent = 'TOÁN THCS';
    if (brandSubEl) {
      brandSubEl.textContent = window.location.pathname.includes('exam.html') ? 'Phòng Làm Bài Trực Tuyến' : 'Cổng Học Sinh';
    }
    if (avatarEl) avatarEl.style.background = '#10b981';
  } else if (theme === 'minimal') {
    if (logoEl) {
      logoEl.innerHTML = 'TL';
      logoEl.style.background = 'var(--text-main)';
      logoEl.style.color = 'var(--bg-page)';
    }
    if (brandTitleEl) brandTitleEl.textContent = 'TỰ LUẬN';
    if (brandSubEl) brandSubEl.textContent = 'Học tập & Ôn luyện';
    if (avatarEl) avatarEl.style.background = '#2563EB';
  } else {
    if (logoEl) {
      logoEl.innerHTML = '🏛️';
      logoEl.style.background = '#788268';
      logoEl.style.color = '#FFFCF5';
    }
    if (brandTitleEl) brandTitleEl.textContent = 'THƯ VIỆN TOÁN 9';
    if (brandSubEl) brandSubEl.textContent = 'Phòng Ôn Thi Vào 10';
    if (avatarEl) avatarEl.style.background = '#788268';
  }
}

function getThemeDropdownHTML(current) {
  const currentInfo = THEMES_INFO[current] || THEMES_INFO['cozy'];
  return `
    <button type="button" class="theme-dropdown-trigger" aria-haspopup="true" aria-expanded="false" onclick="toggleThemeDropdown(event)" title="Bấm để chọn phong cách giao diện">
      <span class="theme-current-icon">${currentInfo.icon}</span>
      <span class="theme-current-text">${currentInfo.name}</span>
      <svg class="theme-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    <div class="theme-dropdown-menu">
      <div class="theme-dropdown-header">Chọn phong cách giao diện</div>
      ${Object.keys(THEMES_INFO).map(key => {
        const item = THEMES_INFO[key];
        const isActive = key === current;
        return `
          <div class="theme-dropdown-item theme-opt-${key} ${isActive ? 'active' : ''}" onclick="selectTheme('${key}', event)">
            <div class="theme-item-left">
              <span class="theme-item-icon">${item.icon}</span>
              <div>
                <div class="theme-item-title">${item.name}</div>
                <div class="theme-item-desc">${item.desc}</div>
              </div>
            </div>
            <span class="theme-check">✓</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function toggleThemeDropdown(e) {
  if (e) e.stopPropagation();
  const wrapper = e.currentTarget.closest('.theme-dropdown-wrapper');
  if (!wrapper) return;
  const menu = wrapper.querySelector('.theme-dropdown-menu');
  const trigger = wrapper.querySelector('.theme-dropdown-trigger');
  
  const isOpen = menu.classList.contains('show');
  closeThemeDropdowns();
  
  if (!isOpen) {
    menu.classList.add('show');
    trigger.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  }
}

function closeThemeDropdowns() {
  document.querySelectorAll('.theme-dropdown-menu').forEach(m => m.classList.remove('show'));
  document.querySelectorAll('.theme-dropdown-trigger').forEach(t => {
    t.classList.remove('open');
    t.setAttribute('aria-expanded', 'false');
  });
}

function selectTheme(theme, e) {
  if (e) e.stopPropagation();
  applyTheme(theme);
  closeThemeDropdowns();
}

function mountThemeSwitcher() {
  const current = getCurrentTheme();

  // 1. Nếu có container dành riêng trên trang login
  const loginSwitcher = document.getElementById('login-theme-switcher');
  if (loginSwitcher) {
    loginSwitcher.className = 'theme-dropdown-wrapper';
    loginSwitcher.innerHTML = getThemeDropdownHTML(current);
  }

  // 2. Chèn vào navbar ứng dụng nếu chưa có
  if (document.getElementById('app-theme-switcher')) return;

  const navUser = document.querySelector('.nav-user');
  const navContainer = document.querySelector('.nav-container');

  if (navUser || navContainer) {
    const switcher = document.createElement('div');
    switcher.id = 'app-theme-switcher';
    switcher.className = 'theme-dropdown-wrapper';
    switcher.innerHTML = getThemeDropdownHTML(current);

    if (navUser) {
      navUser.insertBefore(switcher, navUser.firstChild);
    } else if (navContainer) {
      navContainer.appendChild(switcher);
    }
  }
}

// Đóng dropdown khi bấm ra ngoài hoặc nhấn Esc
document.addEventListener('click', (e) => {
  if (!e.target.closest('.theme-dropdown-wrapper')) {
    closeThemeDropdowns();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeThemeDropdowns();
  }
});

// Chạy khởi tạo lớp Theme ngay lập tức để tránh chớp màn hình (FOUC)
(function initThemeImmediately() {
  const saved = localStorage.getItem('app-theme') || 'cozy';
  document.documentElement.classList.add(`theme-${saved}`);
})();

// Khi tài liệu tải xong, gắn giao diện nút chuyển đổi và áp dụng các thành phần giao diện
document.addEventListener('DOMContentLoaded', () => {
  const current = getCurrentTheme();
  applyTheme(current);
  mountThemeSwitcher();
});
