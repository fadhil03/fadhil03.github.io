/* ═══════════════════════════════════════════════
   Portofolio Digital — Seminar PPG
   Admin CMS logic — GitHub Contents API client-side commit
   Token lives ONLY in localStorage of this browser; never
   written into any commit, file, or request body other than
   the Authorization header sent directly to api.github.com.
═══════════════════════════════════════════════ */

const OWNER = 'fadhil03';
const REPO = 'fadhil03.github.io';
const FILE_PATH = 'seminar-ppg/data/portofolio.json';
const BRANCH = 'main';
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
const TOKEN_KEY = 'seminarPpgAdminToken';

const state = { data: null, sha: null, connected: false };

/* ── Base64 (UTF-8 safe) ── */
function b64Encode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)));
}
function b64Decode(str) {
  const clean = str.replace(/\n/g, '');
  return decodeURIComponent(atob(clean).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

/* ── Token helpers ── */
function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

/* ── GitHub API ── */
async function apiGet() {
  const token = getToken();
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `token ${token}`;
  const res = await fetch(`${API_URL}?ref=${BRANCH}&t=${Date.now()}`, { headers });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Token tidak valid atau kedaluwarsa.');
    if (res.status === 403) throw new Error('Token tidak memiliki izin (scope Contents) yang cukup.');
    if (res.status === 404) throw new Error('File portofolio.json tidak ditemukan di repo.');
    throw new Error(`GitHub API error (${res.status})`);
  }
  const json = await res.json();
  const data = JSON.parse(b64Decode(json.content));
  return { data, sha: json.sha };
}

async function apiPut(data, sha, message) {
  const token = getToken();
  if (!token) throw new Error('Token belum diatur.');
  const res = await fetch(API_URL, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      content: b64Encode(JSON.stringify(data, null, 2)),
      sha,
      branch: BRANCH
    })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Token tidak valid atau kedaluwarsa.');
    if (res.status === 403) throw new Error('Token tidak memiliki izin menulis (scope Contents: Read and write).');
    if (res.status === 409) throw new Error('Konflik versi file. Coba simpan ulang.');
    throw new Error(body.message || `GitHub API error (${res.status})`);
  }
  return res.json();
}

async function withLatestData(mutator, commitMessage, statusElId) {
  if (!getToken()) {
    setStatus(statusElId, 'error', 'Hubungkan token GitHub terlebih dahulu.');
    return false;
  }
  setStatus(statusElId, 'loading', 'Menyimpan ke GitHub…');
  try {
    const latest = await apiGet();
    const updated = mutator(latest.data) || latest.data;
    const result = await apiPut(updated, latest.sha, commitMessage);
    state.data = updated;
    state.sha = result.content ? result.content.sha : null;
    setStatus(statusElId, 'success', 'Tersimpan ke GitHub ✓');
    renderAll();
    return true;
  } catch (err) {
    console.error(err);
    setStatus(statusElId, 'error', `Gagal: ${err.message}`);
    return false;
  }
}

/* ── Status pill UI ── */
function setStatus(elId, kind, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = `status-pill status-pill--${kind}`;
  const dotClass = kind === 'loading' ? 'status-dot status-dot--loading' : 'status-dot';
  el.innerHTML = `<span class="${dotClass}"></span>${message}`;
}

function setTokenStatus(connected, message) {
  const el = document.getElementById('tokenStatus');
  state.connected = connected;
  el.className = `token-status ${connected ? 'token-status--connected' : 'token-status--disconnected'}`;
  el.textContent = message;
}

/* ── Char counters ── */
function bindCounters(scope) {
  (scope || document).querySelectorAll('textarea[data-counter]').forEach(ta => {
    const counter = document.getElementById(ta.dataset.counter);
    const update = () => { if (counter) counter.textContent = ta.value.length; };
    ta.addEventListener('input', update);
    update();
  });
}

/* ── Tabs ── */
function initTabs() {
  const tabs = document.querySelectorAll('#adminTabs button');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });
}

