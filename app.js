/**
 * =========================================================================
 * PROASN 2025 - MAIN APPLICATION LOGIC
 * =========================================================================
 * Mengelola navigasi halaman, pencarian NIP dari Google Sheets / Mock Data,
 * perenderan kuesioner dinamis berbasis Opsi perorangan, dan pengiriman Hasil.
 * =========================================================================
 */

// Application State
const state = {
  currentUser: null,       // { nip, nama, jabatan, satker }
  userQuestions: [],      // Array of questions with non-empty options for this user
  userAnswers: {},        // { [kode]: selectedOptionText }
  currentStep: 1,         // 1: NIP Search, 2: Questionnaire, 3: Success Screen
  submissionTimestamp: ''
};

// DOM Elements
const elements = {
  // Pages
  page1: document.getElementById('page-1'),
  page2: document.getElementById('page-2'),
  page3: document.getElementById('page-3'),

  // Page 1 Elements
  inputNip: document.getElementById('input-nip'),
  btnSearchNip: document.getElementById('btn-search-nip'),
  btnSearchText: document.getElementById('btn-search-text'),
  btnSearchSpinner: document.getElementById('btn-search-spinner'),
  btnSearchIcon: document.getElementById('btn-search-icon'),
  nipAlertBox: document.getElementById('nip-alert-box'),
  nipAlertText: document.getElementById('nip-alert-text'),
  confirmationContainer: document.getElementById('confirmation-container'),
  confirmAvatar: document.getElementById('confirm-avatar'),
  confirmNama: document.getElementById('confirm-nama'),
  confirmNip: document.getElementById('confirm-nip'),
  confirmJabatan: document.getElementById('confirm-jabatan'),
  confirmSatker: document.getElementById('confirm-satker'),
  btnResetNip: document.getElementById('btn-reset-nip'),
  btnGoPage2: document.getElementById('btn-go-page-2'),

  // Page 2 Elements
  stickyAvatar: document.getElementById('sticky-avatar'),
  stickyUserName: document.getElementById('sticky-user-name'),
  stickyUserNip: document.getElementById('sticky-user-nip'),
  stickyUserSatker: document.getElementById('sticky-user-satker'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  progressText: document.getElementById('progress-text'),
  progressPercent: document.getElementById('progress-percent'),
  questionsContainer: document.getElementById('questions-container'),
  unansweredWarning: document.getElementById('unanswered-warning'),
  unansweredCount: document.getElementById('unanswered-count'),
  allAnsweredNote: document.getElementById('all-answered-note'),
  btnBackPage1: document.getElementById('btn-back-page-1'),
  btnOpenSubmitModal: document.getElementById('btn-open-submit-modal'),

  // Page 3 (Success) Elements
  receiptNama: document.getElementById('receipt-nama'),
  receiptNip: document.getElementById('receipt-nip'),
  receiptSatker: document.getElementById('receipt-satker'),
  receiptTimestamp: document.getElementById('receipt-timestamp'),

  // Modals
  modalConfirmSubmit: document.getElementById('modal-confirm-submit'),
  modalConfirmUserNama: document.getElementById('modal-confirm-user-nama'),
  modalConfirmUserNip: document.getElementById('modal-confirm-user-nip'),
  modalConfirmAnswerCount: document.getElementById('modal-confirm-answer-count'),
  btnSubmitFinal: document.getElementById('btn-submit-final'),
  btnSubmitFinalText: document.getElementById('btn-submit-final-text'),
  btnSubmitFinalSpinner: document.getElementById('btn-submit-final-spinner')
};

// =========================================================================
// INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  preventRightClickAndSelection();
});

/**
 * Mencegah klik kanan dan seleksi teks
 */
function preventRightClickAndSelection() {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  document.addEventListener('dragstart', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      return false;
    }
  });
}

