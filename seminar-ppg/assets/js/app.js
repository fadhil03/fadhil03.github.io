/* ═══════════════════════════════════════════════
   Portofolio Digital — Seminar PPG
   Public page renderer — reads data/portofolio.json
   (read-only, no token / write access from here)
═══════════════════════════════════════════════ */

const DATA_URL = 'data/portofolio.json';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function textOrPlaceholder(value, placeholder) {
  const v = (value || '').trim();
  if (!v) return `<span class="placeholder-text">${escapeHtml(placeholder)}</span>`;
  return escapeHtml(v).replace(/\n/g, '<br>');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderIdentifikasi(identifikasiDiri) {
  const id = identifikasiDiri || {};
  const map = {
    visiPendidikanIndonesia: 'visiPendidikanIndonesia',
    visiCalonGuru: 'visiCalonGuru',
    langkahKonkret: 'langkahKonkret'
  };
  Object.keys(map).forEach(key => {
    const el = document.querySelector(`[data-bind="${key}"]`);
    if (el) el.innerHTML = textOrPlaceholder(id[key], 'Belum diisi.');
  });
}

function courseBadge(pertemuanKe) {
  return pertemuanKe ? escapeHtml(pertemuanKe) : '–';
}

function renderCourseCard(course) {
  const filled = ['connection', 'challenge', 'concept', 'change'].some(k => (course[k] || '').trim());
  const updated = formatDate(course.tanggalDiperbarui);
  return `
    <div class="course-card reveal" id="course-${escapeHtml(course.id)}">
      <button class="course-card__head" type="button" aria-expanded="false">
        <span class="course-card__badge">${courseBadge(course.pertemuanKe)}</span>
        <span class="course-card__head-text">
          <span class="course-card__label">Pertemuan ke-${courseBadge(course.pertemuanKe)}</span>
          <span class="course-card__name">${escapeHtml(course.namaMataKuliah || 'Mata Kuliah')}</span>
        </span>
        <span class="course-card__chevron">▾</span>
      </button>
      <div class="course-card__body">
        <div class="course-card__body-inner">
          <div class="c4-grid">
            <div class="c4-item">
              <div class="c4-item__label">Connection</div>
              <div class="c4-item__body">${textOrPlaceholder(course.connection, 'Belum diisi.')}</div>
            </div>
            <div class="c4-item">
              <div class="c4-item__label">Challenge</div>
              <div class="c4-item__body">${textOrPlaceholder(course.challenge, 'Belum diisi.')}</div>
            </div>
            <div class="c4-item">
              <div class="c4-item__label">Concept</div>
              <div class="c4-item__body">${textOrPlaceholder(course.concept, 'Belum diisi.')}</div>
            </div>
            <div class="c4-item">
              <div class="c4-item__label">Change</div>
              <div class="c4-item__body">${textOrPlaceholder(course.change, 'Belum diisi.')}</div>
            </div>
          </div>
          <div class="course-extra">
            <div class="course-extra__label">Analisis Artefak Pembelajaran</div>
            <div class="course-extra__body">${textOrPlaceholder(course.analisisArtefak, 'Belum diisi.')}</div>
          </div>
          <div class="course-extra">
            <div class="course-extra__label">Kaitan dengan Kompetensi Praktis Keguruan</div>
            <div class="course-extra__body">${textOrPlaceholder(course.kaitanPraktis, 'Belum diisi.')}</div>
          </div>
          <div class="course-card__meta-row">
            ${filled ? '' : '<span class="placeholder-text" style="font-size:12px;">Refleksi ini belum dilengkapi.</span>'}
            ${updated ? `<span class="course-card__updated">Diperbarui ${updated}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRefleksiMataKuliah(list) {
  const courses = Array.isArray(list) ? list : [];
  const sem1 = courses.filter(c => Number(c.semester) === 1);
  const sem2 = courses.filter(c => Number(c.semester) === 2);

  const gridSem1 = document.getElementById('courseGridSem1');
  const gridSem2 = document.getElementById('courseGridSem2');
  if (gridSem1) gridSem1.innerHTML = sem1.map(renderCourseCard).join('') || '<p class="empty-state">Belum ada data mata kuliah.</p>';
  if (gridSem2) gridSem2.innerHTML = sem2.map(renderCourseCard).join('') || '<p class="empty-state">Belum ada data mata kuliah.</p>';

  document.querySelectorAll('.course-card__head').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.course-card');
      const isOpen = card.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
    });
  });

  observeReveal();
}

function initSemesterTabs() {
  const tabs = document.querySelectorAll('.semester-tabs button');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const sem = tab.dataset.semester;
      document.getElementById('courseGridSem1').style.display = sem === '1' ? 'grid' : 'none';
      document.getElementById('courseGridSem2').style.display = sem === '2' ? 'grid' : 'none';
    });
  });
}

function renderRefleksiKeseluruhan(data) {
  const rk = data || {};
  const p1 = document.querySelector('[data-bind="pandanganPendidikanIndonesia"]');
  const p2 = document.querySelector('[data-bind="upayaGuruProfesional"]');
  if (p1) p1.innerHTML = textOrPlaceholder(rk.pandanganPendidikanIndonesia, 'Belum diisi.');
  if (p2) p2.innerHTML = textOrPlaceholder(rk.upayaGuruProfesional, 'Belum diisi.');

  const list = Array.isArray(rk.rencanaTindakLanjut) ? rk.rencanaTindakLanjut.filter(x => (x || '').trim()) : [];
  const ul = document.getElementById('rencanaTindakLanjutList');
  if (ul) {
    ul.innerHTML = list.length
      ? list.map(item => `<li>${escapeHtml(item)}</li>`).join('')
      : `<li><span class="placeholder-text">Belum diisi.</span></li>`;
  }
}

function renderKaryaInovasi(data) {
  const ki = data || {};
  const titleEl = document.getElementById('karyaInovasiTitle');
  if (titleEl) {
    titleEl.textContent = (ki.namaKarya || '').trim() || 'Judul karya belum diisi';
  }
  const map = ['sasaranInovasi', 'gagasanRiset', 'rancanganImplementasi', 'evaluasi'];
  map.forEach(key => {
    const el = document.querySelector(`[data-bind="karya-${key}"]`);
    if (el) el.innerHTML = textOrPlaceholder(ki[key], 'Belum diisi.');
  });
}

function observeReveal() {
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal:not(.visible), .reveal-scale:not(.visible)').forEach(el => revealObs.observe(el));
}

async function loadPortofolio() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderIdentifikasi(data.identifikasiDiri);
    renderRefleksiMataKuliah(data.refleksiMataKuliah);
    renderRefleksiKeseluruhan(data.refleksiKeseluruhan);
    renderKaryaInovasi(data.karyaInovasi);
  } catch (err) {
    console.error('Gagal memuat portofolio.json', err);
    const main = document.querySelector('main') || document.body;
    const banner = document.createElement('div');
    banner.style.cssText = 'max-width:720px;margin:100px auto 0;padding:20px 24px;background:#fff4e5;border:1px solid #f3c98a;color:#7a4a00;border-radius:14px;font-size:14px;text-align:center;';
    banner.textContent = 'Gagal memuat data portofolio. Coba muat ulang halaman.';
    main.prepend(banner);
  } finally {
    observeReveal();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSemesterTabs();
  loadPortofolio();
});
