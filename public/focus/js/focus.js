/**
 * Focus OS — Quiet Academic Edition
 * Engine: Local State Management, Wall-clock Pomodoro Timer, Markdown Notes & Academic Analytics
 */

// =============================================================================
// 1. DATA MODEL & SEED DATA
// =============================================================================
const STORAGE_KEY = 'focus_os_academic_data_v1';

const DEFAULT_ACADEMIC_DATA = {
  subjects: [
    {
      id: 'sub-1',
      name: 'Sinh lý học (Physiology)',
      desc: 'Nghiên cứu cơ chế điều hòa nội môi, dẫn truyền tín hiệu tế bào và hệ thần kinh tự chủ.',
      createdAt: Date.now() - 86400000 * 14
    },
    {
      id: 'sub-2',
      name: 'Giải phẫu học (Anatomy)',
      desc: 'Cấu trúc định khu đầu mặt cổ, hệ vận động, giải phẫu lâm sàng tạng ngực bụng.',
      createdAt: Date.now() - 86400000 * 12
    },
    {
      id: 'sub-3',
      name: 'Toán cao cấp & Giải tích',
      desc: 'Không gian Banach, giải tích Fourier, phương trình vi phân và tối ưu hóa.',
      createdAt: Date.now() - 86400000 * 10
    },
    {
      id: 'sub-4',
      name: 'Triết học khoa học',
      desc: 'Nhận thức luận của Karl Popper, Thomas Kuhn và phương pháp tư duy phản biện.',
      createdAt: Date.now() - 86400000 * 8
    }
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Đọc và tóm tắt cơ chế truyền tin tế bào (Cell signaling pathways)',
      subjectId: 'sub-1',
      durationMinutes: 45,
      dueDate: new Date().toISOString().split('T')[0],
      isPriority: true,
      completed: false,
      completedAt: null,
      createdAt: Date.now() - 3600000 * 4
    },
    {
      id: 'task-2',
      title: 'Vẽ sơ đồ phân nhánh đám rối thần kinh cánh tay',
      subjectId: 'sub-2',
      durationMinutes: 30,
      dueDate: new Date().toISOString().split('T')[0],
      isPriority: false,
      completed: false,
      completedAt: null,
      createdAt: Date.now() - 3600000 * 3
    },
    {
      id: 'task-3',
      title: 'Giải 5 bài toán Cauchy phương trình vi phân cấp 2',
      subjectId: 'sub-3',
      durationMinutes: 50,
      dueDate: new Date().toISOString().split('T')[0],
      isPriority: false,
      completed: false,
      completedAt: null,
      createdAt: Date.now() - 3600000 * 2
    },
    {
      id: 'task-4',
      title: 'Đọc chương 3 cuốn Cấu trúc của các cuộc cách mạng khoa học',
      subjectId: 'sub-4',
      durationMinutes: 40,
      dueDate: '',
      isPriority: false,
      completed: true,
      completedAt: Date.now() - 7200000,
      createdAt: Date.now() - 86400000
    }
  ],
  notes: [
    {
      id: 'note-1',
      title: 'Cơ chế truyền tin qua thụ thể G-Protein (GPCR)',
      subjectId: 'sub-1',
      content: `# Cơ chế truyền tin qua thụ thể bắt cặp G-Protein (GPCR)

## 1. Giới thiệu tổng quan
Thụ thể bắt cặp G-protein (GPCRs) là họ thụ thể màng tế bào lớn nhất và đa dạng nhất ở sinh vật nhân thực. Chúng cảm nhận các phân tử bên ngoài tế bào và kích hoạt các con đường truyền tín hiệu nội bào.

> *"To understand life at the molecular level is to understand the language of chemical cascades."*

### 2. Các thành phần chính của con đường
- **Phối tử (Ligand)**: Hormone, chất dẫn truyền thần kinh, hạt mùi hoặc ánh sáng.
- **Thụ thể 7 đoạn xuyên màng (7-TM receptor)**: Thay đổi cấu hình không gian khi gắn phối tử.
- **Protein G dị dị diện (Heterotrimeric G-protein)**: Gồm 3 tiểu đơn vị: \`alpha\`, \`beta\`, và \`gamma\`.
- **Chất hiệu ứng (Effector)**: Adenylyl cyclase, Phospholipase C (PLC).

\`\`\`
Ligand + GPCR -> GDP biến thành GTP trên G_alpha -> Phân ly G_alpha khỏi G_beta_gamma -> Hoạt hóa Adenylyl Cyclase -> Tạo cAMP
\`\`\`

### 3. Ý nghĩa dược lý học
Hơn 35% các loại thuốc lưu hành hiện nay trên lâm sàng nhắm vào các thụ thể GPCR, bao gồm thuốc chẹn thụ thể beta giao cảm và kháng histamin.`,
      updatedAt: Date.now() - 3600000 * 2
    },
    {
      id: 'note-2',
      title: 'Không gian Hilbert và Định lý biểu diễn Riesz',
      subjectId: 'sub-3',
      content: `# Không gian Hilbert và Định lý biểu diễn Riesz

## 1. Khái niệm cơ bản
Một không gian Hilbert là không gian tích trong đầy đủ đối với chuẩn cảm sinh từ tích trong đó:

\`\`\`
||x|| = sqrt(<x, x>)
\`\`\`

### 2. Định lý Riesz-Frechet
Mọi phiếm hàm tuyến tính liên tục \`f\` trên không gian Hilbert \`H\` đều có thể biểu diễn duy nhất dưới dạng:
- \`f(x) = <x, y>\` với một phần tử \`y\` duy nhất thuộc \`H\`.
- Hơn nữa, \`||f|| = ||y||\`.

Đây là nền tảng tối quan trọng cho cơ học lượng tử và phương pháp phần tử hữu hạn.`,
      updatedAt: Date.now() - 86400000
    }
  ],
  sessions: [
    {
      id: 'ses-1',
      taskTitle: 'Đọc chương 3 cuốn Cấu trúc của các cuộc cách mạng khoa học',
      subjectName: 'Triết học khoa học',
      durationMinutes: 40,
      timestamp: Date.now() - 7200000
    },
    {
      id: 'ses-2',
      taskTitle: 'Tổng hợp sơ đồ điều hòa canxi huyết',
      subjectName: 'Sinh lý học (Physiology)',
      durationMinutes: 25,
      timestamp: Date.now() - 86400000 * 1 - 3600000 * 3
    },
    {
      id: 'ses-3',
      taskTitle: 'Giải bài tập không gian metric',
      subjectName: 'Toán cao cấp & Giải tích',
      durationMinutes: 50,
      timestamp: Date.now() - 86400000 * 2 - 3600000 * 2
    },
    {
      id: 'ses-4',
      taskTitle: 'Học cơ vùng mông và đùi sau',
      subjectName: 'Giải phẫu học (Anatomy)',
      durationMinutes: 35,
      timestamp: Date.now() - 86400000 * 3 - 3600000 * 5
    }
  ]
};

