/**
 * D'AMOUR Sistem IPL Perumahan - Core Application Logic (Dynamic Simulasi from Master Komponen)
 */

let appState = null;
let currentHousePage = 1;
let currentTagihanPage = 1;
const itemsPerPage = 5;
let donutChartInstance = null;
let barChartInstance = null;

// Formatters
const formatRp = (num) => {
  if (isNaN(num) || num === null || num === undefined) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(num);
};

const formatRpDecimal = (num) => {
  if (isNaN(num) || num === null || num === undefined) return "0,00";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
  await loadAppData();
  setupEventListeners();
  updateHouseGroupCounts();
  renderDashboard();
  renderMasterRumah();
  renderMasterKomponen();
  renderSettingTarget();
  renderPerhitunganIPL();
  renderDaftarTagihan();
  renderPengeluaranTable();
  renderKasArusKasTable();
  renderSimulasiInputs();
  runSimulasiIPL();
});

// Load App Data from LocalStorage or data.json
async function loadAppData() {
  const saved = localStorage.getItem("damour_ipl_db");
  if (saved) {
    try {
      appState = JSON.parse(saved);
      console.log("Data loaded from LocalStorage.");
      if (appState.settings && appState.settings.googleSheetApiUrl) {
        const urlInput = document.getElementById("setting-gsheet-url");
        if (urlInput) urlInput.value = appState.settings.googleSheetApiUrl;
      }
      return;
    } catch (e) {
      console.error("Failed to parse LocalStorage data, loading default data.json", e);
    }
  }

  try {
    const res = await fetch("data.json");
    appState = await res.json();
    saveState();
    console.log("Data loaded from data.json.");
  } catch (err) {
    console.error("Error loading data.json:", err);
  }
}

function saveState() {
  if (appState) {
    localStorage.setItem("damour_ipl_db", JSON.stringify(appState));
  }
}

function clearAllAppData() {
  if (confirm("Apakah Anda yakin ingin mengosongkan SELURUH data? Anda dapat menginput ulang data rumah dan transaksi satu per satu dari awal.")) {
    appState = {
      settings: { appName: "D'AMOUR Sistem IPL", perumahan: "Perumahan D'AMOUR", periodeAktif: "2025-08", googleSheetApiUrl: "" },
      targetIPL: [
        { id: "tgt-1", kelompok: "IPL + Sampah", target: 175000, keterangan: "IPL + Sampah" },
        { id: "tgt-2", kelompok: "IPL Tanpa Sampah", target: 150000, keterangan: "IPL Tanpa Sampah" },
        { id: "tgt-3", kelompok: "IPL Developer", target: 166000, keterangan: "IPL Developer" }
      ],
      komponenIPL: [
        { id: "komp-1", nama: "Satpam", nominalTotal: 3700000, isAutoKas: false, dibayarOleh: "Semua", aktif: true },
        { id: "komp-2", nama: "Kas (Otomatis)", nominalTotal: 0, isAutoKas: true, dibayarOleh: "Semua", aktif: true },
        { id: "komp-3", nama: "Sampah", nominalTotal: 775000, isAutoKas: false, dibayarOleh: "IPL + Sampah", aktif: true },
        { id: "komp-4", nama: "Listrik + Wifi", nominalTotal: 550000, isAutoKas: false, dibayarOleh: "Semua", aktif: true }
      ],
      rumah: [],
      tagihan: [],
      pengeluaran: [],
      grafik6Bulan: [],
      ringkasanKas: { kasSaatIni: 0, masuk: 0, keluar: 0, selisih: 0 }
    };

    saveState();
    alert("Seluruh data telah dikosongkan. Silakan mulai menginput data rumah dan transaksi satu per satu!");
    location.reload();
  }
}

// Navigation View Switcher
function showView(viewId) {
  document.querySelectorAll(".view-section").forEach((sec) => {
    sec.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  const targetSec = document.getElementById(`view-${viewId}`);
  if (targetSec) {
    targetSec.classList.add("active");
  }

  const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (activeNav) {
    activeNav.classList.add("active");
  }

  const breadcrumb = document.getElementById("page-title-breadcrumb");
  if (breadcrumb) {
    const titles = {
      dashboard: "Dashboard",
      rumah: "Master Rumah",
      komponen: "Master Komponen IPL",
      target: "Setting Target IPL",
      perhitungan: "Perhitungan IPL (Rincian)",
      "generate-tagihan": "Generate Tagihan",
      "daftar-tagihan": "Daftar Tagihan",
      "detail-tagihan": "Detail Tagihan",
      "form-pembayaran": "Pembayaran",
      pengeluaran: "Data Pengeluaran",
      kas: "Kas (Arus Kas)",
      laporan: "Laporan IPL",
      simulasi: "Simulasi IPL",
      pengaturan: "Pengaturan Sistem"
    };
    breadcrumb.textContent = titles[viewId] || "Dashboard";
  }

  if (viewId === "dashboard") renderDashboard();
  if (viewId === "rumah") renderMasterRumah();
  if (viewId === "komponen") renderMasterKomponen();
  if (viewId === "target") renderSettingTarget();
  if (viewId === "perhitungan") renderPerhitunganIPL();
  if (viewId === "generate-tagihan") updateHouseGroupCounts();
  if (viewId === "daftar-tagihan") renderDaftarTagihan();
  if (viewId === "pengeluaran") renderPengeluaranTable();
  if (viewId === "kas") renderKasArusKasTable();
  if (viewId === "simulasi") {
    renderSimulasiInputs();
    runSimulasiIPL();
  }
}

// Event Listeners
function setupEventListeners() {
  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const view = btn.getAttribute("data-view");
      showView(view);
      document.querySelector(".sidebar").classList.remove("open");
    });
  });

  const toggleBtn = document.getElementById("toggle-sidebar");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.querySelector(".sidebar").classList.toggle("open");
    });
  }

  const searchInput = document.getElementById("search-rumah-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentHousePage = 1;
      renderMasterRumah();
    });
  }

  const searchTagihanInput = document.getElementById("filter-tagihan-search");
  if (searchTagihanInput) {
    searchTagihanInput.addEventListener("input", () => {
      currentTagihanPage = 1;
      renderDaftarTagihan();
    });
  }
}

/* ==========================================================================
   1. DASHBOARD
   ========================================================================== */