// =========================================================================
// EVENT LISTENERS
// =========================================================================
function setupEventListeners() {
  // Input NIP: Hanya angka
  elements.inputNip.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    hideNipAlert();
  });

  // Enter pada input NIP menjalankan pencarian
  elements.inputNip.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchNip();
    }
  });

  // Tombol Cari
  elements.btnSearchNip.addEventListener('click', handleSearchNip);

  // Tombol Reset NIP
  elements.btnResetNip.addEventListener('click', () => {
    elements.confirmationContainer.classList.remove('show');
    elements.inputNip.value = '';
    elements.inputNip.focus();
    state.currentUser = null;
    state.userQuestions = [];
    state.userAnswers = {};
    hideNipAlert();
  });

  // Tombol Konfirmasi (ke Halaman 2)
  elements.btnGoPage2.addEventListener('click', () => {
    if (!state.currentUser) return;
    goToPage(2);
    renderQuestionnaire();
  });

  // Tombol Kembali ke Halaman 1
  elements.btnBackPage1.addEventListener('click', () => {
    goToPage(1);
  });

  // Buka Modal Konfirmasi Kirim (Validasi Wajib Terisi Semua)
  elements.btnOpenSubmitModal.addEventListener('click', () => {
    const answeredCount = Object.keys(state.userAnswers).length;
    const totalCount = state.userQuestions.length;

    // Pastikan semua pertanyaan wajib dijawab
    if (answeredCount < totalCount) {
      highlightFirstUnanswered();
      alert(`Mohon jawab semua pertanyaan terlebih dahulu sebelum mengirim (${answeredCount}/${totalCount} terisi).`);
      return;
    }

    elements.modalConfirmUserNama.textContent = state.currentUser.nama;
    elements.modalConfirmUserNip.textContent = state.currentUser.nip;
    elements.modalConfirmAnswerCount.textContent = `${answeredCount} dari ${totalCount}`;
    openModal(elements.modalConfirmSubmit);
  });

  // Tombol Kirim Final di Modal
  elements.btnSubmitFinal.addEventListener('click', handleFinalSubmit);

  // Tutup Modal
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      const targetModal = document.getElementById(modalId);
      if (targetModal) closeModal(targetModal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
}