// Application State
let appData = loadData();
let activeView = 'today';
let activeNoteId = null;
let currentFilter = 'all';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveData(DEFAULT_ACADEMIC_DATA);
      return JSON.parse(JSON.stringify(DEFAULT_ACADEMIC_DATA));
    }
    const parsed = JSON.parse(raw);
    return {
      subjects: parsed.subjects || DEFAULT_ACADEMIC_DATA.subjects,
      tasks: parsed.tasks || DEFAULT_ACADEMIC_DATA.tasks,
      notes: parsed.notes || DEFAULT_ACADEMIC_DATA.notes,
      sessions: parsed.sessions || DEFAULT_ACADEMIC_DATA.sessions
    };
  } catch (err) {
    console.warn('Lỗi đọc dữ liệu Focus OS, sử dụng mặc định:', err);
    return JSON.parse(JSON.stringify(DEFAULT_ACADEMIC_DATA));
  }
}

function saveData(dataToSave) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave || appData));
  } catch (err) {
    console.error('Không thể lưu dữ liệu:', err);
  }
}

// =============================================================================
// 2. WALL-CLOCK POMODORO TIMER ENGINE
// =============================================================================
const timer = {
  durationSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  isRunning: false,
  targetEndTime: null,
  timerInterval: null,
  activeTaskId: null,
  activeTaskTitle: 'Tập trung nghiên cứu chuyên sâu',
  activeSubjectName: 'Học thuật'
};

