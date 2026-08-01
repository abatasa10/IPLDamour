/**
 * D'AMOUR Sistem IPL Perumahan - Core Application Logic
 */

let appState = null;
let currentHousePage = 1;
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
  renderDashboard();
  renderMasterRumah();
  renderMasterKomponen();
  renderSettingTarget();
  renderPerhitunganIPL();
  renderTagihanTable();
  renderPengeluaranTable();
});

// Load App Data from LocalStorage or data.json
async function loadAppData() {
  const saved = localStorage.getItem("damour_ipl_db");
  if (saved) {
    try {
      appState = JSON.parse(saved);
      console.log("Data loaded from LocalStorage.");
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

  // Update Breadcrumb
  const breadcrumb = document.getElementById("page-title-breadcrumb");
  if (breadcrumb) {
    const titles = {
      dashboard: "Dashboard",
      rumah: "Master Rumah",
      komponen: "Master Komponen IPL",
      target: "Setting Target IPL",
      perhitungan: "Perhitungan IPL (Rincian)",
      tagihan: "Data Tagihan",
      pembayaran: "Catat Pembayaran",
      pengeluaran: "Data Pengeluaran",
      kas: "Arus Kas Saat Ini",
      laporan: "Laporan IPL",
      pengaturan: "Pengaturan Sistem"
    };
    breadcrumb.textContent = titles[viewId] || "Dashboard";
  }

  // Refresh dynamic views
  if (viewId === "dashboard") renderDashboard();
  if (viewId === "rumah") renderMasterRumah();
  if (viewId === "komponen") renderMasterKomponen();
  if (viewId === "target") renderSettingTarget();
  if (viewId === "perhitungan") renderPerhitunganIPL();
  if (viewId === "tagihan" || viewId === "pembayaran") renderTagihanTable();
  if (viewId === "pengeluaran" || viewId === "kas") renderPengeluaranTable();
}

// Event Listeners
function setupEventListeners() {
  // Sidebar Nav clicks
  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const view = btn.getAttribute("data-view");
      showView(view);
      // Close sidebar mobile
      document.querySelector(".sidebar").classList.remove("open");
    });
  });

  // Toggle Sidebar Mobile
  const toggleBtn = document.getElementById("toggle-sidebar");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.querySelector(".sidebar").classList.toggle("open");
    });
  }

  // Search Rumah
  const searchInput = document.getElementById("search-rumah-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentHousePage = 1;
      renderMasterRumah();
    });
  }

  // Perhitungan Month Selector
  const monthSelect = document.getElementById("perhitungan-month-select");
  if (monthSelect) {
    monthSelect.addEventListener("change", () => {
      renderPerhitunganIPL();
    });
  }
}

/* ==========================================================================
   1. DASHBOARD RENDERER
   ========================================================================== */
function renderDashboard() {
  if (!appState) return;

  const totalRumah = appState.rumah.length;
  const lunasCount = appState.tagihan.filter((t) => t.status === "Lunas").length;
  const menungguCount = appState.tagihan.filter((t) => t.status === "Menunggu").length;
  const menunggakCount = appState.tagihan.filter((t) => t.status === "Menunggak").length;

  document.getElementById("kpi-total-rumah").textContent = `${totalRumah} Unit`;
  document.getElementById("kpi-menunggak").textContent = `${menungguCount + menunggakCount} Unit`;
  document.getElementById("kpi-lunas").textContent = `${lunasCount} Unit`;
  document.getElementById("kpi-kas").textContent = formatRp(appState.ringkasanKas.kasSaatIni);

  // Ringkasan Bulan Ini
  const totalTagihan = appState.tagihan.reduce((acc, t) => acc + t.nominal, 0);
  const totalPembayaran = appState.tagihan
    .filter((t) => t.status === "Lunas")
    .reduce((acc, t) => acc + t.nominal, 0);
  const sisaTagihan = totalTagihan - totalPembayaran;

  document.getElementById("dash-total-tagihan").textContent = formatRp(totalTagihan);
  document.getElementById("dash-total-pembayaran").textContent = formatRp(totalPembayaran);
  document.getElementById("dash-sisa-tagihan").textContent = formatRp(sisaTagihan);

  // Kas Masuk vs Keluar
  document.getElementById("dash-kas-masuk").textContent = formatRp(appState.ringkasanKas.masuk);
  document.getElementById("dash-kas-keluar").textContent = formatRp(appState.ringkasanKas.keluar);
  const selisih = appState.ringkasanKas.selisih;
  const selisihEl = document.getElementById("dash-kas-selisih");
  selisihEl.textContent = formatRp(selisih);
  selisihEl.style.color = selisih < 0 ? "var(--danger)" : "var(--success)";

  // Render Recent Tagihan Table
  const recentTagihanTbody = document.getElementById("recent-tagihan-tbody");
  if (recentTagihanTbody) {
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

  // Render Recent Pengeluaran Table
  const recentPengeluaranTbody = document.getElementById("recent-pengeluaran-tbody");
  if (recentPengeluaranTbody) {
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

  // Render Donut & Bar Charts
  renderCharts(lunasCount, menungguCount, menunggakCount, totalRumah);
}

function renderCharts(lunas, menunggu, menunggak, total) {
  if (typeof Chart === "undefined") return;

  // Donut Chart Status Tagihan
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
        plugins: {
          legend: { position: "right" }
        },
        cutout: "70%"
      }
    });
  }

  // Bar Chart 6 Bulan Terakhir
  const ctxBar = document.getElementById("chart-pembayaran-history");
  if (ctxBar && appState.grafik6Bulan) {
    if (barChartInstance) barChartInstance.destroy();
    const labels = appState.grafik6Bulan.map((g) => g.bulan);
    const dataTagihan = appState.grafik6Bulan.map((g) => g.tagihan / 1000000);
    const dataPembayaran = appState.grafik6Bulan.map((g) => g.pembayaran / 1000000);

    barChartInstance = new Chart(ctxBar, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Tagihan (jt)",
            data: dataTagihan,
            backgroundColor: "#cbd5e1",
            borderRadius: 4
          },
          {
            label: "Pembayaran (jt)",
            data: dataPembayaran,
            backgroundColor: "#2563eb",
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `${val} jt`
            }
          }
        }
      }
    });
  }
}