function renderDashboard() {
  if (!appState) return;

  const totalRumah = appState.rumah ? appState.rumah.length : 0;
  const lunasCount = appState.tagihan ? appState.tagihan.filter((t) => t.status === "Lunas").length : 0;
  const menungguCount = appState.tagihan ? appState.tagihan.filter((t) => t.status === "Menunggu").length : 0;
  const menunggakCount = appState.tagihan ? appState.tagihan.filter((t) => t.status === "Menunggak").length : 0;

  document.getElementById("kpi-total-rumah").textContent = `${totalRumah} Unit`;
  document.getElementById("kpi-menunggak").textContent = `${menungguCount + menunggakCount} Unit`;
  document.getElementById("kpi-lunas").textContent = `${lunasCount} Unit`;
  document.getElementById("kpi-kas").textContent = formatRp(appState.ringkasanKas ? appState.ringkasanKas.kasSaatIni : 0);

  const totalTagihan = appState.tagihan ? appState.tagihan.reduce((acc, t) => acc + t.nominal, 0) : 0;
  const totalPembayaran = appState.tagihan
    ? appState.tagihan.filter((t) => t.status === "Lunas").reduce((acc, t) => acc + t.nominal, 0)
    : 0;
  const sisaTagihan = totalTagihan - totalPembayaran;

  document.getElementById("dash-total-tagihan").textContent = formatRp(totalTagihan);
  document.getElementById("dash-total-pembayaran").textContent = formatRp(totalPembayaran);
  document.getElementById("dash-sisa-tagihan").textContent = formatRp(sisaTagihan);

  document.getElementById("dash-kas-masuk").textContent = formatRp(appState.ringkasanKas ? appState.ringkasanKas.masuk : 0);
  document.getElementById("dash-kas-keluar").textContent = formatRp(appState.ringkasanKas ? appState.ringkasanKas.keluar : 0);
  const selisih = appState.ringkasanKas ? appState.ringkasanKas.selisih : 0;
  const selisihEl = document.getElementById("dash-kas-selisih");
  if (selisihEl) {
    selisihEl.textContent = formatRp(selisih);
    selisihEl.style.color = selisih < 0 ? "var(--danger)" : "var(--success)";
  }

  const recentTagihanTbody = document.getElementById("recent-tagihan-tbody");
  if (recentTagihanTbody) {
    if (!appState.tagihan || appState.tagihan.length === 0) {
      recentTagihanTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Belum ada data tagihan.</td></tr>`;
    } else {
      recentTagihanTbody.innerHTML = appState.tagihan
        .slice(0, 4)
        .map((t) => {
          let badgeClass = "badge-secondary";
          if (t.status === "Lunas") badgeClass = "badge-success";
          if (t.status === "Menunggu") badgeClass = "badge-warning";
          if (t.status === "Menunggak") badgeClass = "badge-danger";

          return `
            <tr>
              <td><strong>${t.blokNo}</strong> - ${t.pemilik}</td>
              <td><span class="badge ${badgeClass}">${t.status}</span></td>
              <td>${t.tglBayar}</td>
              <td style="text-align: right; font-weight: 600;">${formatRp(t.nominal)}</td>
            </tr>
          `;
        })
        .join("");
    }
  }

  const recentPengeluaranTbody = document.getElementById("recent-pengeluaran-tbody");
  if (recentPengeluaranTbody) {
    if (!appState.pengeluaran || appState.pengeluaran.length === 0) {
      recentPengeluaranTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Belum ada data pengeluaran.</td></tr>`;
    } else {
      recentPengeluaranTbody.innerHTML = appState.pengeluaran
        .slice(0, 3)
        .map(
          (p) => `
          <tr>
            <td>${p.tanggal}</td>
            <td><strong>${p.kategori}</strong></td>
            <td style="text-align: right; font-weight: 600;">${formatRp(p.nominal)}</td>
          </tr>
        `
        )
        .join("");
    }
  }

  renderCharts(lunasCount, menungguCount, menunggakCount, totalRumah);
}

function renderCharts(lunas, menunggu, menunggak, total) {
  if (typeof Chart === "undefined") return;

  const ctxDonut = document.getElementById("chart-status-tagihan");
  if (ctxDonut) {
    if (donutChartInstance) donutChartInstance.destroy();
    donutChartInstance = new Chart(ctxDonut, {
      type: "doughnut",
      data: {
        labels: [`Lunas (${lunas})`, `Menunggu (${menunggu})`, `Menunggak (${menunggak})`],
        datasets: [
          {
            data: [lunas, menunggu, menunggak],
            backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
            borderWidth: 2,
            borderColor: "#ffffff"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "right" } },
        cutout: "70%"
      }
    });
  }

  const ctxBar = document.getElementById("chart-pembayaran-history");
  if (ctxBar) {
    if (barChartInstance) barChartInstance.destroy();
    const historyData = appState.grafik6Bulan && appState.grafik6Bulan.length > 0
      ? appState.grafik6Bulan
      : [
          { bulan: "Mar", tagihan: 0, pembayaran: 0 },
          { bulan: "Apr", tagihan: 0, pembayaran: 0 },
          { bulan: "Mei", tagihan: 0, pembayaran: 0 },
          { bulan: "Jun", tagihan: 0, pembayaran: 0 },
          { bulan: "Jul", tagihan: 0, pembayaran: 0 },
          { bulan: "Agu", tagihan: 0, pembayaran: 0 }
        ];

    const labels = historyData.map((g) => g.bulan);
    const dataTagihan = historyData.map((g) => g.tagihan / 1000000);
    const dataPembayaran = historyData.map((g) => g.pembayaran / 1000000);

    barChartInstance = new Chart(ctxBar, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          { label: "Tagihan (jt)", data: dataTagihan, backgroundColor: "#cbd5e1", borderRadius: 4 },
          { label: "Pembayaran (jt)", data: dataPembayaran, backgroundColor: "#2563eb", borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { callback: (val) => `${val} jt` } }
        }
      }
    });
  }
}

/* ==========================================================================
   2. MASTER RUMAH & KOMPONEN
   ========================================================================== */