function initTimer() {
  const digitsEl = document.getElementById('focus-timer-digits');
  const fillEl = document.getElementById('focus-progress-fill');
  const toggleBtn = document.getElementById('btn-timer-toggle');
  const resetBtn = document.getElementById('btn-timer-reset');
  const finishBtn = document.getElementById('btn-timer-finish');
  const exitBtn = document.getElementById('btn-exit-focus');
  const overlayEl = document.getElementById('focus-overlay');
  const pills = document.querySelectorAll('.preset-pill');

  function updateDisplay() {
    const mins = Math.floor(timer.remainingSeconds / 60);
    const secs = timer.remainingSeconds % 60;
    digitsEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // Progress calculation
    const progress = ((timer.durationSeconds - timer.remainingSeconds) / timer.durationSeconds) * 100;
    fillEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;

    // Title document update
    if (timer.isRunning) {
      document.title = `(${digitsEl.textContent}) Focus OS — Quiet Academic`;
    } else {
      document.title = 'Focus OS — Quiet Academic Edition';
    }
  }

  function start() {
    if (timer.isRunning) return;
    timer.isRunning = true;
    timer.targetEndTime = Date.now() + timer.remainingSeconds * 1000;
    toggleBtn.textContent = '⏸';
    toggleBtn.title = 'Tạm dừng (Phím Space)';

    timer.timerInterval = setInterval(() => {
      const now = Date.now();
      const remainingMs = Math.max(0, timer.targetEndTime - now);
      timer.remainingSeconds = Math.ceil(remainingMs / 1000);
      updateDisplay();

      if (remainingMs <= 0) {
        completeTimer();
      }
    }, 250);
  }

  function pause() {
    if (!timer.isRunning) return;
    timer.isRunning = false;
    clearInterval(timer.timerInterval);
    toggleBtn.textContent = '▶';
    toggleBtn.title = 'Tiếp tục (Phím Space)';
    document.title = 'Focus OS — Quiet Academic Edition';
  }

  function toggle() {
    if (timer.isRunning) {
      pause();
    } else {
      start();
    }
  }

  function reset() {
    pause();
    timer.remainingSeconds = timer.durationSeconds;
    updateDisplay();
  }

  function setDuration(minutes) {
    pause();
    timer.durationSeconds = minutes * 60;
    timer.remainingSeconds = timer.durationSeconds;
    updateDisplay();
  }

  function completeTimer() {
    pause();
    playGentleChime();

    // Log study session
    const elapsedMinutes = Math.max(1, Math.round(timer.durationSeconds / 60));
    logStudySession(timer.activeTaskTitle, timer.activeSubjectName, elapsedMinutes);

    showToast(`Phiên tập trung ${elapsedMinutes} phút hoàn thành xuất sắc! 🖋️`);
    reset();
  }

  function earlyFinish() {
    const elapsedSeconds = timer.durationSeconds - timer.remainingSeconds;
    const elapsedMinutes = Math.round(elapsedSeconds / 60);

    if (elapsedMinutes >= 1) {
      logStudySession(timer.activeTaskTitle, timer.activeSubjectName, elapsedMinutes);
      showToast(`Đã ghi nhận ${elapsedMinutes} phút vào sổ nhật ký học tập.`);
    } else {
      showToast('Phiên tập trung chưa đủ 1 phút, chưa ghi nhận nhật ký.');
    }
    reset();
    overlayEl.classList.remove('active');
  }

  // Event Listeners
  toggleBtn.addEventListener('click', toggle);
  resetBtn.addEventListener('click', reset);
  finishBtn.addEventListener('click', earlyFinish);

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const mins = parseInt(pill.dataset.minutes, 10);
      setDuration(mins);
    });
  });

  exitBtn.addEventListener('click', () => {
    overlayEl.classList.remove('active');
  });

  // Spacebar toggle when overlay active
  window.addEventListener('keydown', (e) => {
    if (overlayEl.classList.contains('active')) {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        toggle();
      } else if (e.code === 'Escape') {
        overlayEl.classList.remove('active');
      }
    }
  });

  updateDisplay();

  return {
    openWithTask: (task) => {
      timer.activeTaskId = task ? task.id : null;
      timer.activeTaskTitle = task ? task.title : 'Tập trung nghiên cứu chuyên sâu';
      const subj = task ? appData.subjects.find(s => s.id === task.subjectId) : null;
      timer.activeSubjectName = subj ? subj.name : 'Tất cả lĩnh vực';

      document.getElementById('focus-overlay-task-title').textContent = timer.activeTaskTitle;
      document.getElementById('focus-overlay-subject').textContent = timer.activeSubjectName;

      // Reset to task estimated duration if given
      if (task && task.durationMinutes) {
        setDuration(task.durationMinutes);
      }

      overlayEl.classList.add('active');
    }
  };
}

let timerEngine = null;

// Gentle Academic Chime using Web Audio API
function playGentleChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Chord note: E5 -> G#5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(830.61, audioCtx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } catch (err) {
    console.log('Audio chime not available:', err);
  }
}

function logStudySession(taskTitle, subjectName, durationMinutes) {
  const newSession = {
    id: 'ses-' + Date.now(),
    taskTitle: taskTitle || 'Nghiên cứu độc lập',
    subjectName: subjectName || 'Chung',
    durationMinutes: durationMinutes || 25,
    timestamp: Date.now()
  };
  appData.sessions.unshift(newSession);
  saveData();
  renderTodayView();
  renderProgressView();
}

// =============================================================================
// 3. VIEW MANAGEMENT & ROUTING
// =============================================================================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.dataset.view;
      if (!targetView) return;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      sections.forEach(sec => {
        sec.classList.remove('active');
        if (sec.id === `view-${targetView}`) {
          sec.classList.add('active');
        }
      });

      activeView = targetView;
      renderCurrentView();
    });
  });

  // Quick Focus from Sidebar
  document.getElementById('btn-quick-focus').addEventListener('click', () => {
    const priorityTask = appData.tasks.find(t => t.isPriority && !t.completed) || appData.tasks.find(t => !t.completed);
    timerEngine.openWithTask(priorityTask);
  });
}

function renderCurrentView() {
  updateBadges();
  if (activeView === 'today') renderTodayView();
  if (activeView === 'tasks') renderTasksView();
  if (activeView === 'subjects') renderSubjectsView();
  if (activeView === 'notes') renderNotesView();
  if (activeView === 'progress') renderProgressView();
}

function updateBadges() {
  const todayTasks = getTodayTasks();
  const pendingTasks = appData.tasks.filter(t => !t.completed);

  const bToday = document.getElementById('badge-today-count');
  const bTasks = document.getElementById('badge-tasks-count');
  const bSubj = document.getElementById('badge-subjects-count');
  const bNotes = document.getElementById('badge-notes-count');

  if (bToday) bToday.textContent = todayTasks.filter(t => !t.completed).length;
  if (bTasks) bTasks.textContent = pendingTasks.length;
  if (bSubj) bSubj.textContent = appData.subjects.length;
  if (bNotes) bNotes.textContent = appData.notes.length;
}

function getTodayTasks() {
  const todayStr = new Date().toISOString().split('T')[0];
  return appData.tasks.filter(t => t.isPriority || t.dueDate === todayStr);
}