/* ==========================================================================
   2. MASTER RUMAH RENDERER & CRUD
   ========================================================================== */
function renderMasterRumah() {
  if (!appState) return;

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

  // Render Pagination
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
    // Edit existing
    const idx = appState.rumah.findIndex((r) => r.id === id);
    if (idx !== -1) {
      appState.rumah[idx] = { ...appState.rumah[idx], blokNo: blok, pemilik, noHp: hp, kelompokIPL: kelompok };
    }
  } else {
    // Add new
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
  renderMasterRumah();
  renderDashboard();
}

function deleteRumah(id) {
  if (confirm("Apakah Anda yakin ingin menghapus data rumah ini?")) {
    appState.rumah = appState.rumah.filter((r) => r.id !== id);
    saveState();
    renderMasterRumah();
    renderDashboard();
  }
}

/* ==========================================================================
   3. MASTER KOMPONEN IPL RENDERER & CRUD
   ========================================================================== */
function renderMasterKomponen() {
  if (!appState) return;

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
}

function deleteKomponen(id) {
  if (confirm("Apakah Anda yakin ingin menghapus komponen IPL ini?")) {
    appState.komponenIPL = appState.komponenIPL.filter((k) => k.id !== id);
    saveState();
    renderMasterKomponen();
    renderPerhitunganIPL();
  }
}

/* ==========================================================================
   4. SETTING TARGET IPL RENDERER & CRUD
   ========================================================================== */
function renderSettingTarget() {
  if (!appState) return;

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
}

/* ==========================================================================
   5. PERHITUNGAN IPL (RINCIAN AUTOMATED FORMULA)
   ========================================================================== */
function renderPerhitunganIPL() {
  if (!appState) return;

  const totalRumah = appState.rumah.length || 31;
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

  // Compute Auto Kas
  const kasPerHome = Math.max(0, targetNominal - fixedCostsPerHomeSum);
  const kasCell = document.getElementById("cell-kas-per-rumah");
  if (kasCell) {
    kasCell.textContent = formatRpDecimal(kasPerHome);
  }

  const grandTotalPerHome = fixedCostsPerHomeSum + kasPerHome;
  const totalCell = document.getElementById("perhitungan-grand-total");
  if (totalCell) {
    totalCell.textContent = `${formatRpDecimal(grandTotalTotalRounded(grandTotalPerHome))}`;
  }
}

function grandTotalTotalRounded(val) {
  return val;
}

/* ==========================================================================
   6. TAGIHAN & PEMBAYARAN RENDERER & WHATSAPP
   ========================================================================== */