function renderMasterRumah() {
  if (!appState || !appState.rumah) return;

  const searchVal = (document.getElementById("search-rumah-input")?.value || "").toLowerCase();
  const filtered = appState.rumah.filter(
    (r) =>
      r.blokNo.toLowerCase().includes(searchVal) ||
      r.pemilik.toLowerCase().includes(searchVal) ||
      r.noHp.toLowerCase().includes(searchVal) ||
      r.kelompokIPL.toLowerCase().includes(searchVal)
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentHousePage > totalPages) currentHousePage = totalPages;

  const startIdx = (currentHousePage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

  const tbody = document.getElementById("master-rumah-tbody");
  if (tbody) {
    if (paginated.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada data rumah. Klik tombol <strong>+ Tambah Rumah</strong> di atas.</td></tr>`;
    } else {
      tbody.innerHTML = paginated
        .map(
          (r) => `
          <tr>
            <td><strong>${r.blokNo}</strong></td>
            <td>${r.pemilik}</td>
            <td>${r.noHp}</td>
            <td><span class="badge badge-success">${r.status}</span></td>
            <td>${r.kelompokIPL}</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="editRumah('${r.id}')"><i class="ri-edit-line"></i></button>
              <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deleteRumah('${r.id}')"><i class="ri-delete-bin-line"></i></button>
            </td>
          </tr>
        `
        )
        .join("");
    }
  }

  const pageNav = document.getElementById("rumah-pagination");
  if (pageNav) {
    let pagesHtml = `<button class="page-btn" onclick="changeHousePage(${currentHousePage - 1})" ${currentHousePage === 1 ? "disabled" : ""}><i class="ri-arrow-left-s-line"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
      pagesHtml += `<button class="page-btn ${i === currentHousePage ? "active" : ""}" onclick="changeHousePage(${i})">${i}</button>`;
    }
    pagesHtml += `<button class="page-btn" onclick="changeHousePage(${currentHousePage + 1})" ${currentHousePage === totalPages ? "disabled" : ""}><i class="ri-arrow-right-s-line"></i></button>`;
    pageNav.innerHTML = pagesHtml;
  }
}

function changeHousePage(page) {
  currentHousePage = page;
  renderMasterRumah();
}

function openAddRumahModal() {
  document.getElementById("form-rumah-id").value = "";
  document.getElementById("form-rumah-blok").value = "";
  document.getElementById("form-rumah-pemilik").value = "";
  document.getElementById("form-rumah-hp").value = "";
  document.getElementById("form-rumah-kelompok").value = "IPL + Sampah";
  document.getElementById("modal-rumah-title").textContent = "Tambah Rumah Baru";
  openModal("modal-rumah");
}

function editRumah(id) {
  const r = appState.rumah.find((item) => item.id === id);
  if (!r) return;

  document.getElementById("form-rumah-id").value = r.id;
  document.getElementById("form-rumah-blok").value = r.blokNo;
  document.getElementById("form-rumah-pemilik").value = r.pemilik;
  document.getElementById("form-rumah-hp").value = r.noHp;
  document.getElementById("form-rumah-kelompok").value = r.kelompokIPL;
  document.getElementById("modal-rumah-title").textContent = "Edit Data Rumah";
  openModal("modal-rumah");
}

function saveRumah() {
  const id = document.getElementById("form-rumah-id").value;
  const blok = document.getElementById("form-rumah-blok").value.trim();
  const pemilik = document.getElementById("form-rumah-pemilik").value.trim();
  const hp = document.getElementById("form-rumah-hp").value.trim();
  const kelompok = document.getElementById("form-rumah-kelompok").value;

  if (!blok || !pemilik) {
    alert("Blok/No dan Nama Pemilik wajib diisi.");
    return;
  }

  if (id) {
    const idx = appState.rumah.findIndex((r) => r.id === id);
    if (idx !== -1) {
      appState.rumah[idx] = { ...appState.rumah[idx], blokNo: blok, pemilik, noHp: hp, kelompokIPL: kelompok };
    }
  } else {
    const newId = `RMH-${blok}`;
    appState.rumah.push({
      id: newId,
      blokNo: blok,
      pemilik,
      noHp: hp || "0812xxxxxxxx",
      status: "Aktif",
      kelompokIPL: kelompok
    });
  }

  saveState();
  closeModal("modal-rumah");
  updateHouseGroupCounts();
  renderMasterRumah();
  renderDashboard();
  renderSimulasiInputs();
  runSimulasiIPL();
}

function deleteRumah(id) {
  if (confirm("Apakah Anda yakin ingin menghapus data rumah ini?")) {
    appState.rumah = appState.rumah.filter((r) => r.id !== id);
    saveState();
    updateHouseGroupCounts();
    renderMasterRumah();
    renderDashboard();
    renderSimulasiInputs();
    runSimulasiIPL();
  }
}

function renderMasterKomponen() {
  if (!appState || !appState.komponenIPL) return;

  const tbody = document.getElementById("master-komponen-tbody");
  if (tbody) {
    tbody.innerHTML = appState.komponenIPL
      .map(
        (k) => `
        <tr>
          <td><strong>${k.nama}</strong></td>
          <td>${k.isAutoKas ? "<span class='badge badge-secondary'>AUTO (Sisa)</span>" : formatRp(k.nominalTotal)}</td>
          <td>${k.dibayarOleh}</td>
          <td>
            <input type="checkbox" ${k.aktif ? "checked" : ""} onchange="toggleKomponenAktif('${k.id}')" style="width: 18px; height: 18px; cursor: pointer;">
          </td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="editKomponen('${k.id}')"><i class="ri-edit-line"></i></button>
            <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deleteKomponen('${k.id}')"><i class="ri-delete-bin-line"></i></button>
          </td>
        </tr>
      `
      )
      .join("");
  }
}

function toggleKomponenAktif(id) {
  const k = appState.komponenIPL.find((item) => item.id === id);
  if (k) {
    k.aktif = !k.aktif;
    saveState();
    renderMasterKomponen();
    renderPerhitunganIPL();
    renderSimulasiInputs();
    runSimulasiIPL();
  }
}

function openAddKomponenModal() {
  document.getElementById("form-komponen-id").value = "";
  document.getElementById("form-komponen-nama").value = "";
  document.getElementById("form-komponen-nominal").value = "";
  document.getElementById("form-komponen-dibayar").value = "Semua";
  document.getElementById("form-komponen-autokas").checked = false;
  openModal("modal-komponen");
}

function editKomponen(id) {
  const k = appState.komponenIPL.find((item) => item.id === id);
  if (!k) return;

  document.getElementById("form-komponen-id").value = k.id;
  document.getElementById("form-komponen-nama").value = k.nama;
  document.getElementById("form-komponen-nominal").value = k.nominalTotal;
  document.getElementById("form-komponen-dibayar").value = k.dibayarOleh;
  document.getElementById("form-komponen-autokas").checked = k.isAutoKas;
  openModal("modal-komponen");
}

function saveKomponen() {
  const id = document.getElementById("form-komponen-id").value;
  const nama = document.getElementById("form-komponen-nama").value.trim();
  const nominal = parseFloat(document.getElementById("form-komponen-nominal").value) || 0;
  const dibayar = document.getElementById("form-komponen-dibayar").value;
  const isAutoKas = document.getElementById("form-komponen-autokas").checked;

  if (!nama) {
    alert("Nama komponen wajib diisi.");
    return;
  }

  if (id) {
    const idx = appState.komponenIPL.findIndex((k) => k.id === id);
    if (idx !== -1) {
      appState.komponenIPL[idx] = { ...appState.komponenIPL[idx], nama, nominalTotal: nominal, dibayarOleh: dibayar, isAutoKas };
    }
  } else {
    appState.komponenIPL.push({
      id: `komp-${Date.now()}`,
      nama,
      nominalTotal: nominal,
      isAutoKas,
      dibayarOleh: dibayar,
      aktif: true
    });
  }

  saveState();
  closeModal("modal-komponen");
  renderMasterKomponen();
  renderPerhitunganIPL();
  renderSimulasiInputs();
  runSimulasiIPL();
}

function deleteKomponen(id) {
  if (confirm("Apakah Anda yakin ingin menghapus komponen IPL ini?")) {
    appState.komponenIPL = appState.komponenIPL.filter((k) => k.id !== id);
    saveState();
    renderMasterKomponen();
    renderPerhitunganIPL();
    renderSimulasiInputs();
    runSimulasiIPL();
  }
}

function renderSettingTarget() {
  if (!appState || !appState.targetIPL) return;

  const tbody = document.getElementById("setting-target-tbody");
  if (tbody) {
    tbody.innerHTML = appState.targetIPL
      .map(
        (t) => `
        <tr>
          <td><strong>${t.kelompok}</strong></td>
          <td style="font-weight: 600;">${formatRp(t.target)}</td>
        </tr>
      `
      )
      .join("");
  }
}

function openEditTargetModal() {
  const targetStandard = appState.targetIPL.find((t) => t.kelompok === "IPL + Sampah")?.target || 175000;
  const targetTanpaSampah = appState.targetIPL.find((t) => t.kelompok === "IPL Tanpa Sampah")?.target || 150000;
  const targetDev = appState.targetIPL.find((t) => t.kelompok === "IPL Developer")?.target || 166000;

  document.getElementById("target-val-1").value = targetStandard;
  document.getElementById("target-val-2").value = targetTanpaSampah;
  document.getElementById("target-val-3").value = targetDev;

  openModal("modal-target");
}

function saveSettingTarget() {
  const val1 = parseFloat(document.getElementById("target-val-1").value) || 175000;
  const val2 = parseFloat(document.getElementById("target-val-2").value) || 150000;
  const val3 = parseFloat(document.getElementById("target-val-3").value) || 166000;

  appState.targetIPL.forEach((t) => {
    if (t.kelompok === "IPL + Sampah") t.target = val1;
    if (t.kelompok === "IPL Tanpa Sampah") t.target = val2;
    if (t.kelompok === "IPL Developer") t.target = val3;
  });

  saveState();
  closeModal("modal-target");
  renderSettingTarget();
  renderPerhitunganIPL();
  runSimulasiIPL();
}

function renderPerhitunganIPL() {
  if (!appState || !appState.rumah) return;

  const totalRumah = appState.rumah.length || 1;
  const targetIPLObj = appState.targetIPL.find((t) => t.kelompok === "IPL + Sampah");
  const targetNominal = targetIPLObj ? targetIPLObj.target : 175000;

  let fixedCostsPerHomeSum = 0;

  const tbody = document.getElementById("perhitungan-ipl-tbody");
  if (!tbody) return;

  const rowsHtml = appState.komponenIPL
    .filter((k) => k.aktif)
    .map((k) => {
      if (k.isAutoKas) {
        return `<tr id="row-auto-kas">
          <td><strong>${k.nama}</strong></td>
          <td><span class="badge badge-secondary">AUTO (Sisa)</span></td>
          <td>${k.dibayarOleh}</td>
          <td>${totalRumah}</td>
          <td id="cell-kas-per-rumah" style="font-weight: 600;">-</td>
        </tr>`;
      }

      const costPerHome = totalRumah > 0 ? k.nominalTotal / totalRumah : 0;
      fixedCostsPerHomeSum += costPerHome;

      return `
        <tr>
          <td><strong>${k.nama}</strong></td>
          <td>${formatRp(k.nominalTotal)}</td>
          <td>${k.dibayarOleh}</td>
          <td>${totalRumah}</td>
          <td style="font-weight: 600;">${formatRpDecimal(costPerHome)}</td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rowsHtml;

  const kasPerHome = Math.max(0, targetNominal - fixedCostsPerHomeSum);
  const kasCell = document.getElementById("cell-kas-per-rumah");
  if (kasCell) {
    kasCell.textContent = formatRpDecimal(kasPerHome);
  }

  const grandTotalPerHome = fixedCostsPerHomeSum + kasPerHome;
  const totalCell = document.getElementById("perhitungan-grand-total");
  if (totalCell) {
    totalCell.textContent = `${formatRpDecimal(grandTotalPerHome)}`;
  }
}

function updateHouseGroupCounts() {
  if (!appState || !appState.rumah) return;

  const g1 = appState.rumah.filter((r) => r.kelompokIPL === "IPL + Sampah").length;
  const g2 = appState.rumah.filter((r) => r.kelompokIPL === "IPL Tanpa Sampah").length;
  const g3 = appState.rumah.filter((r) => r.kelompokIPL === "IPL Developer").length;

  if (document.getElementById("cnt-group-1")) document.getElementById("cnt-group-1").textContent = `${g1} Rumah`;
  if (document.getElementById("cnt-group-2")) document.getElementById("cnt-group-2").textContent = `${g2} Rumah`;
  if (document.getElementById("cnt-group-3")) document.getElementById("cnt-group-3").textContent = `${g3} Rumah`;
}

function processGenerateTagihan() {
  if (!appState.rumah || appState.rumah.length === 0) {
    alert("Belum ada data rumah terdaftar. Tambahkan data rumah terlebih dahulu pada menu Master Rumah.");
    return;
  }

  const bulan = document.getElementById("gen-bulan").value;
  const tahun = document.getElementById("gen-tahun").value;

  const chk1 = document.getElementById("chk-group-1").checked;
  const chk2 = document.getElementById("chk-group-2").checked;
  const chk3 = document.getElementById("chk-group-3").checked;

  const selectedGroups = [];
  if (chk1) selectedGroups.push("IPL + Sampah");
  if (chk2) selectedGroups.push("IPL Tanpa Sampah");
  if (chk3) selectedGroups.push("IPL Developer");

  if (selectedGroups.length === 0) {
    alert("Pilih minimal satu kelompok IPL untuk digenerate.");
    return;
  }

  const targetMap = {};
  appState.targetIPL.forEach((t) => {
    targetMap[t.kelompok] = t.target;
  });

  const matchingHouses = appState.rumah.filter((r) => selectedGroups.includes(r.kelompokIPL));

  let generatedCount = 0;

  matchingHouses.forEach((r) => {
    const tagihanId = `TAG-${tahun}${bulan}-${r.blokNo}`;
    const exists = appState.tagihan.find((t) => t.id === tagihanId);

    const nominal = targetMap[r.kelompokIPL] || 175000;

    if (!exists) {
      appState.tagihan.unshift({
        id: tagihanId,
        periode: `${tahun}-${bulan}`,
        bulan: bulan,
        tahun: tahun,
        rumahId: r.id,
        blokNo: r.blokNo,
        pemilik: r.pemilik,
        kelompokIPL: r.kelompokIPL,
        nominal: nominal,
        status: "Menunggu",
        tglBayar: "-",
        metode: "-",
        buktiTransfer: ""
      });
      generatedCount++;
    }
  });

  saveState();
  renderDashboard();
  renderDaftarTagihan();
  alert(`Berhasil meng-generate ${generatedCount} tagihan baru untuk bulan ${bulan} ${tahun}.`);
  showView("daftar-tagihan");
}

function renderDaftarTagihan() {
  if (!appState || !appState.tagihan) return;

  const searchVal = (document.getElementById("filter-tagihan-search")?.value || "").toLowerCase();
  const filterBulan = document.getElementById("filter-tagihan-bulan")?.value || "Agustus";

  const filtered = appState.tagihan.filter((t) => {
    const matchesSearch = t.blokNo.toLowerCase().includes(searchVal) || t.pemilik.toLowerCase().includes(searchVal);
    const matchesBulan = filterBulan === "Semua" || t.bulan === filterBulan || t.periode.includes(filterBulan);
    return matchesSearch && matchesBulan;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentTagihanPage > totalPages) currentTagihanPage = totalPages;

  const startIdx = (currentTagihanPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

  const tbody = document.getElementById("daftar-tagihan-tbody");
  if (tbody) {
    if (paginated.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada data tagihan. Gunakan menu <strong>Generate Tagihan</strong> untuk membuat tagihan baru.</td></tr>`;
    } else {
      tbody.innerHTML = paginated
        .map((t, idx) => {
          let badgeClass = "badge-secondary";
          if (t.status === "Lunas") badgeClass = "badge-success";
          if (t.status === "Menunggu") badgeClass = "badge-warning";
          if (t.status === "Menunggak") badgeClass = "badge-danger";

          const globalIndex = startIdx + idx + 1;

          return `
            <tr>
              <td>${globalIndex}</td>
              <td><strong>${t.blokNo}</strong></td>
              <td>${t.pemilik}</td>
              <td>${t.kelompokIPL}</td>
              <td style="font-weight: 600;">${formatRp(t.nominal)}</td>
              <td><span class="badge ${badgeClass}">${t.status}</span></td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="viewDetailTagihan('${t.id}')" title="Lihat Detail"><i class="ri-eye-line"></i></button>
                ${
                  t.status !== "Lunas"
                    ? `<button class="btn btn-primary btn-sm" onclick="openFormPembayaran('${t.id}')" title="Bayar"><i class="ri-checkbox-circle-line"></i></button>`
                    : ""
                }
              </td>
            </tr>
          `;
        })
        .join("");
    }
  }

  const pageNav = document.getElementById("tagihan-pagination");
  if (pageNav) {
    let pagesHtml = `<button class="page-btn" onclick="changeTagihanPage(${currentTagihanPage - 1})" ${currentTagihanPage === 1 ? "disabled" : ""}><i class="ri-arrow-left-s-line"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
      pagesHtml += `<button class="page-btn ${i === currentTagihanPage ? "active" : ""}" onclick="changeTagihanPage(${i})">${i}</button>`;
    }
    pagesHtml += `<button class="page-btn" onclick="changeTagihanPage(${currentTagihanPage + 1})" ${currentTagihanPage === totalPages ? "disabled" : ""}><i class="ri-arrow-right-s-line"></i></button>`;
    pageNav.innerHTML = pagesHtml;
  }
}

function changeTagihanPage(page) {
  currentTagihanPage = page;
  renderDaftarTagihan();
}

function viewDetailTagihan(id) {
  const t = appState.tagihan.find((item) => item.id === id);
  if (!t) return;

  document.getElementById("detail-val-rumah").textContent = `${t.blokNo} - ${t.pemilik}`;
  document.getElementById("detail-val-kelompok").textContent = t.kelompokIPL;
  document.getElementById("detail-val-bulan").textContent = `${t.bulan || "Agustus"} ${t.tahun || "2025"}`;
  document.getElementById("detail-val-nominal").textContent = formatRp(t.nominal);

  let badgeClass = "badge-secondary";
  if (t.status === "Lunas") badgeClass = "badge-success";
  if (t.status === "Menunggu") badgeClass = "badge-warning";
  if (t.status === "Menunggak") badgeClass = "badge-danger";

  document.getElementById("detail-val-status").innerHTML = `<span class="badge ${badgeClass}">${t.status}</span>`;

  const totalRumah = appState.rumah.length || 1;
  const tbody = document.getElementById("detail-rincian-tbody");

  if (tbody) {
    let fixedSum = 0;
    const rows = appState.komponenIPL
      .filter((k) => k.aktif)
      .map((k) => {
        if (k.isAutoKas) {
          const kasPerHome = Math.max(0, t.nominal - fixedSum);
          return `
            <tr>
              <td>${k.nama}</td>
              <td style="text-align: right;">${formatRpDecimal(kasPerHome)}</td>
            </tr>
          `;
        }
        const c = k.nominalTotal / totalRumah;
        fixedSum += c;
        return `
          <tr>
            <td>${k.nama}</td>
            <td style="text-align: right;">${formatRpDecimal(c)}</td>
          </tr>
        `;
      })
      .join("");

    tbody.innerHTML = rows;
  }

  document.getElementById("detail-val-total-rounded").textContent = formatRp(t.nominal).replace("Rp ", "");
  showView("detail-tagihan");
}

function openFormPembayaran(id) {
  const t = appState.tagihan.find((item) => item.id === id);
  if (!t) return;

  document.getElementById("bayar-form-id").value = t.id;
  document.getElementById("bayar-form-rumah").textContent = `${t.blokNo} - ${t.pemilik}`;
  document.getElementById("bayar-form-bulan").textContent = `${t.bulan || "Agustus"} ${t.tahun || "2025"}`;
  document.getElementById("bayar-form-total").textContent = formatRp(t.nominal);
  document.getElementById("bayar-form-nominal").value = t.nominal;

  let badgeClass = "badge-secondary";
  if (t.status === "Lunas") badgeClass = "badge-success";
  if (t.status === "Menunggu") badgeClass = "badge-warning";
  if (t.status === "Menunggak") badgeClass = "badge-danger";

  document.getElementById("bayar-form-status").className = `badge ${badgeClass}`;
  document.getElementById("bayar-form-status").textContent = t.status;

  document.getElementById("preview-bukti-wrapper").style.display = "none";
  document.getElementById("img-preview-bukti").src = "";

  showView("form-pembayaran");
}

function previewBuktiTransfer(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("img-preview-bukti").src = e.target.result;
      document.getElementById("preview-bukti-wrapper").style.display = "block";
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function simpanFormPembayaran() {
  const id = document.getElementById("bayar-form-id").value;
  const tgl = document.getElementById("bayar-form-tanggal").value;
  const metode = document.getElementById("bayar-form-metode").value;
  const nominal = parseFloat(document.getElementById("bayar-form-nominal").value) || 0;
  const previewImg = document.getElementById("img-preview-bukti").src;

  const t = appState.tagihan.find((item) => item.id === id);
  if (t) {
    t.status = "Lunas";
    t.tglBayar = tgl.split("-").reverse().join("/");
    t.metode = metode;
    if (previewImg && !previewImg.endsWith("#")) {
      t.buktiTransfer = previewImg;
    }

    if (!appState.ringkasanKas) appState.ringkasanKas = { kasSaatIni: 0, masuk: 0, keluar: 0, selisih: 0 };
    appState.ringkasanKas.kasSaatIni += nominal;
    appState.ringkasanKas.masuk += nominal;
    appState.ringkasanKas.selisih = appState.ringkasanKas.masuk - appState.ringkasanKas.keluar;

    saveState();
    alert("Pembayaran berhasil disimpan!");
    showView("daftar-tagihan");
    renderDashboard();
    renderKasArusKasTable();
  }
}

function renderPengeluaranTable() {
  if (!appState || !appState.pengeluaran) return;

  const filterBulan = document.getElementById("filter-pgl-bulan")?.value || "Agustus";
  const tbody = document.getElementById("pengeluaran-full-tbody");

  if (tbody) {
    if (appState.pengeluaran.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada catatan pengeluaran. Klik tombol <strong>+ Tambah Pengeluaran</strong> di atas.</td></tr>`;
    } else {
      tbody.innerHTML = appState.pengeluaran
        .filter((p) => filterBulan === "Semua" || p.tanggal.includes("08") || p.tanggal.includes("Agu"))
        .map(
          (p) => `
          <tr>
            <td>${p.tanggal}</td>
            <td><strong>${p.kategori}</strong></td>
            <td>${p.penerima || "-"}</td>
            <td style="font-weight: 600; color: var(--danger);">${formatRp(p.nominal)}</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="editPengeluaran('${p.id}')"><i class="ri-edit-line"></i></button>
              <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deletePengeluaran('${p.id}')"><i class="ri-delete-bin-line"></i></button>
            </td>
          </tr>
        `
        )
        .join("");
    }
  }
}