// =============================================================================
// 4. TODAY VIEW RENDERER
// =============================================================================
function renderTodayView() {
  // 1. Current Date
  const dateEl = document.getElementById('today-current-date');
  if (dateEl) {
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    dateEl.textContent = `${days[now.getDay()]}, ngày ${now.getDate()} tháng ${now.getMonth() + 1}, năm ${now.getFullYear()}`;
  }

  // 2. Priority Box
  const priorityContainer = document.getElementById('today-priority-container');
  const priorityTask = appData.tasks.find(t => t.isPriority && !t.completed) || appData.tasks.find(t => !t.completed);

  if (priorityTask) {
    const subj = appData.subjects.find(s => s.id === priorityTask.subjectId);
    priorityContainer.innerHTML = `
      <div class="priority-box">
        <div style="flex:1;">
          <div class="priority-label">Nhiệm vụ trọng tâm số 1</div>
          <h2 class="priority-task-title">${escapeHTML(priorityTask.title)}</h2>
          <div class="priority-meta">
            <span>📚 ${subj ? escapeHTML(subj.name) : 'Học thuật'}</span>
            <span>·</span>
            <span>⏳ ${priorityTask.durationMinutes || 25} phút dự kiến</span>
            ${priorityTask.dueDate ? `<span>· 📅 Hạn: ${priorityTask.dueDate}</span>` : ''}
          </div>
        </div>
        <div class="priority-actions">
          <button class="btn btn-secondary btn-sm" id="btn-priority-complete" title="Đánh dấu hoàn thành">✓ Hoàn tất</button>
          <button class="btn btn-primary" id="btn-priority-start">⏳ Bắt đầu Focus</button>
        </div>
      </div>
    `;

    document.getElementById('btn-priority-start').addEventListener('click', () => {
      timerEngine.openWithTask(priorityTask);
    });

    document.getElementById('btn-priority-complete').addEventListener('click', () => {
      priorityTask.completed = true;
      priorityTask.completedAt = Date.now();
      saveData();
      renderTodayView();
      showToast('Đã hoàn thành nhiệm vụ trọng tâm!');
    });
  } else {
    priorityContainer.innerHTML = `
      <div class="priority-box" style="border-left-color:var(--border);">
        <div>
          <div class="priority-label" style="color:var(--text-secondary);">Thảnh thơi</div>
          <h2 class="priority-task-title">Không còn nhiệm vụ trọng tâm nào đang chờ</h2>
          <div class="priority-meta">Mọi công việc hôm nay đã hoàn thành hoặc chưa được giao việc.</div>
        </div>
        <div>
          <button class="btn btn-secondary btn-sm" id="btn-create-first-priority">+ Tạo nhiệm vụ mới</button>
        </div>
      </div>
    `;
    const btn = document.getElementById('btn-create-first-priority');
    if (btn) btn.addEventListener('click', openTaskModal);
  }

  // 3. Today Tasks Notebook
  const taskListEl = document.getElementById('today-task-list');
  const todayTasks = getTodayTasks();

  if (todayTasks.length === 0) {
    taskListEl.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-secondary); font-style:italic;">Chưa có nhiệm vụ nào cho hôm nay. Dùng ô nhập bên dưới để thêm nhanh.</div>`;
  } else {
    taskListEl.innerHTML = todayTasks.map(task => renderTaskItemHTML(task)).join('');
    bindTaskItemEvents(taskListEl);
  }

  // 4. Quick add input
  const quickInput = document.getElementById('input-quick-add-today');
  quickInput.onkeydown = (e) => {
    if (e.key === 'Enter' && quickInput.value.trim()) {
      const newTask = {
        id: 'task-' + Date.now(),
        title: quickInput.value.trim(),
        subjectId: appData.subjects.length > 0 ? appData.subjects[0].id : '',
        durationMinutes: 25,
        dueDate: new Date().toISOString().split('T')[0],
        isPriority: appData.tasks.filter(t => !t.completed).length === 0,
        completed: false,
        completedAt: null,
        createdAt: Date.now()
      };
      appData.tasks.unshift(newTask);
      saveData();
      quickInput.value = '';
      renderTodayView();
      showToast('Đã thêm nhiệm vụ hôm nay.');
    }
  };

  // 5. Today Study Logs
  renderTodayStudyLogs();
}

function renderTodayStudyLogs() {
  const logListEl = document.getElementById('today-study-logs');
  const totalEl = document.getElementById('today-logged-total');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaySessions = appData.sessions.filter(s => s.timestamp >= startOfDay.getTime());
  const totalMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  totalEl.textContent = `${hours} giờ ${String(mins).padStart(2, '0')} phút`;

  if (todaySessions.length === 0) {
    logListEl.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-tertiary); font-style:italic;">Chưa có phiên tập trung nào hoàn thành trong ngày hôm nay.</div>`;
  } else {
    logListEl.innerHTML = todaySessions.map(ses => {
      const d = new Date(ses.timestamp);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `
        <div class="study-log-item">
          <span class="log-time">${timeStr}</span>
          <span class="log-subject">${escapeHTML(ses.subjectName)} · <span style="font-weight:400; color:var(--text-secondary);">${escapeHTML(ses.taskTitle)}</span></span>
          <span class="log-duration">${ses.durationMinutes} phút</span>
        </div>
      `;
    }).join('');
  }
}

