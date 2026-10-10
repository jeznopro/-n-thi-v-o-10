/**
 * Hỗ trợ giao diện Trợ lý AI Đa Nền Tảng (Groq, DeepSeek, Ollama, OpenAI, Gemini, Offline)
 */

document.addEventListener('DOMContentLoaded', () => {
  setupAiNavButton();
});

function setupAiNavButton() {
  const navMenu = document.querySelector('.nav-menu');
  if (navMenu && !document.getElementById('nav-ai-settings-btn')) {
    const li = document.createElement('li');
    li.innerHTML = `
      <a href="javascript:void(0)" id="nav-ai-settings-btn" class="nav-link" onclick="openAiSettingsModal()" title="Trợ lý AI (Cấu hình mô hình AI)" aria-label="Trợ lý AI">
        <span class="nav-icon">✨</span>
        <span class="nav-text">Trợ lý AI</span>
      </a>
    `;
    navMenu.appendChild(li);
  }
}

const PROVIDER_METADATA = {
  groq: {
    name: 'Groq Cloud (Khuyên Dùng - Miễn Phí 100%, Siêu Nhanh)',
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    link: 'https://console.groq.com/keys',
    linkText: '🔑 Lấy key miễn phí tại Groq Console (30 giây, không chặn VN)',
    help: 'Groq hoàn toàn MIỄN PHÍ, tốc độ xử lý siêu nhanh (~300 từ/giây), mô hình GPT OSS 120B & Qwen giải toán cực tốt và KHÔNG bị chặn IP tại Việt Nam.',
    needsKey: true,
    defaultUrl: 'https://api.groq.com/openai/v1'
  },
  offline: {
    name: 'Chế độ Nội Bộ (Không cần mạng & Không cần API Key)',
    models: ['built-in'],
    link: null,
    linkText: '',
    help: 'Sử dụng ngân hàng câu hỏi tự luận Toán THCS phong phú và thuật toán phân tích sư phạm tích hợp sẵn trong hệ thống. Hoàn toàn không phụ thuộc bên thứ 3.',
    needsKey: false,
    defaultUrl: ''
  },
  deepseek: {
    name: 'DeepSeek (Rất mạnh về Toán học & Tiếng Việt)',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    link: 'https://platform.deepseek.com/api_keys',
    linkText: '🔑 Lấy key tại DeepSeek Platform',
    help: 'DeepSeek nổi tiếng toàn cầu về khả năng suy luận logic và giải toán học, chi phí siêu rẻ và hỗ trợ tiếng Việt cực tốt.',
    needsKey: true,
    defaultUrl: 'https://api.deepseek.com'
  },
  ollama: {
    name: 'Ollama Cục Bộ (Chạy Offline 100% trên máy tính, 0 cần Key)',
    models: ['qwen2.5:7b', 'llama3.2', 'qwen2.5-coder:7b'],
    link: 'https://ollama.com',
    linkText: '💻 Tải phần mềm Ollama tại đây',
    help: 'Chạy trực tiếp mô hình AI trên máy tính của Thầy/Cô qua cổng 11434. 100% bảo mật dữ liệu, không cần kết nối mạng, không cần tài khoản hay thẻ tín dụng.',
    needsKey: false,
    defaultUrl: 'http://localhost:11434/v1'
  },
  gemini: {
    name: 'Google Gemini (Gemini 2.0 Flash / 1.5 Flash)',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    link: 'https://aistudio.google.com/app/apikey',
    linkText: '🔑 Lấy key tại Google AI Studio',
    help: 'Mô hình từ Google. Lưu ý: Một số đường truyền tại Việt Nam có thể gặp giới hạn vùng địa lý hoặc quota từ Google.',
    needsKey: true,
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta'
  },
  openai: {
    name: 'OpenAI (ChatGPT GPT-4o-mini)',
    models: ['gpt-4o-mini', 'gpt-4o'],
    link: 'https://platform.openai.com/api-keys',
    linkText: '🔑 Lấy key tại OpenAI Platform',
    help: 'Mô hình chuẩn của OpenAI.',
    needsKey: true,
    defaultUrl: 'https://api.openai.com/v1'
  }
};