function openAddPengeluaranModal() {
  document.getElementById("form-pgl-id").value = "";
  document.getElementById("form-pgl-tanggal").value = new Date().toISOString().split("T")[0];
  document.getElementById("form-pgl-kategori").value = "";
  document.getElementById("form-pgl-penerima").value = "";
  document.getElementById("form-pgl-nominal").value = "";
  document.getElementById("modal-pgl-title").textContent = "Tambah Pengeluaran Baru";
  openModal("modal-pengeluaran");
}

function editPengeluaran(id) {
  const p = appState.pengeluaran.find((item) => item.id === id);
  if (!p) return;

  document.getElementById("form-pgl-id").value = p.id;
  document.getElementById("form-pgl-kategori").value = p.kategori;
  document.getElementById("form-pgl-penerima").value = p.penerima || "";
  document.getElementById("form-pgl-nominal").value = p.nominal;
  document.getElementById("modal-pgl-title").textContent = "Edit Data Pengeluaran";
  openModal("modal-pengeluaran");
}

function savePengeluaran() {
  const id = document.getElementById("form-pgl-id").value;
  const tglInput = document.getElementById("form-pgl-tanggal").value;
  const kat = document.getElementById("form-pgl-kategori").value.trim();
  const pen = document.getElementById("form-pgl-penerima").value.trim();
  const nom = parseFloat(document.getElementById("form-pgl-nominal").value) || 0;

  if (!kat || nom <= 0) {
    alert("Kategori dan nominal wajib diisi.");
    return;
  }

  const tglFormatted = tglInput ? tglInput.split("-").reverse().join("/") : new Date().toLocaleDateString("id-ID");

  if (id) {
    const idx = appState.pengeluaran.findIndex((p) => p.id === id);
    if (idx !== -1) {
      appState.pengeluaran[idx] = { ...appState.pengeluaran[idx], tanggal: tglFormatted, kategori: kat, penerima: pen, nominal: nom };
    }
  } else {
    if (!appState.pengeluaran) appState.pengeluaran = [];
    appState.pengeluaran.unshift({
      id: `PGL-${Date.now()}`,
      tanggal: tglFormatted,
      kategori: kat,
      penerima: pen,
      keterangan: kat,
      nominal: nom
    });

    if (!appState.ringkasanKas) appState.ringkasanKas = { kasSaatIni: 0, masuk: 0, keluar: 0, selisih: 0 };
    appState.ringkasanKas.kasSaatIni -= nom;
    appState.ringkasanKas.keluar += nom;
    appState.ringkasanKas.selisih = appState.ringkasanKas.masuk - appState.ringkasanKas.keluar;
  }

  saveState();
  closeModal("modal-pengeluaran");
  renderPengeluaranTable();
  renderDashboard();
  renderKasArusKasTable();
}