// =============================================================================
// 5. TASKS VIEW & FILTERING
// =============================================================================
function renderTasksView() {
  const container = document.getElementById('all-tasks-list');
  const searchInput = document.getElementById('task-search-input');
  const query = (searchInput.value || '').toLowerCase().trim();

  let filtered = appData.tasks;

  if (currentFilter === 'today') {
    const todayStr = new Date().toISOString().split('T')[0];
    filtered = filtered.filter(t => t.dueDate === todayStr || t.isPriority);
  } else if (currentFilter === 'pending') {
    filtered = filtered.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    filtered = filtered.filter(t => t.completed);
  }

  if (query) {
    filtered = filtered.filter(t => t.title.toLowerCase().includes(query));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:32px; text-align:center; color:var(--text-secondary); font-style:italic;">Không tìm thấy nhiệm vụ phù hợp.</div>`;
    return;
  }

  container.innerHTML = filtered.map(task => renderTaskItemHTML(task)).join('');
  bindTaskItemEvents(container);
}

function renderTaskItemHTML(task) {
  const subj = appData.subjects.find(s => s.id === task.subjectId);
  return `
    <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <div class="task-left">
        <div class="custom-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle"></div>
        <div>
          <span class="task-title">${escapeHTML(task.title)}</span>
          ${task.isPriority ? '<span style="color:var(--accent); font-size:0.75rem; font-weight:700; margin-left:6px;">★ Ưu tiên</span>' : ''}
        </div>
      </div>
      <div class="task-right">
        ${subj ? `<span class="task-tag">${escapeHTML(subj.name)}</span>` : ''}
        <span class="task-duration">${task.durationMinutes || 25}m</span>
        <button type="button" class="task-action-btn" data-action="focus" title="Bắt đầu Focus">⏳</button>
        <button type="button" class="task-action-btn" data-action="delete" title="Xóa nhiệm vụ">✕</button>
      </div>
    </div>
  `;
}

function bindTaskItemEvents(container) {
  container.querySelectorAll('.task-item').forEach(item => {
    const taskId = item.dataset.id;
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Checkbox toggle
    const checkbox = item.querySelector('[data-action="toggle"]');
    checkbox.addEventListener('click', () => {
      task.completed = !task.completed;
      task.completedAt = task.completed ? Date.now() : null;
      saveData();
      renderCurrentView();
    });

    // Start Focus
    const focusBtn = item.querySelector('[data-action="focus"]');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        timerEngine.openWithTask(task);
      });
    }

    // Delete
    const deleteBtn = item.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Xóa nhiệm vụ "${task.title}"?`)) {
          appData.tasks = appData.tasks.filter(t => t.id !== taskId);
          saveData();
          renderCurrentView();
          showToast('Đã xóa nhiệm vụ.');
        }
      });
    }
  });
}

function initTasksListeners() {
  const filterBtns = document.querySelectorAll('.task-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasksView();
    });
  });

  const searchInput = document.getElementById('task-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderTasksView();
    });
  }

  document.getElementById('btn-tasks-add-task').addEventListener('click', openTaskModal);
  document.getElementById('btn-open-new-task').addEventListener('click', openTaskModal);
}

// =============================================================================
// 6. SUBJECTS VIEW & CRUD
// =============================================================================
function renderSubjectsView() {
  const grid = document.getElementById('subjects-grid-list');
  if (appData.subjects.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-secondary); font-style:italic;">Chưa có môn học nào. Nhấn "+ Thêm môn học" để tạo mới.</div>`;
    return;
  }

  grid.innerHTML = appData.subjects.map(subj => {
    const tasksCount = appData.tasks.filter(t => t.subjectId === subj.id && !t.completed).length;
    
    // Calculate total hours logged in sessions
    const subjectSessions = appData.sessions.filter(s => s.subjectName === subj.name);
    const totalMinutes = subjectSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const hours = (totalMinutes / 60).toFixed(1);

    return `
      <div class="subject-card" data-id="${subj.id}">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <h3 class="subject-name">${escapeHTML(subj.name)}</h3>
            <button type="button" class="task-action-btn" data-action="delete-subject" title="Xóa môn học">✕</button>
          </div>
          <p class="subject-desc">${escapeHTML(subj.desc || 'Không có mô tả')}</p>
        </div>
        <div class="subject-stats-row">
          <span>${tasksCount} việc cần làm</span>
          <span class="subject-hours">${hours} giờ học</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.subject-card').forEach(card => {
    const subjId = card.dataset.id;
    const deleteBtn = card.querySelector('[data-action="delete-subject"]');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const subj = appData.subjects.find(s => s.id === subjId);
      if (confirm(`Bạn có chắc muốn xóa môn "${subj.name}"?`)) {
        appData.subjects = appData.subjects.filter(s => s.id !== subjId);
        saveData();
        renderSubjectsView();
        updateBadges();
        showToast('Đã xóa môn học.');
      }
    });

    // Clicking card filters tasks view to this subject
    card.addEventListener('click', () => {
      document.querySelector('[data-view="tasks"]').click();
      const search = document.getElementById('task-search-input');
      const subj = appData.subjects.find(s => s.id === subjId);
      if (search && subj) {
        search.value = subj.name;
        renderTasksView();
      }
    });
  });
}

function initSubjectListeners() {
  document.getElementById('btn-add-subject').addEventListener('click', () => {
    document.getElementById('form-subject').reset();
    document.getElementById('subject-id').value = '';
    document.getElementById('modal-subject').classList.add('active');
  });

  document.getElementById('form-subject').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('subject-input-name').value.trim();
    const desc = document.getElementById('subject-input-desc').value.trim();

    if (!name) return;

    const newSubj = {
      id: 'sub-' + Date.now(),
      name: name,
      desc: desc,
      createdAt: Date.now()
    };

    appData.subjects.push(newSubj);
    saveData();
    document.getElementById('modal-subject').classList.remove('active');
    renderSubjectsView();
    updateBadges();
    showToast(`Đã thêm môn "${name}".`);
  });
}

// =============================================================================
// 7. NOTES VIEW & MARKDOWN EDITOR / PREVIEW
// =============================================================================
let noteAutoSaveTimeout = null;

function renderNotesView() {
  const listEl = document.getElementById('notes-item-list');
  const searchInput = document.getElementById('note-search-input');
  const query = (searchInput.value || '').toLowerCase().trim();

  // Populate Subject Select in Note Editor
  const subjSelect = document.getElementById('note-subject-select');
  subjSelect.innerHTML = `<option value="">(Không phân loại)</option>` + 
    appData.subjects.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');

  let filtered = appData.notes;
  if (query) {
    filtered = filtered.filter(n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `<li style="padding:20px; text-align:center; color:var(--text-tertiary); font-style:italic;">Không có ghi chép.</li>`;
  } else {
    listEl.innerHTML = filtered.map(note => {
      const isActive = note.id === activeNoteId;
      const snippet = note.content.replace(/#|\*|`|>|-/g, '').slice(0, 60);
      return `
        <li class="note-item ${isActive ? 'active' : ''}" data-id="${note.id}">
          <div class="note-item-title">${escapeHTML(note.title || 'Ghi chép chưa đặt tên')}</div>
          <div class="note-item-snippet">${escapeHTML(snippet || 'Trống...')}</div>
        </li>
      `;
    }).join('');

    listEl.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', () => {
        selectNote(item.dataset.id);
      });
    });
  }

  // If no note selected, select first
  if (!activeNoteId && appData.notes.length > 0) {
    selectNote(appData.notes[0].id);
  } else if (activeNoteId) {
    loadNoteIntoEditor(activeNoteId);
  }
}