function highlightFirstUnanswered() {
  for (let q of state.userQuestions) {
    if (!state.userAnswers[q.kode]) {
      const card = document.getElementById(`card-question-${q.kode}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.borderColor = '#ef4444';
        card.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.45)';
        setTimeout(() => {
          card.style.borderColor = '';
          card.style.boxShadow = '';
        }, 2500);
      }
      break;
    }
  }
}

// =========================================================================
// PAGE NAVIGATION
// =========================================================================
function goToPage(pageNumber) {
  state.currentStep = pageNumber;
  elements.page1.classList.remove('active');
  elements.page2.classList.remove('active');
  elements.page3.classList.remove('active');

  if (pageNumber === 1) {
    elements.page1.classList.add('active');
  } else if (pageNumber === 2) {
    elements.page2.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (pageNumber === 3) {
    elements.page3.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function openModal(modal) {
  modal.classList.add('show');
}

function closeModal(modal) {
  modal.classList.remove('show');
}

// =========================================================================
// SEARCH NIP LOGIC (PAGE 1)
// =========================================================================
async function handleSearchNip() {
  const nip = elements.inputNip.value.trim();

  if (!nip) {
    showNipAlert('Silakan masukkan NIP Anda terlebih dahulu.');
    elements.inputNip.focus();
    return;
  }

  setSearchLoading(true);
  hideNipAlert();
  elements.confirmationContainer.classList.remove('show');

  try {
    // Selalu mencoba koneksi Google Sheets terlebih dahulu
    await searchNipLive(nip);
  } catch (error) {
    console.warn('Live search fallback to mock:', error);
    // Jika offline / Apps Script belum selesai dipasang, fallback ke mock data
    searchNipDemo(nip);
  } finally {
    setSearchLoading(false);
  }
}

function setSearchLoading(isLoading) {
  if (isLoading) {
    elements.btnSearchNip.disabled = true;
    elements.btnSearchText.style.display = 'none';
    elements.btnSearchIcon.style.display = 'none';
    elements.btnSearchSpinner.style.display = 'inline-block';
  } else {
    elements.btnSearchNip.disabled = false;
    elements.btnSearchText.style.display = 'inline';
    elements.btnSearchIcon.style.display = 'inline';
    elements.btnSearchSpinner.style.display = 'none';
  }
}

function showNipAlert(message) {
  elements.nipAlertText.textContent = message;
  elements.nipAlertBox.classList.add('show');
}

function hideNipAlert() {
  elements.nipAlertBox.classList.remove('show');
}

function getInitials(name) {
  if (!name) return 'ASN';
  const clean = name.replace(/(,?\s*(S\.[A-Za-z]+|M\.[A-Za-z]+|Dr\.|Drs\.|Ir\.|H\.|Hj\.)\s*)+/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Format URL gambar, otomatis mendeteksi dan mengubah link Google Drive menjadi link direct image
 */
function formatImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  if (!url) return '';

  // Google Drive format 1: https://drive.google.com/file/d/FILE_ID/view...
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileDMatch[1]}`;
  }

  // Google Drive format 2: https://drive.google.com/open?id=FILE_ID atau ?id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
  }

  // Direct image URL
  return url;
}

/**
 * Menampilkan avatar foto pegawai jika tersedia link, atau inisial nama jika kosong
 */
function renderAvatar(containerElement, name, photoUrl) {
  if (!containerElement) return;

  const initials = getInitials(name);
  const cleanUrl = formatImageUrl(photoUrl);

  if (cleanUrl) {
    containerElement.innerHTML = '';
    const img = document.createElement('img');
    img.src = cleanUrl;
    img.alt = name || 'Foto Pegawai';
    img.className = 'avatar-img';

    // Fallback otomatis ke inisial jika gambar gagal dimuat
    img.onerror = () => {
      containerElement.innerHTML = initials;
      containerElement.classList.remove('has-photo');
    };

    containerElement.appendChild(img);
    containerElement.classList.add('has-photo');
  } else {
    containerElement.innerHTML = initials;
    containerElement.classList.remove('has-photo');
  }
}

/**
 * Pencarian NIP Mode Live (Google Apps Script)
 */
async function searchNipLive(nip) {
  const scriptUrl = CONFIG.getScriptUrl();
  const url = `${scriptUrl}?action=checkNIP&nip=${encodeURIComponent(nip)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    showNipAlert(result.message || 'NIP tidak ditemukan.');
    return;
  }

  state.currentUser = result.pegawai;
  state.userQuestions = result.questions || [];
  state.userAnswers = {};

  displayConfirmationCard(result.pegawai);
}

/**
 * Pencarian NIP Fallback Demo (Offline)
 */
function searchNipDemo(nip) {
  const cleanNip = nip.replace(/\s+/g, '');
  const pegawai = MOCK_PEGAWAI.find(p => p.nip.replace(/\s+/g, '') === cleanNip);

  if (!pegawai) {
    showNipAlert(`NIP ${nip} tidak ditemukan. Silakan periksa kembali NIP Anda.`);
    return;
  }

  const opsiRow = MOCK_OPSI.find(o => o.nip.replace(/\s+/g, '') === cleanNip);
  const userQuestions = [];

  if (opsiRow) {
    CONFIG.QUESTION_CODES.forEach(code => {
      const cellText = opsiRow[code];
      if (cellText && cellText.trim() !== '') {
        const lines = cellText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          const masterQ = MOCK_PERTANYAAN.find(q => q.kode === code) || {
            kode: code,
            kategori: 'Umum',
            pertanyaan: `Pertanyaan kuesioner untuk ${code}`
          };

          userQuestions.push({
            kode: code,
            kategori: masterQ.kategori,
            pertanyaan: masterQ.pertanyaan,
            options: lines
          });
        }
      }
    });
  }

  state.currentUser = pegawai;
  state.userQuestions = userQuestions;
  state.userAnswers = {};

  displayConfirmationCard(pegawai);
}

function displayConfirmationCard(pegawai) {
  renderAvatar(elements.confirmAvatar, pegawai.nama, pegawai.foto);
  elements.confirmNama.textContent = pegawai.nama;
  elements.confirmNip.textContent = pegawai.nip;
  elements.confirmJabatan.textContent = pegawai.jabatan || '-';
  elements.confirmSatker.textContent = pegawai.satker || '-';

  elements.confirmationContainer.classList.add('show');
}

// =========================================================================
// RENDER QUESTIONNAIRE (PAGE 2)
// =========================================================================
function renderQuestionnaire() {
  if (!state.currentUser) return;

  // Profil ringkas sticky (avatar foto atau inisial)
  renderAvatar(elements.stickyAvatar, state.currentUser.nama, state.currentUser.foto);
  elements.stickyUserName.textContent = state.currentUser.nama;
  elements.stickyUserNip.textContent = state.currentUser.nip;
  elements.stickyUserSatker.textContent = state.currentUser.satker;

  // Bersihkan pertanyaan lama
  elements.questionsContainer.innerHTML = '';

  if (state.userQuestions.length === 0) {
    elements.questionsContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="margin-bottom: 14px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h3 style="font-size: 1.25rem; color: #ffffff; margin-bottom: 8px;">Pertanyaan Tidak Tersedia</h3>
        <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto;">
          Silakan hubungi bagian SDM.
        </p>
      </div>
    `;
    updateProgressUI();
    return;
  }

  // Render setiap kartu pertanyaan (TANPA TAG [P1], [M2], [D1])
  state.userQuestions.forEach((q, index) => {
    const questionCard = document.createElement('article');
    questionCard.className = 'question-card';
    questionCard.id = `card-question-${q.kode}`;

    let badgeClass = 'badge-teknis';
    if (q.kode.startsWith('M')) badgeClass = 'badge-manajerial';
    if (q.kode.startsWith('D')) badgeClass = 'badge-digital';

    // Meta Header (Kategori + Nomor Pertanyaan + Badge Wajib Dijawab, TANPA kode [P1])
    const metaDiv = document.createElement('div');
    metaDiv.className = 'question-meta';
    metaDiv.innerHTML = `
      <div class="question-meta-left">
        <span class="category-badge ${badgeClass}">${escapeHtml(q.kategori || 'Kompetensi')}</span>
        <span class="badge-wajib">* Wajib Dijawab</span>
      </div>
      <span class="question-number-pill">Pertanyaan ${index + 1} dari ${state.userQuestions.length}</span>
    `;

    // Title Pertanyaan MURNI TANPA TAG KODE seperti [P1]
    const titleH3 = document.createElement('h3');
    titleH3.className = 'question-title';
    titleH3.textContent = q.pertanyaan;

    // Options Group
    const optionsGroup = document.createElement('div');
    optionsGroup.className = 'options-group';
    optionsGroup.setAttribute('role', 'radiogroup');
    optionsGroup.setAttribute('aria-label', q.pertanyaan);

    q.options.forEach((optText, optIdx) => {
      const optionId = `opt_${q.kode}_${optIdx}`;
      const isChecked = state.userAnswers[q.kode] === optText;

      const label = document.createElement('label');
      label.className = `option-label ${isChecked ? 'selected' : ''}`;
      label.htmlFor = optionId;

      label.innerHTML = `
        <input 
          type="radio" 
          id="${optionId}" 
          name="group_${q.kode}" 
          class="option-input" 
          value="${escapeHtml(optText)}"
          ${isChecked ? 'checked' : ''}
          required
        >
        <span class="option-indicator" aria-hidden="true"></span>
        <span class="option-text">${escapeHtml(optText)}</span>
      `;

      const radioInput = label.querySelector('input');
      radioInput.addEventListener('change', () => {
        handleOptionSelected(q.kode, optText, questionCard);
      });

      optionsGroup.appendChild(label);
    });

    questionCard.appendChild(metaDiv);
    questionCard.appendChild(titleH3);
    questionCard.appendChild(optionsGroup);

    elements.questionsContainer.appendChild(questionCard);
  });

  updateProgressUI();
}