function deletePengeluaran(id) {
  if (confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) {
    appState.pengeluaran = appState.pengeluaran.filter((p) => p.id !== id);
    saveState();
    renderPengeluaranTable();
    renderDashboard();
    renderKasArusKasTable();
  }
}

function renderKasArusKasTable() {
  if (!appState) return;

  const tbody = document.getElementById("kas-arus-tbody");
  if (!tbody) return;

  let currentBalance = 0;
  const ledgerRows = [];

  const totalMasukTagihan = appState.tagihan
    ? appState.tagihan.filter((t) => t.status === "Lunas").reduce((sum, t) => sum + t.nominal, 0)
    : 0;

  if (totalMasukTagihan > 0) {
    currentBalance += totalMasukTagihan;
    ledgerRows.push({
      tanggal: new Date().toLocaleDateString("id-ID"),
      referensi: "Tagihan IPL (Total Pembayaran Lunas)",
      masuk: totalMasukTagihan,
      keluar: null,
      saldo: currentBalance
    });
  }

  if (appState.pengeluaran) {
    appState.pengeluaran.forEach((p) => {
      currentBalance -= p.nominal;
      ledgerRows.push({
        tanggal: p.tanggal,
        referensi: p.kategori + (p.penerima ? ` (${p.penerima})` : ""),
        masuk: null,
        keluar: p.nominal,
        saldo: currentBalance
      });
    });
  }

  if (ledgerRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada mutasi arus kas.</td></tr>`;
  } else {
    tbody.innerHTML = ledgerRows
      .map(
        (row) => `
        <tr>
          <td>${row.tanggal}</td>
          <td><strong>${row.referensi}</strong></td>
          <td style="text-align: right; color: var(--success); font-weight: 600;">${row.masuk ? formatRp(row.masuk).replace("Rp ", "") : "-"}</td>
          <td style="text-align: right; color: var(--danger); font-weight: 600;">${row.keluar ? formatRp(row.keluar).replace("Rp ", "") : "-"}</td>
          <td style="text-align: right; font-weight: 700;">${formatRp(row.saldo).replace("Rp ", "")}</td>
        </tr>
      `
      )
      .join("");
  }
}

function renderLaporanPreview() {
  const jenis = document.getElementById("laporan-jenis").value;
  const bulan = document.getElementById("laporan-bulan").value;
  const tahun = document.getElementById("laporan-tahun").value;

  const previewCard = document.getElementById("card-laporan-preview");
  const wrapper = document.getElementById("laporan-preview-table-wrapper");
  const title = document.getElementById("preview-laporan-title");

  if (!previewCard || !wrapper) return;

  previewCard.style.display = "block";
  title.textContent = `Preview Laporan ${jenis.toUpperCase()} - ${bulan} ${tahun}`;

  if (jenis === "tagihan") {
    wrapper.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>No</th>
            <th>Rumah</th>
            <th>Pemilik</th>
            <th>Kelompok IPL</th>
            <th>Nominal</th>
            <th>Status</th>
            <th>Tgl Bayar</th>
          </tr>
        </thead>
        <tbody>
          ${
            appState.tagihan && appState.tagihan.length > 0
              ? appState.tagihan
                  .map(
                    (t, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${t.blokNo}</td>
                <td>${t.pemilik}</td>
                <td>${t.kelompokIPL}</td>
                <td>${formatRp(t.nominal)}</td>
                <td>${t.status}</td>
                <td>${t.tglBayar}</td>
              </tr>
            `
                  )
                  .join("")
              : `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Tidak ada data tagihan.</td></tr>`
          }
        </tbody>
      </table>
    `;
  } else if (jenis === "pengeluaran") {
    wrapper.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Kategori</th>
            <th>Penerima</th>
            <th>Nominal</th>
          </tr>
        </thead>
        <tbody>
          ${
            appState.pengeluaran && appState.pengeluaran.length > 0
              ? appState.pengeluaran
                  .map(
                    (p) => `
              <tr>
                <td>${p.tanggal}</td>
                <td>${p.kategori}</td>
                <td>${p.penerima || "-"}</td>
                <td>${formatRp(p.nominal)}</td>
              </tr>
            `
                  )
                  .join("")
              : `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Tidak ada data pengeluaran.</td></tr>`
          }
        </tbody>
      </table>
    `;
  } else {
    wrapper.innerHTML = `<p style="padding: 1rem; color: var(--text-muted);">Laporan ${jenis} siap di-export ke CSV.</p>`;
  }
}