function selectNote(noteId) {
  activeNoteId = noteId;
  const items = document.querySelectorAll('.note-item');
  items.forEach(i => i.classList.toggle('active', i.dataset.id === noteId));
  loadNoteIntoEditor(noteId);
}

function loadNoteIntoEditor(noteId) {
  const note = appData.notes.find(n => n.id === noteId);
  if (!note) return;

  const titleInput = document.getElementById('note-title-input');
  const bodyTextarea = document.getElementById('note-body-textarea');
  const subjSelect = document.getElementById('note-subject-select');

  titleInput.value = note.title || '';
  bodyTextarea.value = note.content || '';
  subjSelect.value = note.subjectId || '';

  updateWordCount();
  updateMarkdownPreview();
}

function updateWordCount() {
  const text = document.getElementById('note-body-textarea').value || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  document.getElementById('note-word-count').textContent = `${words} từ · ${chars} ký tự`;
}

// Simple and safe academic Markdown to HTML renderer
function parseMarkdown(md) {
  if (!md) return '';
  let html = escapeHTML(md);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-family:var(--font-serif); font-size:1.15rem; margin:16px 0 8px; color:var(--text-primary);">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-family:var(--font-serif); font-size:1.35rem; margin:20px 0 10px; color:var(--text-primary); border-bottom:1px solid var(--border-light); padding-bottom:4px;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-family:var(--font-serif); font-size:1.7rem; margin:24px 0 12px; color:var(--text-primary);">$1</h1>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote style="border-left:3px solid var(--accent); padding-left:14px; margin:14px 0; color:var(--text-secondary); font-family:var(--font-serif); font-style:italic;">$1</blockquote>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, '<pre style="background:var(--bg-page); border:1px solid var(--border); padding:12px; border-radius:4px; font-family:var(--font-mono); font-size:0.86rem; overflow-x:auto; margin:14px 0;"><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/gim, '<code style="background:var(--bg-page); border:1px solid var(--border); padding:2px 5px; border-radius:3px; font-family:var(--font-mono); font-size:0.85rem;">$1</code>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/gim, '<em>$1</em>');

  // Unordered list
  html = html.replace(/^\- (.*$)/gim, '<li style="margin-left:20px; list-style-type:disc; margin-bottom:4px;">$1</li>');

  // Paragraph breaks
  html = html.replace(/\n\n+/gim, '<p style="margin-bottom:12px;"></p>');
  html = html.replace(/\n/gim, '<br>');

  return html;
}

function updateMarkdownPreview() {
  const content = document.getElementById('note-body-textarea').value;
  const preview = document.getElementById('note-preview-wrapper');
  preview.innerHTML = parseMarkdown(content);
}