/**
 * Mở modal cấu hình AI Đa Nền Tảng
 */
async function openAiSettingsModal() {
  let modal = document.getElementById('modal-ai-settings');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-ai-settings';
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = `
      <div class="custom-modal" style="max-width: 640px;">
        <div class="custom-modal-header" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff;">
          <div>
            <h3 class="custom-modal-title" style="color: #fff; display: flex; align-items: center; gap: 8px;">
              ✨ Cài đặt Trợ lý AI Môn Toán
            </h3>
            <p style="font-size: 0.8rem; color: #e9d5ff; margin-top: 3px;">
              Hỗ trợ Groq (Miễn phí), DeepSeek, Ollama Offline, Gemini & Chế độ Nội bộ
            </p>
          </div>
          <button class="toast-close" style="color: #fff;" onclick="closeAiSettingsModal()">&times;</button>
        </div>

        <div class="custom-modal-body" style="padding: 22px;">
          <!-- Trạng thái hiện tại -->
          <div id="ai-status-alert" style="padding: 12px 16px; border-radius: 8px; margin-bottom: 18px; font-size: 0.9rem; display: flex; align-items: center; gap: 10px; background: #f1f5f9; border: 1px solid #cbd5e1;">
            <span>⏳ Đang tải thông tin cấu hình...</span>
          </div>

          <!-- 1. Chọn Nhà cung cấp -->
          <div class="form-group">
            <label class="form-label" style="font-weight: 700; color: #1e3a8a;">
              1. Chọn Nhà cung cấp AI (Provider):
            </label>
            <select id="ai-provider-select" class="form-control" onchange="onAiProviderChanged()" style="font-weight: 600;">
              <option value="groq">⚡ Groq Cloud (Miễn Phí 100%, Llama 3.3 70B, siêu nhanh, khuyên dùng)</option>
              <option value="offline">🏢 Chế độ Nội Bộ (Không cần mạng & Không cần API Key)</option>
              <option value="deepseek">🧠 DeepSeek (Mạnh về Toán & Tiếng Việt, giá rẻ)</option>
              <option value="ollama">💻 Ollama Cục Bộ (Chạy Offline trên máy tính, 0 cần Key)</option>
              <option value="gemini">🌐 Google Gemini (Gemini 2.0 Flash)</option>
              <option value="openai">🤖 OpenAI ChatGPT (GPT-4o-mini)</option>
            </select>
            <div id="ai-provider-help" style="margin-top: 6px; font-size: 0.825rem; color: #475569; line-height: 1.5; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border-left: 3px solid #7c3aed;"></div>
          </div>

          <!-- 2. Nhập API Key (nếu cần) -->
          <div class="form-group" id="ai-key-group">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
              <span>2. API Key: <span class="req">*</span></span>
              <a id="ai-key-link" href="#" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; color: #2563eb; text-decoration: underline; font-weight: 600;"></a>
            </label>
            <div style="position: relative;">
              <input type="password" id="ai-api-key-input" class="form-control" placeholder="Dán mã API Key..." style="padding-right: 40px;">
              <button type="button" onclick="toggleApiKeyVisibility()" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b;">
                👁️
              </button>
            </div>
            <small style="color: #64748b; display: block; margin-top: 4px;">
              Hệ thống lưu trữ an toàn trong cơ sở dữ liệu nội bộ SQLite trên máy bạn.
            </small>
          </div>

          <!-- 3. Chọn Model -->
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label class="form-label">3. Mô hình (Model):</label>
              <input type="text" id="ai-model-input" class="form-control" list="ai-models-datalist" placeholder="Nhập hoặc chọn model...">
              <datalist id="ai-models-datalist"></datalist>
            </div>
            <div class="form-group" id="ai-url-group" style="flex: 1;">
              <label class="form-label">Endpoint URL (Tùy chọn):</label>
              <input type="text" id="ai-base-url-input" class="form-control" placeholder="Để trống để dùng mặc định">
            </div>
          </div>

          <!-- 4. Dạy AI cách nói chuyện riêng (Tùy chỉnh tính cách & Giọng điệu Gia sư) -->
          <div class="form-group" style="margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="form-label" style="font-weight: 700; color: #4338ca; margin: 0;">
                🎭 4. Tính cách & Cách nói chuyện của Gia sư AI (Dạy qua Prompt):
              </label>
              <span style="font-size: 0.775rem; color: #64748b;">(Tùy chọn)</span>
            </div>
            <p style="font-size: 0.825rem; color: #64748b; margin-bottom: 8px;">
              Dạy AI cách xưng hô, tính cách (vui vẻ, thân thiện hay nghiêm khắc), và các câu cửa miệng đặc trưng:
            </p>

            <!-- Nút chọn mẫu phong cách nhanh -->
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
              <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.775rem; padding: 4px 8px;" onclick="applyPersonaPreset('anh_em_vui_ve')">
                🤝 Anh em thân thiện (Mặc định)
              </button>
              <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.775rem; padding: 4px 8px;" onclick="applyPersonaPreset('anh_em_hai_huoc')">
                😄 Anh em dí dỏm & vui vẻ
              </button>
              <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.775rem; padding: 4px 8px;" onclick="applyPersonaPreset('anh_em_an_can')">
                🛡️ Anh lớn ân cần & kiên nhẫn
              </button>
              <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.775rem; padding: 4px 8px;" onclick="applyPersonaPreset('anh_em_thach_thuc')">
                ⚡ Thách thức phản biện
              </button>
            </div>

            <textarea id="ai-tutor-persona-input" class="form-control" rows="3" style="font-size: 0.875rem; line-height: 1.5;"
                      placeholder="Ví dụ: Xưng hô BẮT BUỘC là 'anh' và 'em'. Phong cách: Thân thiện, gần gũi như anh trai kèm em học, hay động viên. Tuyệt đối không xưng 'Thầy/Cô'. Khi học sinh đòi đáp án thì bảo: 'Anh không giải hộ đâu nhé, để anh gợi ý từng bước rồi em tự làm mới nhớ lâu được!'..."></textarea>
          </div>

          <!-- Kết quả test kết nối -->
          <div id="ai-test-result" style="display: none; padding: 12px 14px; border-radius: 6px; font-size: 0.875rem; margin-top: 10px; line-height: 1.5;"></div>
        </div>

        <div class="custom-modal-footer" style="justify-content: space-between;">
          <button type="button" class="btn btn-outline" id="btn-test-ai-key" onclick="testAiConnection()">
            🔌 Thử kết nối
          </button>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="closeAiSettingsModal()">Đóng</button>
            <button type="button" class="btn btn-ai" id="btn-save-ai-settings" onclick="saveAiSettings()">
              💾 Lưu Cấu Hình
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Tải dữ liệu cấu hình hiện tại
  try {
    const res = await apiRequest('/api/ai/settings');
    const c = res.config || {};

    const providerSelect = document.getElementById('ai-provider-select');
    const keyInput = document.getElementById('ai-api-key-input');
    const modelInput = document.getElementById('ai-model-input');
    const urlInput = document.getElementById('ai-base-url-input');
    const personaInput = document.getElementById('ai-tutor-persona-input');

    if (c.provider) providerSelect.value = c.provider;
    if (c.model) modelInput.value = c.model;
    if (c.baseUrl) urlInput.value = c.baseUrl;
    if (c.tutorPersona && personaInput) personaInput.value = c.tutorPersona;

    if (c.hasKey && c.maskedKey) {
      keyInput.placeholder = `Đang có key: ${c.maskedKey} (Nhập mới nếu muốn đổi)`;
    }

    onAiProviderChanged();
    updateStatusAlert(c);
  } catch (err) {
    console.warn('Lỗi tải cài đặt AI:', err.message);
  }

  modal.classList.add('active');
}

function updateStatusAlert(c) {
  const statusBox = document.getElementById('ai-status-alert');
  if (!statusBox) return;

  if (c.provider === 'offline') {
    statusBox.style.background = '#f0fdf4';
    statusBox.style.border = '1px solid #86efac';
    statusBox.style.color = '#166534';
    statusBox.innerHTML = `✅ <strong>Chế độ Nội Bộ:</strong> Sẵn sàng hoạt động! Sử dụng ngân hàng đề toán & thuật toán sư phạm nội bộ (Không cần API Key).`;
  } else if (c.provider === 'ollama') {
    statusBox.style.background = '#f0fdf4';
    statusBox.style.border = '1px solid #86efac';
    statusBox.style.color = '#166534';
    statusBox.innerHTML = `💻 <strong>Ollama Local:</strong> Mô hình chạy trên máy bạn (Cổng 11434). Đảm bảo phần mềm Ollama đang bật.`;
  } else if (c.hasKey) {
    statusBox.style.background = '#ecfdf5';
    statusBox.style.border = '1px solid #6ee7b7';
    statusBox.style.color = '#065f46';
    statusBox.innerHTML = `🎉 <strong>Đã kết nối AI (${c.provider.toUpperCase()}):</strong> Đang sử dụng khóa <code>${c.maskedKey}</code> với mô hình <code>${c.model}</code>.`;
  } else {
    statusBox.style.background = '#fffbeb';
    statusBox.style.border = '1px solid #fde68a';
    statusBox.style.color = '#92400e';
    statusBox.innerHTML = `💡 Bạn đang chọn <strong>${c.provider}</strong> nhưng chưa nhập API Key. Hãy dán API Key hoặc chuyển sang <strong>Groq Cloud</strong> (miễn phí) hoặc <strong>Chế độ Nội bộ</strong>.`;
  }
}

function onAiProviderChanged() {
  const provider = document.getElementById('ai-provider-select').value;
  const meta = PROVIDER_METADATA[provider] || PROVIDER_METADATA.offline;

  const keyGroup = document.getElementById('ai-key-group');
  const keyLink = document.getElementById('ai-key-link');
  const helpBox = document.getElementById('ai-provider-help');
  const datalist = document.getElementById('ai-models-datalist');
  const modelInput = document.getElementById('ai-model-input');
  const urlInput = document.getElementById('ai-base-url-input');

  // Cập nhật hướng dẫn
  helpBox.innerHTML = meta.help;

  // Cập nhật link lấy key
  if (meta.link) {
    keyLink.href = meta.link;
    keyLink.textContent = meta.linkText;
    keyLink.style.display = 'inline';
  } else {
    keyLink.style.display = 'none';
  }

  // Ẩn/hiện ô nhập key
  keyGroup.style.display = meta.needsKey ? 'block' : 'none';

  // Cập nhật danh sách model gợi ý
  datalist.innerHTML = meta.models.map(m => `<option value="${m}"></option>`).join('');
  if (!modelInput.value || !meta.models.includes(modelInput.value)) {
    modelInput.value = meta.models[0];
  }

  // Default URL
  if (!urlInput.value || Object.values(PROVIDER_METADATA).some(p => p.defaultUrl === urlInput.value)) {
    urlInput.value = meta.defaultUrl || '';
  }
}

function closeAiSettingsModal() {
  const modal = document.getElementById('modal-ai-settings');
  if (modal) modal.classList.remove('active');
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('ai-api-key-input');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

async function testAiConnection() {
  const provider = document.getElementById('ai-provider-select').value;
  const keyInput = document.getElementById('ai-api-key-input').value.trim();
  const model = document.getElementById('ai-model-input').value.trim();
  const baseUrl = document.getElementById('ai-base-url-input').value.trim();

  const testBox = document.getElementById('ai-test-result');
  const btn = document.getElementById('btn-test-ai-key');

  btn.disabled = true;
  btn.textContent = 'Đang thử kết nối...';
  testBox.style.display = 'block';
  testBox.style.background = '#f1f5f9';
  testBox.style.color = '#334155';
  testBox.innerHTML = `⏳ Đang gửi kiểm tra tới <strong>${provider.toUpperCase()}</strong>...`;

  try {
    const res = await apiRequest('/api/ai/test-key', {
      method: 'POST',
      body: JSON.stringify({
        provider,
        apiKey: keyInput || undefined,
        model,
        baseUrl: baseUrl || undefined
      })
    });

    if (res.success) {
      if (res.suggestedModel) {
        document.getElementById('ai-model-input').value = res.suggestedModel;
      }
      testBox.style.background = '#ecfdf5';
      testBox.style.border = '1px solid #6ee7b7';
      testBox.style.color = '#065f46';
      testBox.innerHTML = `🎉 <strong>Kết nối thành công!</strong><br>Phản hồi từ AI: <em>"${res.reply}"</em>`;
    } else {
      testBox.style.background = '#fef2f2';
      testBox.style.border = '1px solid #fecaca';
      testBox.style.color = '#991b1b';
      testBox.innerHTML = `❌ <strong>Kết nối thất bại:</strong> ${res.error || 'Vui lòng kiểm tra lại cấu hình hoặc API Key.'}`;
    }
  } catch (err) {
    testBox.style.background = '#fef2f2';
    testBox.style.border = '1px solid #fecaca';
    testBox.style.color = '#991b1b';
    testBox.innerHTML = `❌ Lỗi: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🔌 Thử kết nối';
  }
}