function handleOptionSelected(questionCode, selectedText, cardElement) {
  state.userAnswers[questionCode] = selectedText;

  cardElement.classList.add('answered');

  const labels = cardElement.querySelectorAll('.option-label');
  labels.forEach(lbl => {
    const radio = lbl.querySelector('input');
    if (radio && radio.checked) {
      lbl.classList.add('selected');
    } else {
      lbl.classList.remove('selected');
    }
  });

  updateProgressUI();
}

function updateProgressUI() {
  const answeredCount = Object.keys(state.userAnswers).length;
  const totalCount = state.userQuestions.length;
  const percent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  elements.progressText.textContent = `${answeredCount} dari ${totalCount} Terjawab`;
  elements.progressPercent.textContent = `(${percent}%)`;
  elements.progressBarFill.style.width = `${percent}%`;

  // Wajib dijawab semua sebelum tombol kirim aktif
  if (totalCount > 0 && answeredCount === totalCount) {
    elements.btnOpenSubmitModal.disabled = false;
    elements.unansweredWarning.style.display = 'none';
    elements.allAnsweredNote.style.display = 'inline-block';
  } else {
    elements.btnOpenSubmitModal.disabled = true;
    const remaining = totalCount - answeredCount;
    elements.unansweredCount.textContent = remaining;
    elements.unansweredWarning.style.display = totalCount > 0 ? 'inline-block' : 'none';
    elements.allAnsweredNote.style.display = 'none';
  }
}