/* ── Identifikasi Diri ── */
function renderIdentifikasi() {
  const id = (state.data && state.data.identifikasiDiri) || {};
  document.getElementById('visiPendidikanIndonesia').value = id.visiPendidikanIndonesia || '';
  document.getElementById('visiCalonGuru').value = id.visiCalonGuru || '';
  document.getElementById('langkahKonkret').value = id.langkahKonkret || '';
  bindCounters(document.getElementById('formIdentifikasi'));
}

function initIdentifikasiForm() {
  document.getElementById('formIdentifikasi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = {
      visiPendidikanIndonesia: document.getElementById('visiPendidikanIndonesia').value.trim(),
      visiCalonGuru: document.getElementById('visiCalonGuru').value.trim(),
      langkahKonkret: document.getElementById('langkahKonkret').value.trim()
    };
    await withLatestData(data => {
      data.identifikasiDiri = { ...data.identifikasiDiri, ...values };
      return data;
    }, 'Update identifikasi diri', 'statusIdentifikasi');
  });
}

/* ── Refleksi Mata Kuliah ── */
function fillLevel(c) {
  const core = ['connection', 'challenge', 'concept', 'change'];
  const extra = ['analisisArtefak', 'kaitanPraktis'];
  const coreFilled = core.filter(k => (c[k] || '').trim()).length;
  const extraFilled = extra.filter(k => (c[k] || '').trim()).length;
  if (coreFilled === 0 && extraFilled === 0) return 'empty';
  if (coreFilled === core.length && extraFilled === extra.length) return 'full';
  return 'partial';
}
const FILL_LABEL = { empty: 'Kosong', partial: 'Sebagian', full: 'Lengkap' };

