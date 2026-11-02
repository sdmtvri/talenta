/**
 * =========================================================================
 * PROASN 2025 - CONFIGURATION
 * =========================================================================
 * File ini mengatur URL endpoint Google Apps Script dan opsi konfigurasi.
 * =========================================================================
 */

const CONFIG = {
  // URL Web App Google Apps Script Aktif
  DEFAULT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyEsJGE9spOF5TU2ZSxHxbDjtWfKKwBhkhswGTsi1SZN03dKo2w2uedcWwl4-vO4Co/exec',

  // Spreadsheet URL
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1akVo9tel44Cm-L4UcElvcDOQOzGaIaa6ZOuri_Q2o5o/edit',

  // Urutan kolom kode pertanyaan (21 pertanyaan)
  QUESTION_CODES: [
    'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8',
    'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9',
    'D1', 'D2', 'D3', 'D4'
  ],

  // Kategori
  CATEGORIES: {
    P: { name: 'Kompetensi Teknis & Penyiaran', badge: 'badge-teknis' },
    M: { name: 'Kompetensi Manajerial & Kepemimpinan', badge: 'badge-manajerial' },
    D: { name: 'Kompetensi Digital & Media Baru', badge: 'badge-digital' }
  },

  getScriptUrl() {
    return this.DEFAULT_SCRIPT_URL.trim();
  },

  isLiveMode() {
    return true;
  }
};