// =========================================================================
// FINAL SUBMIT (SAVE TO SHEET HASIL)
// =========================================================================
async function handleFinalSubmit() {
  if (!state.currentUser) return;

  setFinalSubmitLoading(true);

  const payload = {
    nip: state.currentUser.nip,
    nama: state.currentUser.nama,
    answers: state.userAnswers
  };

  try {
    let result = null;

    try {
      result = await submitAnswersLive(payload);
    } catch (netErr) {
      console.warn('Submit live failed, fallback to mock:', netErr);
      await new Promise(r => setTimeout(r, 600));
      result = submitAnswersDemo(payload);
    }

    closeModal(elements.modalConfirmSubmit);
    state.submissionTimestamp = result.timestamp || new Date().toLocaleString('id-ID');
    showSuccessPage();

  } catch (error) {
    console.error('Error submitting answers:', error);
    alert('Gagal menyimpan data: ' + error.message);
  } finally {
    setFinalSubmitLoading(false);
  }
}

function setFinalSubmitLoading(isLoading) {
  if (isLoading) {
    elements.btnSubmitFinal.disabled = true;
    elements.btnSubmitFinalText.textContent = 'Menyimpan...';
    elements.btnSubmitFinalSpinner.style.display = 'inline-block';
  } else {
    elements.btnSubmitFinal.disabled = false;
    elements.btnSubmitFinalText.textContent = 'Ya, Kirim Sekarang';
    elements.btnSubmitFinalSpinner.style.display = 'none';
  }
}

/**
 * Kirim Jawaban ke Google Apps Script (Sheet Hasil)
 */
async function submitAnswersLive(payload) {
  const scriptUrl = CONFIG.getScriptUrl();

  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Gagal menyimpan ke Google Sheets');
  }

  return data;
}

/**
 * Simpan Jawaban Fallback Demo
 */
function submitAnswersDemo(payload) {
  const timestamp = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  const record = {
    Timestamp: timestamp,
    NIP: payload.nip,
    Nama: payload.nama,
    ...payload.answers
  };

  MOCK_HASIL_STORAGE.push(record);

  return {
    success: true,
    message: 'Data berhasil disimpan.',
    timestamp: timestamp
  };
}

function showSuccessPage() {
  elements.receiptNama.textContent = state.currentUser.nama;
  elements.receiptNip.textContent = state.currentUser.nip;
  elements.receiptSatker.textContent = state.currentUser.satker;
  elements.receiptTimestamp.textContent = state.submissionTimestamp;

  goToPage(3);
}

// =========================================================================
// UTILITIES
// =========================================================================
function escapeHtml(text) {
  if (!text) return '';
  return text
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