function renderReflectionList() {
  const list = document.getElementById('reflectionList');
  const courses = (state.data && state.data.refleksiMataKuliah) || [];
  if (!courses.length) {
    list.innerHTML = '<div class="empty-state">Belum ada refleksi. Hubungkan token untuk memuat data.</div>';
    return;
  }
  list.innerHTML = courses.map(c => {
    const level = fillLevel(c);
    return `
      <div class="reflection-list-item">
        <div class="reflection-list-item__badge">${escapeAttr(c.pertemuanKe || '–')}</div>
        <div class="reflection-list-item__main">
          <div class="reflection-list-item__name">${escapeAttr(c.namaMataKuliah || '(tanpa nama)')}</div>
          <div class="reflection-list-item__meta">Semester ${escapeAttr(c.semester)} · <span class="reflection-list-item__fill reflection-list-item__fill--${level}">${FILL_LABEL[level]}</span></div>
        </div>
        <div class="reflection-list-item__actions">
          <button type="button" class="icon-btn" data-edit="${escapeAttr(c.id)}">Edit</button>
          <button type="button" class="icon-btn icon-btn--danger" data-delete="${escapeAttr(c.id)}">Hapus</button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openReflectionForm(btn.dataset.edit));
  });
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteReflection(btn.dataset.delete));
  });
}

function escapeAttr(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function openReflectionForm(id) {
  const panel = document.getElementById('panelReflectionForm');
  const courses = (state.data && state.data.refleksiMataKuliah) || [];
  const course = id ? courses.find(c => c.id === id) : null;

  document.getElementById('reflectionFormTitle').textContent = course
    ? `Edit Refleksi: ${course.namaMataKuliah}`
    : 'Tambah Refleksi Custom';
  document.getElementById('refId').value = course ? course.id : '';
  document.getElementById('refNamaMataKuliah').value = course ? course.namaMataKuliah || '' : '';
  document.getElementById('refPertemuanKe').value = course ? course.pertemuanKe || '' : '';
  document.getElementById('refSemester').value = course ? String(course.semester || 1) : '1';
  document.getElementById('refConnection').value = course ? course.connection || '' : '';
  document.getElementById('refChallenge').value = course ? course.challenge || '' : '';
  document.getElementById('refConcept').value = course ? course.concept || '' : '';
  document.getElementById('refChange').value = course ? course.change || '' : '';
  document.getElementById('refAnalisisArtefak').value = course ? course.analisisArtefak || '' : '';
  document.getElementById('refKaitanPraktis').value = course ? course.kaitanPraktis || '' : '';

  bindCounters(document.getElementById('formRefleksi'));
  setStatus('statusRefleksi', 'idle', 'Belum disimpan');
  panel.style.display = '';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function slugify(str) {
  return (str || 'refleksi')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'refleksi';
}

function initReflectionForm() {
  document.getElementById('btnAddCustom').addEventListener('click', () => openReflectionForm(null));
  document.getElementById('btnCancelRefleksi').addEventListener('click', () => {
    document.getElementById('panelReflectionForm').style.display = 'none';
  });

  document.getElementById('formRefleksi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const existingId = document.getElementById('refId').value;
    const namaMataKuliah = document.getElementById('refNamaMataKuliah').value.trim();
    if (!namaMataKuliah) return;

    const entry = {
      id: existingId || `${slugify(namaMataKuliah)}-${Date.now().toString(36)}`,
      pertemuanKe: document.getElementById('refPertemuanKe').value.trim(),
      semester: Number(document.getElementById('refSemester').value),
      namaMataKuliah,
      connection: document.getElementById('refConnection').value.trim(),
      challenge: document.getElementById('refChallenge').value.trim(),
      concept: document.getElementById('refConcept').value.trim(),
      change: document.getElementById('refChange').value.trim(),
      analisisArtefak: document.getElementById('refAnalisisArtefak').value.trim(),
      kaitanPraktis: document.getElementById('refKaitanPraktis').value.trim(),
      tanggalDiperbarui: new Date().toISOString()
    };

    const ok = await withLatestData(data => {
      const idx = data.refleksiMataKuliah.findIndex(c => c.id === entry.id);
      if (idx >= 0) data.refleksiMataKuliah[idx] = entry;
      else data.refleksiMataKuliah.push(entry);
      return data;
    }, `Update refleksi: ${namaMataKuliah}`, 'statusRefleksi');

    if (ok) {
      setTimeout(() => { document.getElementById('panelReflectionForm').style.display = 'none'; }, 700);
    }
  });
}

async function deleteReflection(id) {
  const courses = (state.data && state.data.refleksiMataKuliah) || [];
  const course = courses.find(c => c.id === id);
  if (!course) return;
  if (!confirm(`Hapus refleksi "${course.namaMataKuliah}"? Tindakan ini akan membuat commit baru.`)) return;
  await withLatestData(data => {
    data.refleksiMataKuliah = data.refleksiMataKuliah.filter(c => c.id !== id);
    return data;
  }, `Hapus refleksi: ${course.namaMataKuliah}`, 'statusReflectionList');
}

/* ── Refleksi Keseluruhan ── */
function renderKeseluruhan() {
  const rk = (state.data && state.data.refleksiKeseluruhan) || {};
  document.getElementById('pandanganPendidikanIndonesia').value = rk.pandanganPendidikanIndonesia || '';
  document.getElementById('upayaGuruProfesional').value = rk.upayaGuruProfesional || '';
  const items = Array.isArray(rk.rencanaTindakLanjut) && rk.rencanaTindakLanjut.length
    ? rk.rencanaTindakLanjut
    : ['', '', ''];
  renderRencanaFields(items);
  bindCounters(document.getElementById('formKeseluruhan'));
}

function renderRencanaFields(items) {
  const wrap = document.getElementById('rencanaTindakLanjutFields');
  wrap.innerHTML = items.map((val, i) => `
    <div style="display:flex;gap:8px;">
      <input type="text" class="rencana-item" data-index="${i}" value="${escapeAttr(val)}" placeholder="Poin rencana tindak lanjut" style="flex:1;font-family:inherit;font-size:14.5px;padding:10px 14px;border:1px solid var(--hairline);border-radius:12px;">
      <button type="button" class="icon-btn icon-btn--danger" data-remove-rencana="${i}">Hapus</button>
    </div>
  `).join('');
  wrap.querySelectorAll('[data-remove-rencana]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removeRencana);
      const current = collectRencanaValues();
      current.splice(idx, 1);
      renderRencanaFields(current.length ? current : ['']);
    });
  });
}

function collectRencanaValues() {
  return Array.from(document.querySelectorAll('.rencana-item')).map(inp => inp.value);
}

function initKeseluruhanForm() {
  document.getElementById('btnAddRencana').addEventListener('click', () => {
    const current = collectRencanaValues();
    current.push('');
    renderRencanaFields(current);
  });

  document.getElementById('formKeseluruhan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = {
      pandanganPendidikanIndonesia: document.getElementById('pandanganPendidikanIndonesia').value.trim(),
      upayaGuruProfesional: document.getElementById('upayaGuruProfesional').value.trim(),
      rencanaTindakLanjut: collectRencanaValues().map(v => v.trim())
    };
    await withLatestData(data => {
      data.refleksiKeseluruhan = { ...data.refleksiKeseluruhan, ...values };
      return data;
    }, 'Update refleksi keseluruhan program PPG', 'statusKeseluruhan');
  });
}

/* ── Karya Inovasi ── */
function renderInovasi() {
  const ki = (state.data && state.data.karyaInovasi) || {};
  document.getElementById('namaKarya').value = ki.namaKarya || '';
  document.getElementById('sasaranInovasi').value = ki.sasaranInovasi || '';
  document.getElementById('gagasanRiset').value = ki.gagasanRiset || '';
  document.getElementById('rancanganImplementasi').value = ki.rancanganImplementasi || '';
  document.getElementById('evaluasi').value = ki.evaluasi || '';
  bindCounters(document.getElementById('formInovasi'));
}

function initInovasiForm() {
  document.getElementById('formInovasi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = {
      namaKarya: document.getElementById('namaKarya').value.trim(),
      sasaranInovasi: document.getElementById('sasaranInovasi').value.trim(),
      gagasanRiset: document.getElementById('gagasanRiset').value.trim(),
      rancanganImplementasi: document.getElementById('rancanganImplementasi').value.trim(),
      evaluasi: document.getElementById('evaluasi').value.trim()
    };
    await withLatestData(data => {
      data.karyaInovasi = { ...data.karyaInovasi, ...values };
      return data;
    }, `Update karya inovasi: ${values.namaKarya || '(tanpa judul)'}`, 'statusInovasi');
  });
}

/* ── Render all ── */
function renderAll() {
  renderIdentifikasi();
  renderReflectionList();
  renderKeseluruhan();
  renderInovasi();
}

/* ── Connection flow ── */
async function connect(token) {
  setToken(token);
  setTokenStatus(false, 'Menghubungkan…');
  try {
    const latest = await apiGet();
    state.data = latest.data;
    state.sha = latest.sha;
    setTokenStatus(true, 'Terhubung ke GitHub ✓');
    renderAll();
  } catch (err) {
    console.error(err);
    setTokenStatus(false, `Gagal terhubung: ${err.message}`);
  }
}

async function loadReadonly() {
  try {
    const res = await fetch(`data/portofolio.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
    state.sha = null;
    renderAll();
  } catch (err) {
    console.error('Gagal memuat data (mode baca saja):', err);
  }
}

function initTokenPanel() {
  document.getElementById('btnConnect').addEventListener('click', () => {
    const val = document.getElementById('tokenInput').value.trim();
    if (!val) return;
    document.getElementById('tokenInput').value = '';
    connect(val);
  });
  document.getElementById('btnLogout').addEventListener('click', () => {
    clearToken();
    state.sha = null;
    setTokenStatus(false, 'Belum terhubung');
  });

  const existing = getToken();
  if (existing) {
    connect(existing);
  } else {
    setTokenStatus(false, 'Belum terhubung');
    loadReadonly();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initIdentifikasiForm();
  initReflectionForm();
  initKeseluruhanForm();
  initInovasiForm();
  initTokenPanel();
});