function renderTagihanTable() {
  if (!appState) return;

  const tbody = document.getElementById("tagihan-full-tbody");
  if (!tbody) return;

  tbody.innerHTML = appState.tagihan
    .map((t) => {
      let badgeClass = "badge-secondary";
      if (t.status === "Lunas") badgeClass = "badge-success";
      if (t.status === "Menunggu") badgeClass = "badge-warning";
      if (t.status === "Menunggak") badgeClass = "badge-danger";

      const rumahObj = appState.rumah.find((r) => r.id === t.rumahId);
      const noHp = rumahObj ? rumahObj.noHp : "";

      return `
        <tr>
          <td><strong>${t.blokNo}</strong></td>
          <td>${t.pemilik}</td>
          <td>${t.kelompokIPL}</td>
          <td><strong>${formatRp(t.nominal)}</strong></td>
          <td><span class="badge ${badgeClass}">${t.status}</span></td>
          <td>${t.tglBayar}</td>
          <td>
            ${
              t.status !== "Lunas"
                ? `<button class="btn btn-primary btn-sm" onclick="openBayarModal('${t.id}')"><i class="ri-checkbox-circle-line"></i> Bayar</button>
                   <button class="btn btn-outline btn-sm" style="color: #25d366;" onclick="sendWAReminder('${t.pemilik}', '${t.blokNo}', '${t.nominal}', '${noHp}')"><i class="ri-whatsapp-line"></i> WA</button>`
                : `<span style="color: var(--success); font-weight: 500;"><i class="ri-check-double-line"></i> Terbayar</span>`
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

function sendWAReminder(nama, blok, nominal, phone) {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
  const msg = encodeURIComponent(
    `Halo ${nama} (Rumah ${blok}),\n\nInformasi Tagihan IPL Perumahan D'AMOUR bulan ini adalah sebesar ${formatRp(
      nominal
    )}.\nMohon dapat melakukan pembayaran melalui transfer bank atau kasir RT.\n\nTerima kasih.`
  );
  window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
}

function openBayarModal(tagihanId) {
  const t = appState.tagihan.find((item) => item.id === tagihanId);
  if (!t) return;

  document.getElementById("bayar-tagihan-id").value = t.id;
  document.getElementById("bayar-pemilik-info").textContent = `${t.blokNo} - ${t.pemilik} (${formatRp(t.nominal)})`;
  document.getElementById("bayar-metode").value = "Transfer Bank";
  openModal("modal-bayar");
}

function confirmPembayaran() {
  const tagihanId = document.getElementById("bayar-tagihan-id").value;
  const metode = document.getElementById("bayar-metode").value;

  const t = appState.tagihan.find((item) => item.id === tagihanId);
  if (t) {
    t.status = "Lunas";
    t.tglBayar = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    t.metode = metode;

    // Update Kas Masuk
    appState.ringkasanKas.kasSaatIni += t.nominal;
    appState.ringkasanKas.masuk += t.nominal;
    appState.ringkasanKas.selisih = appState.ringkasanKas.masuk - appState.ringkasanKas.keluar;

    saveState();
    closeModal("modal-bayar");
    renderTagihanTable();
    renderDashboard();
    alert(`Pembayaran untuk ${t.blokNo} - ${t.pemilik} berhasil dicatat.`);
  }
}

/* ==========================================================================
   7. PENGELUARAN & KAS
   ========================================================================== */
function renderPengeluaranTable() {
  if (!appState) return;

  const tbody = document.getElementById("pengeluaran-full-tbody");
  if (tbody) {
    tbody.innerHTML = appState.pengeluaran
      .map(
        (p) => `
        <tr>
          <td>${p.tanggal}</td>
          <td><strong>${p.kategori}</strong></td>
          <td>${p.keterangan || "-"}</td>
          <td style="font-weight: 600; color: var(--danger);">${formatRp(p.nominal)}</td>
        </tr>
      `
      )
      .join("");
  }
}

function openAddPengeluaranModal() {
  document.getElementById("form-pgl-kategori").value = "";
  document.getElementById("form-pgl-nominal").value = "";
  document.getElementById("form-pgl-keterangan").value = "";
  openModal("modal-pengeluaran");
}

function savePengeluaran() {
  const kat = document.getElementById("form-pgl-kategori").value.trim();
  const nom = parseFloat(document.getElementById("form-pgl-nominal").value) || 0;
  const ket = document.getElementById("form-pgl-keterangan").value.trim();

  if (!kat || nom <= 0) {
    alert("Kategori dan nominal wajib diisi.");
    return;
  }

  const tglStr = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  appState.pengeluaran.unshift({
    id: `PGL-${Date.now()}`,
    tanggal: tglStr,
    kategori: kat,
    keterangan: ket,
    nominal: nom
  });

  // Update Kas Out
  appState.ringkasanKas.kasSaatIni -= nom;
  appState.ringkasanKas.keluar += nom;
  appState.ringkasanKas.selisih = appState.ringkasanKas.masuk - appState.ringkasanKas.keluar;

  saveState();
  closeModal("modal-pengeluaran");
  renderPengeluaranTable();
  renderDashboard();
}

/* ==========================================================================
   8. EXPORT / IMPORT & SETTINGS
   ========================================================================== */
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
  if (confirm("Apakah Anda yakin ingin mengembalikan seluruh data ke data default awal?")) {
    localStorage.removeItem("damour_ipl_db");
    location.reload();
  }
}

// Modal Helpers
function openModal(id) {
  document.getElementById(id)?.classList.add("active");
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}