function initNotesListeners() {
  const titleInput = document.getElementById('note-title-input');
  const bodyTextarea = document.getElementById('note-body-textarea');
  const subjSelect = document.getElementById('note-subject-select');
  const previewBtn = document.getElementById('btn-toggle-note-mode');
  const previewWrapper = document.getElementById('note-preview-wrapper');
  const editorWrapper = document.getElementById('note-editor-wrapper');
  const searchInput = document.getElementById('note-search-input');

  let isPreview = false;

  previewBtn.addEventListener('click', () => {
    isPreview = !isPreview;
    if (isPreview) {
      updateMarkdownPreview();
      editorWrapper.style.display = 'none';
      previewWrapper.style.display = 'block';
      previewBtn.textContent = '✏️ Biên soạn (Editor)';
    } else {
      editorWrapper.style.display = 'flex';
      previewWrapper.style.display = 'none';
      previewBtn.textContent = '👁️ Xem trước (Preview)';
    }
  });

  function autoSave() {
    clearTimeout(noteAutoSaveTimeout);
    document.getElementById('note-save-status').textContent = 'Đang lưu nháp...';

    noteAutoSaveTimeout = setTimeout(() => {
      if (!activeNoteId) return;
      const note = appData.notes.find(n => n.id === activeNoteId);
      if (note) {
        note.title = titleInput.value.trim() || 'Ghi chép chưa đặt tên';
        note.content = bodyTextarea.value;
        note.subjectId = subjSelect.value;
        note.updatedAt = Date.now();
        saveData();

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        document.getElementById('note-save-status').textContent = `Đã tự động lưu lúc ${timeStr}`;
        updateWordCount();
      }
    }, 600);
  }

  titleInput.addEventListener('input', autoSave);
  bodyTextarea.addEventListener('input', autoSave);
  subjSelect.addEventListener('change', autoSave);

  // Create new note
  document.getElementById('btn-create-note').addEventListener('click', () => {
    const newNote = {
      id: 'note-' + Date.now(),
      title: 'Chuyên đề nghiên cứu mới',
      subjectId: appData.subjects.length > 0 ? appData.subjects[0].id : '',
      content: '# Chuyên đề nghiên cứu mới\n\nBắt đầu ghi chép các ý tưởng và phát hiện học thuật tại đây...',
      updatedAt: Date.now()
    };
    appData.notes.unshift(newNote);
    saveData();
    activeNoteId = newNote.id;
    renderNotesView();
    updateBadges();
    showToast('Đã tạo trang ghi chép mới.');
  });

  // Delete note
  document.getElementById('btn-delete-note').addEventListener('click', () => {
    if (!activeNoteId) return;
    const note = appData.notes.find(n => n.id === activeNoteId);
    if (confirm(`Bạn có chắc muốn xóa ghi chép "${note.title}"?`)) {
      appData.notes = appData.notes.filter(n => n.id !== activeNoteId);
      saveData();
      activeNoteId = appData.notes.length > 0 ? appData.notes[0].id : null;
      renderNotesView();
      updateBadges();
      showToast('Đã xóa ghi chép.');
    }
  });

  document.getElementById('btn-save-note').addEventListener('click', () => {
    autoSave();
    showToast('Đã lưu ghi chép học thuật.');
  });

  searchInput.addEventListener('input', () => {
    renderNotesView();
  });
}

// =============================================================================
// 8. PROGRESS & ACADEMIC ANALYTICS VIEW
// =============================================================================
function renderProgressView() {
  const oneWeekAgo = Date.now() - 7 * 86400000;
  const weekSessions = appData.sessions.filter(s => s.timestamp >= oneWeekAgo);

  const totalMinutes = weekSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const weekHours = (totalMinutes / 60).toFixed(1);

  document.getElementById('metric-week-hours').textContent = `${weekHours}h`;
  document.getElementById('metric-sessions-count').textContent = weekSessions.length;

  // Streak calculation (consecutive days with at least 1 session)
  const streak = calculateStreak();
  document.getElementById('metric-streak-days').textContent = `${streak} ngày`;

  // Render 7-day Bar Chart
  renderWeeklyChart();

  // Render Subject Breakdown
  renderSubjectBreakdown();
}

function calculateStreak() {
  if (appData.sessions.length === 0) return 0;

  const datesWithStudy = new Set();
  appData.sessions.forEach(s => {
    const d = new Date(s.timestamp);
    datesWithStudy.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
  });

  let streak = 0;
  let checkDate = new Date();

  // If didn't study today yet, check if studied yesterday
  const todayKey = `${checkDate.getFullYear()}-${checkDate.getMonth() + 1}-${checkDate.getDate()}`;
  if (!datesWithStudy.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth() + 1}-${checkDate.getDate()}`;
    if (datesWithStudy.has(key)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return Math.max(1, streak);
}

function renderWeeklyChart() {
  const chartContainer = document.getElementById('weekly-chart-bars');
  const daysLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  
  // Calculate hours for each of past 7 days
  const past7Days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const endD = new Date(d);
    endD.setDate(d.getDate() + 1);

    const daySessions = appData.sessions.filter(s => s.timestamp >= d.getTime() && s.timestamp < endD.getTime());
    const dayMins = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const dayHours = (dayMins / 60);

    past7Days.push({
      label: i === 0 ? 'Hôm nay' : daysLabel[d.getDay()],
      hours: dayHours,
      isToday: i === 0
    });
  }

  const maxHours = Math.max(3, ...past7Days.map(p => p.hours));

  chartContainer.innerHTML = past7Days.map(day => {
    const heightPercent = Math.round((day.hours / maxHours) * 100);
    return `
      <div class="chart-bar-group" title="${day.label}: ${day.hours.toFixed(1)} giờ">
        <div class="chart-bar ${day.isToday ? 'active' : ''}" style="height:${Math.max(4, heightPercent)}%;"></div>
        <span class="chart-label">${day.label}</span>
      </div>
    `;
  }).join('');
}

function renderSubjectBreakdown() {
  const container = document.getElementById('subject-progress-breakdown');
  const totalMinutes = appData.sessions.reduce((acc, s) => acc + s.durationMinutes, 0) || 1;

  if (appData.subjects.length === 0) {
    container.innerHTML = `<div style="color:var(--text-tertiary); font-style:italic;">Chưa có dữ liệu môn học.</div>`;
    return;
  }

  container.innerHTML = appData.subjects.map(subj => {
    const subSessions = appData.sessions.filter(s => s.subjectName === subj.name);
    const mins = subSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const percent = Math.round((mins / totalMinutes) * 100);
    const hours = (mins / 60).toFixed(1);

    return `
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-sm); padding:14px 18px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.88rem;">
          <span style="font-weight:600; color:var(--text-primary);">${escapeHTML(subj.name)}</span>
          <span style="font-family:var(--font-mono); color:var(--accent); font-weight:600;">${hours}h (${percent}%)</span>
        </div>
        <div style="width:100%; height:4px; background:var(--border-light); border-radius:999px; overflow:hidden;">
          <div style="width:${percent}%; height:100%; background:var(--accent); border-radius:999px;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================================