async function saveAiSettings() {
  const provider = document.getElementById('ai-provider-select').value;
  const keyInput = document.getElementById('ai-api-key-input').value.trim();
  const model = document.getElementById('ai-model-input').value.trim();
  const baseUrl = document.getElementById('ai-base-url-input').value.trim();
  const personaInput = document.getElementById('ai-tutor-persona-input');
  const tutorPersona = personaInput ? personaInput.value.trim() : '';

  const btn = document.getElementById('btn-save-ai-settings');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  try {
    const body = {
      provider,
      model,
      baseUrl: baseUrl || undefined,
      tutorPersona: tutorPersona
    };
    if (keyInput) {
      body.apiKey = keyInput;
    }

    const res = await apiRequest('/api/ai/settings', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    showToast(res.message || 'Lưu cài đặt AI thành công!', 'success');
    closeAiSettingsModal();
  } catch (err) {
    showToast('Lỗi lưu cấu hình: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Lưu Cấu Hình';
  }
}

const PERSONA_PRESETS = {
  anh_em_vui_ve: 'Xưng hô: BẮT BUỘC xưng là "anh", gọi học sinh là "em". Phong cách: Thân thiện, gần gũi như người anh kèm em học bài, nhiệt tình, dễ hiểu, hay động viên. Tuyệt đối không xưng "Thầy/Cô", chỉ xưng là "anh". Khi học sinh đòi đáp án thì bảo: "Anh không giải hộ đâu nhé, để anh gợi ý từng bước rồi em tự làm mới hiểu sâu được!".',
  anh_em_hai_huoc: 'Xưng hô: BẮT BUỘC xưng là "anh", gọi học sinh là "em". Phong cách: Cực kỳ vui tính, hài hước, dùng biểu tượng 😄 🚀 💪, ví von toán học gần gũi với đời sống để bớt căng thẳng. Tuyệt đối không xưng "Thầy/Cô".',
  anh_em_an_can: 'Xưng hô: BẮT BUỘC xưng là "anh", gọi học sinh là "em". Phong cách: Điềm đạm, kiên nhẫn, ấm áp như anh lớn kèm em út. Luôn động viên: "Em bình tĩnh đọc kỹ đề nhé, có chỗ nào chưa hiểu anh em mình cùng gỡ!". Tuyệt đối không xưng "Thầy/Cô".',
  anh_em_thach_thuc: 'Xưng hô: BẮT BUỘC xưng là "anh", gọi học sinh là "em". Phong cách: Thách thức tư duy, kích thích phản biện: "Bài này nhìn tưởng dễ nhưng coi chừng có bẫy đấy, em thử kiểm tra kỹ điều kiện xem nào!". Tuyệt đối không xưng "Thầy/Cô".'
};

function applyPersonaPreset(key) {
  const input = document.getElementById('ai-tutor-persona-input');
  if (input && PERSONA_PRESETS[key]) {
    input.value = PERSONA_PRESETS[key];
  }
}