function exportLaporanCSV() {
  const jenis = document.getElementById("laporan-jenis").value;
  let csvContent = "data:text/csv;charset=utf-8,";

  if (jenis === "tagihan") {
    csvContent += "No,Rumah,Pemilik,Kelompok IPL,Nominal,Status,Tgl Bayar\n";
    if (appState.tagihan) {
      appState.tagihan.forEach((t, i) => {
        csvContent += `${i + 1},${t.blokNo},${t.pemilik},${t.kelompokIPL},${t.nominal},${t.status},${t.tglBayar}\n`;
      });
    }
  } else {
    csvContent += "Tanggal,Kategori,Penerima,Nominal\n";
    if (appState.pengeluaran) {
      appState.pengeluaran.forEach((p) => {
        csvContent += `${p.tanggal},${p.kategori},${p.penerima || "-"},${p.nominal}\n`;
      });
    }
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Laporan_${jenis}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/* ==========================================================================
   12. DYNAMIC SIMULASI IPL (LOADS DIRECTLY FROM MASTER KOMPONEN)
   ========================================================================== */
function renderSimulasiInputs() {
  const container = document.getElementById("simulasi-dynamic-inputs-container");
  if (!container || !appState || !appState.komponenIPL) return;

  const activeKomponen = appState.komponenIPL.filter((k) => k.aktif);

  let html = "";
  activeKomponen.forEach((k) => {
    if (k.isAutoKas) {
      // Skip auto kas from manual total input
      return;
    }

    if (k.dibayarOleh === "Developer") {
      html += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
          <label style="margin-bottom: 0;">${k.nama} (Total)</label>
          <div style="width: 160px; text-align: right; background: #f1f5f9; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-weight: 600; font-size: 0.9rem;" id="sim-val-developer-total">AUTO</div>
        </div>
      `;
    } else {
      html += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
          <label style="margin-bottom: 0;">${k.nama} (Total)</label>
          <input type="number" class="form-control sim-input-komponen" data-id="${k.id}" data-dibayar="${k.dibayarOleh}" style="width: 160px; text-align: right;" value="${k.nominalTotal}" oninput="runSimulasiIPL()">
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

function syncSimulasiFromMaster() {
  renderSimulasiInputs();
  runSimulasiIPL();
  alert("Input simulasi berhasil disinkronkan dengan data terkini Master Komponen!");
}

function runSimulasiIPL() {
  if (!appState || !appState.komponenIPL) return;

  const hasHouses = appState && appState.rumah && appState.rumah.length > 0;
  const totalRumah = hasHouses ? appState.rumah.length : 31;
  const rumahSampahCount = hasHouses ? (appState.rumah.filter((r) => r.kelompokIPL === "IPL + Sampah").length || totalRumah) : 31;
  const rumahDevCount = hasHouses ? (appState.rumah.filter((r) => r.kelompokIPL === "IPL Developer").length || 2) : 2;

  let totalGeneralCostsPerHome = 0;
  let totalSampahPerHome = 0;

  const inputs = document.querySelectorAll(".sim-input-komponen");
  inputs.forEach((inp) => {
    const val = parseFloat(inp.value) || 0;
    const dibayar = inp.getAttribute("data-dibayar");

    if (dibayar === "IPL + Sampah") {
      totalSampahPerHome += val / rumahSampahCount;
    } else {
      totalGeneralCostsPerHome += val / totalRumah;
    }
  });

  const target1 = appState && appState.targetIPL ? (appState.targetIPL.find((t) => t.kelompok === "IPL + Sampah")?.target || 175000) : 175000;
  const target2 = appState && appState.targetIPL ? (appState.targetIPL.find((t) => t.kelompok === "IPL Tanpa Sampah")?.target || 150000) : 150000;
  const target3 = appState && appState.targetIPL ? (appState.targetIPL.find((t) => t.kelompok === "IPL Developer")?.target || 166000) : 166000;

  // Kas Per Rumah is UNIFORM across IPL + Sampah and IPL Tanpa Sampah!
  const kasPerHome = Math.round(target1 - (totalGeneralCostsPerHome + totalSampahPerHome));

  // Tambahan Developer (Per Rumah) = Target Developer (166.000) - GeneralCosts - KasPerHome
  const tambahanDevPerHome = Math.max(0, Math.round(target3 - (totalGeneralCostsPerHome + kasPerHome)));
  const tambahanDevTotal = tambahanDevPerHome * rumahDevCount;

  const devInputDisplay = document.getElementById("sim-val-developer-total");
  if (devInputDisplay) {
    devInputDisplay.textContent = `AUTO (${formatRp(tambahanDevTotal).replace("Rp ", "")})`;
  }

  const tbody = document.getElementById("simulasi-result-tbody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td><strong>IPL + Sampah</strong></td>
        <td style="text-align: right;"><span style="font-weight: 700; margin-right: 1.5rem;">${formatRp(target1)}</span> <span style="color: var(--text-main); font-weight: 600;">${kasPerHome.toLocaleString("id-ID")}</span></td>
      </tr>
      <tr>
        <td><strong>IPL Tanpa Sampah</strong></td>
        <td style="text-align: right;"><span style="font-weight: 700; margin-right: 1.5rem;">${formatRp(target2)}</span> <span style="color: var(--text-main); font-weight: 600;">${kasPerHome.toLocaleString("id-ID")}</span></td>
      </tr>
      <tr>
        <td><strong>IPL Developer</strong></td>
        <td style="text-align: right;"><span style="font-weight: 700; margin-right: 1.5rem;">${formatRp(target3)}</span> <span style="color: var(--text-main); font-weight: 600;">${kasPerHome.toLocaleString("id-ID")}</span></td>
      </tr>
    `;
  }
}

/* ==========================================================================
   GOOGLE SPREADSHEET API SYNC
   ========================================================================== */
async function saveAndSyncGoogleSheet() {
  const url = document.getElementById("setting-gsheet-url").value.trim();
  if (!url) {
    alert("Masukkan URL Google Apps Script Web App terlebih dahulu.");
    return;
  }

  if (!appState.settings) appState.settings = {};
  appState.settings.googleSheetApiUrl = url;
  saveState();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(appState)
    });
    const result = await response.json();
    if (result.status === "success") {
      alert("Berhasil terhubung dan tersinkronisasi dengan Google Spreadsheet!");
    } else {
      alert("Respons dari Google Sheet: " + JSON.stringify(result));
    }
  } catch (err) {
    alert("Terhubung via CORS / Redirect API URL. Data lokal tersimpan.");
    console.log("Sync error or CORS mode:", err);
  }
}

function exportDataJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `damour_ipl_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importDataJSON(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.rumah && parsed.komponenIPL) {
        appState = parsed;
        saveState();
        alert("Data berhasil diimport!");
        location.reload();
      } else {
        alert("Format JSON tidak sesuai.");
      }
    } catch (err) {
      alert("Gagal membaca file JSON: " + err.message);
    }
  };
  reader.readAsText(file);
}

function resetDataDefault() {
  clearAllAppData();
}

// Modal Helpers
function openModal(id) {
  document.getElementById(id)?.classList.add("active");
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}