// 9. MODALS & DATA MANAGEMENT (IMPORT / EXPORT / RESET)
// =============================================================================
function openTaskModal() {
  const form = document.getElementById('form-task');
  form.reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-input-date').value = new Date().toISOString().split('T')[0];

  // Subject options
  const subjSelect = document.getElementById('task-input-subject');
  subjSelect.innerHTML = `<option value="">(Chung / Không môn học)</option>` + 
    appData.subjects.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');

  document.getElementById('modal-task').classList.add('active');
}

function initModals() {
  // Cancel buttons for all modals
  document.querySelectorAll('.modal-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  // Task form submit
  document.getElementById('form-task').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-input-title').value.trim();
    const subjId = document.getElementById('task-input-subject').value;
    const duration = parseInt(document.getElementById('task-input-duration').value, 10) || 25;
    const dueDate = document.getElementById('task-input-date').value;
    const isPriority = document.getElementById('task-input-priority').checked;

    if (!title) return;

    // If marked priority, unset previous priority tasks
    if (isPriority) {
      appData.tasks.forEach(t => t.isPriority = false);
    }

    const newTask = {
      id: 'task-' + Date.now(),
      title,
      subjectId: subjId,
      durationMinutes: duration,
      dueDate,
      isPriority,
      completed: false,
      completedAt: null,
      createdAt: Date.now()
    };

    appData.tasks.unshift(newTask);
    saveData();
    document.getElementById('modal-task').classList.remove('active');
    renderCurrentView();
    showToast('Đã lưu nhiệm vụ mới.');
  });

  // Settings button
  document.getElementById('btn-open-settings').addEventListener('click', () => {
    document.getElementById('modal-settings').classList.add('active');
  });

  // Export Backup
  document.getElementById('btn-export-backup').addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `focus_os_academic_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã tải xuống tệp sao lưu dữ liệu.');
  });

  // Import Backup
  document.getElementById('input-import-backup').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.subjects && parsed.tasks) {
          appData = parsed;
          saveData();
          document.getElementById('modal-settings').classList.remove('active');
          renderCurrentView();
          showToast('Khôi phục dữ liệu từ tệp sao lưu thành công!');
        } else {
          alert('Tệp sao lưu không đúng định dạng Focus OS.');
        }
      } catch (err) {
        alert('Lỗi đọc tệp JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Reset to Demo Data
  document.getElementById('btn-reset-demo').addEventListener('click', () => {
    if (confirm('Khôi phục lại toàn bộ dữ liệu mẫu học thuật ban đầu?')) {
      appData = JSON.parse(JSON.stringify(DEFAULT_ACADEMIC_DATA));
      saveData();
      document.getElementById('modal-settings').classList.remove('active');
      renderCurrentView();
      showToast('Đã khôi phục dữ liệu học thuật mẫu.');
    }
  });

  // Dark Mode Toggle
  const darkBtn = document.getElementById('btn-toggle-dark');
  const darkIcon = document.getElementById('dark-icon');
  const darkText = document.getElementById('dark-text');

  const isDarkSaved = localStorage.getItem('focus_os_dark_mode') === 'true';
  if (isDarkSaved) {
    document.body.classList.add('dark-mode');
    darkIcon.textContent = '☀️';
    darkText.textContent = 'Chế độ đọc ban ngày';
  }

  darkBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('focus_os_dark_mode', isDark ? 'true' : 'false');
    darkIcon.textContent = isDark ? '☀️' : '🌙';
    darkText.textContent = isDark ? 'Chế độ đọc ban ngày' : 'Chế độ đọc ban đêm';
    showToast(isDark ? 'Đã kích hoạt chế độ ban đêm 🌙' : 'Đã chuyển về giấy ngà ban ngày ☀️');
  });
}

// =============================================================================
// 10. UTILITIES
// =============================================================================
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('quiet-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

// =============================================================================
// INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  timerEngine = initTimer();
  initNavigation();
  initTasksListeners();
  initSubjectListeners();
  initNotesListeners();
  initModals();
  renderCurrentView();
});
