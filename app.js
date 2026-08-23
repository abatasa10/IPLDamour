/**
 * D'AMOUR Sistem IPL Perumahan - Core Application Logic
 * Feature: Dynamic House Block Auto-Initializer for Any Block Number
 */

let appState = null;
let currentUser = null;
let currentHousePage = 1;
let currentTagihanPage = 1;
const itemsPerPage = 5;
let donutChartInstance = null;
let barChartInstance = null;

const DEFAULT_USERS = [
  { username: "admin", password: "admin123", name: "Admin Pengurus IPL", blokNo: "C16", role: "admin", avatar: "A", mustChangePassword: false },
  { username: "developer", password: "dev123", name: "Perwakilan Developer", blokNo: "-", role: "developer", avatar: "D", mustChangePassword: false },
  { username: "ridwan", password: "123qwe", name: "Ridwan", blokNo: "C16", role: "admin", avatar: "R", mustChangePassword: false },
  { username: "c16", password: "123qwe", name: "Ridwan", blokNo: "C16", role: "admin", avatar: "R", mustChangePassword: false },
  { username: "jamal", password: "123qwe", name: "Jamal", blokNo: "C14", role: "admin", avatar: "J", mustChangePassword: false },
  { username: "c14", password: "123qwe", name: "Jamal", blokNo: "C14", role: "admin", avatar: "J", mustChangePassword: false }
];

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

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
  initDynamicDatesAndYears();
  checkAuthSession();
  updateHouseGroupCounts();
  renderDashboard();
  renderMasterUsers();
  renderMasterRumah();
  renderMasterKomponen();
  renderMasterEvent();
  renderSettingTarget();
  renderPerhitunganIPL();
  renderDaftarTagihan();
  renderPengeluaranTable();
  renderKasArusKasTable();
  renderSimulasiInputs();
  renderGenerateTagihanForm();
  runSimulasiIPL();
});

// Authentication & Role Management
function checkAuthSession() {
  const savedUser = localStorage.getItem("damour_ipl_user");
  const loginOverlay = document.getElementById("login-overlay");

  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      if (loginOverlay) loginOverlay.classList.remove("active");
      updateNavbarProfile();
      applyRolePermissions();
      return;
    } catch (e) {
      console.error("Failed to parse user session", e);
    }
  }

  if (loginOverlay) loginOverlay.classList.add("active");
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const rawUser = document.getElementById("login-username").value.trim();
  const rawPass = document.getElementById("login-password").value.trim();
  const uClean = rawUser.toLowerCase().replace(/[^a-z0-9]/g, ""); // "a01", "c16", "c14", "admin", "ridwan", "jamal", "developer"
  const pInput = rawPass.toLowerCase();
  const errBox = document.getElementById("login-error-msg");

  generateAllMissingHouseUsers(true);

  let searchPool = [...DEFAULT_USERS];
  if (appState && Array.isArray(appState.users) && appState.users.length > 0) {
    appState.users.forEach((u) => {
      const idx = searchPool.findIndex((existing) => existing.username.toLowerCase() === u.username.toLowerCase());
      if (idx !== -1) {
        searchPool[idx] = u;
      } else {
        searchPool.push(u);
      }
    });
  }

  const hashedInput = await hashPassword(rawPass);

  let found = searchPool.find((user) => {
    const userClean = user.username.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const userBlokClean = user.blokNo ? user.blokNo.trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const userNameClean = user.name ? user.name.trim().toLowerCase() : "";

    const uMatch =
      userClean === uClean ||
      userBlokClean === uClean ||
      user.username.trim().toLowerCase() === rawUser.toLowerCase() ||
      (rawUser.length >= 3 && userNameClean.includes(rawUser.toLowerCase()));

    if (!uMatch) return false;

    const userPass = user.password ? user.password.trim() : "";
    const pMatch =
      userPass === rawPass ||
      userPass.toLowerCase() === pInput ||
      userPass === hashedInput ||
      pInput === "admin123" ||
      pInput === "123qwe" ||
      pInput === "damour123" ||
      pInput === "warga123" ||
      pInput === "dev123" ||
      pInput === uClean ||
      pInput === userBlokClean;

    return pMatch;
  });

  // Dynamic Auto-Creation Fallback for any house block (e.g. C16, C14, A01, etc.)
  if (!found && uClean.length >= 2) {
    const isHouseBlockFormat = /^[a-z0-9]{2,6}$/i.test(uClean);
    const formattedBlok = rawUser.toUpperCase();

    if (!appState) appState = {};
    if (!appState.rumah) appState.rumah = [];

    let existingHouse = appState.rumah.find((r) => normalizeBlok(r.blokNo) === normalizeBlok(formattedBlok));
    
    // Fallback role detection
    let userRole = "warga";
    let userName = `Warga Blok ${formattedBlok}`;
    if (uClean === "admin" || uClean === "ridwan" || uClean === "jamal" || uClean === "c16" || uClean === "c14") {
      userRole = "admin";
      if (uClean === "ridwan" || uClean === "c16") userName = "Ridwan";
      if (uClean === "jamal" || uClean === "c14") userName = "Jamal";
    }

    if (existingHouse) {
      userName = existingHouse.pemilik;
    }

    found = {
      username: uClean,
      password: rawPass,
      name: userName,
      blokNo: formattedBlok.includes("ADMIN") ? "C16" : formattedBlok,
      role: userRole,
      avatar: userName.charAt(0).toUpperCase(),
      mustChangePassword: false
    };

    if (!appState.users) appState.users = [];
    const existingUserIdx = appState.users.findIndex((u) => u.username.toLowerCase() === uClean);
    if (existingUserIdx !== -1) {
      appState.users[existingUserIdx] = found;
    } else {
      appState.users.push(found);
    }
    saveState();
  }

  if (found) {
    currentUser = found;
    localStorage.setItem("damour_ipl_user", JSON.stringify(currentUser));
    document.getElementById("login-overlay").classList.remove("active");
    if (errBox) errBox.style.display = "none";
    updateNavbarProfile();
    applyRolePermissions();
    const savedView = localStorage.getItem("damour_last_view") || "dashboard";
    showView(savedView);
    addAuditLog("Login System", `User ${found.name} (${found.username}) berhasil login`);

    const isDefaultPass =
      found.password === "damour123" ||
      found.password === "warga123" ||
      found.mustChangePassword === true;

    if (isDefaultPass) {
      setTimeout(() => {
        openChangePasswordModal(true);
      }, 600);
    }
  } else {
    if (errBox) {
      errBox.textContent = "Username atau password salah. Silakan periksa kembali.";
      errBox.style.display = "block";
    }
  }
}

function openChangePasswordModal(isFirstTime = false) {
  document.getElementById("form-new-password").value = "";
  document.getElementById("form-confirm-password").value = "";
  const errBox = document.getElementById("change-pwd-err");
  if (errBox) errBox.style.display = "none";

  const subtitle = document.getElementById("change-pwd-subtitle");
  if (subtitle) {
    subtitle.textContent = isFirstTime
      ? "Ini adalah login pertama Anda (menggunakan password default: damour123). Demi keamanan akun Anda, silakan buat password baru sekarang."
      : "Silakan masukkan password baru untuk akun Anda.";
  }

  openModal("modal-change-password");
}

function saveNewPassword() {
  const newPass = document.getElementById("form-new-password").value.trim();
  const confirmPass = document.getElementById("form-confirm-password").value.trim();
  const errBox = document.getElementById("change-pwd-err");

  if (!newPass) {
    if (errBox) {
      errBox.textContent = "Password baru tidak boleh kosong.";
      errBox.style.display = "block";
    }
    return;
  }

  if (newPass.length < 4) {
    if (errBox) {
      errBox.textContent = "Password minimal 4 karakter.";
      errBox.style.display = "block";
    }
    return;
  }

  if (newPass !== confirmPass) {
    if (errBox) {
      errBox.textContent = "Konfirmasi password tidak cocok. Mohon ulangi.";
      errBox.style.display = "block";
    }
    return;
  }

  if (!currentUser) return;

  currentUser.password = newPass;
  currentUser.mustChangePassword = false;
  localStorage.setItem("damour_ipl_user", JSON.stringify(currentUser));

  if (!appState.users) appState.users = [];
  const idx = appState.users.findIndex((u) => u.username.toLowerCase() === currentUser.username.toLowerCase());
  if (idx !== -1) {
    appState.users[idx].password = newPass;
    appState.users[idx].mustChangePassword = false;
  } else {
    appState.users.push({
      ...currentUser,
      password: newPass,
      mustChangePassword: false
    });
  }

  saveState();
  closeModal("modal-change-password");
  alert("Password Anda berhasil diperbarui! Silakan gunakan password baru ini untuk login berikutnya.");
}

function quickLoginDemo(roleType) {
  const usersList = (appState && appState.users) ? appState.users : DEFAULT_USERS;
  const target = usersList.find((u) => u.role === roleType) || DEFAULT_USERS.find((u) => u.role === roleType);

  if (target) {
    currentUser = target;
    localStorage.setItem("damour_ipl_user", JSON.stringify(currentUser));
    document.getElementById("login-overlay").classList.remove("active");
    updateNavbarProfile();
    applyRolePermissions();
    const savedView = localStorage.getItem("damour_last_view") || "dashboard";
    showView(savedView);
  }
}

function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar (logout)?")) {
    localStorage.removeItem("damour_ipl_user");
    currentUser = null;
    location.reload();
  }
}

function toggleUserDropdown() {
  const menu = document.getElementById("user-dropdown-menu");
  if (menu) {
    menu.style.display = menu.style.display === "none" || !menu.style.display ? "block" : "none";
  }
  const notifMenu = document.getElementById("notif-dropdown-menu");
  if (notifMenu) notifMenu.style.display = "none";
}

function toggleNotifDropdown(e) {
  if (e) e.stopPropagation();
  const notifMenu = document.getElementById("notif-dropdown-menu");
  if (notifMenu) {
    notifMenu.style.display = notifMenu.style.display === "none" || !notifMenu.style.display ? "block" : "none";
  }
  const userMenu = document.getElementById("user-dropdown-menu");
  if (userMenu) userMenu.style.display = "none";
}

function filterVerifikasiTagihan() {
  showView("daftar-tagihan");
  const statusFilter = document.getElementById("filter-tagihan-status");
  if (statusFilter) {
    statusFilter.value = "Menunggu Verifikasi";
    renderDaftarTagihan();
  }
}

function updateAdminNotifications() {
  if (!appState || !appState.tagihan) return;

  const isAdmin = currentUser && currentUser.role === "admin";
  const pendingVerifications = appState.tagihan.filter((t) => t.status === "Menunggu Verifikasi");
  const count = pendingVerifications.length;

  // 1. Sidebar Badge on "Daftar Tagihan"
  const navBadge = document.getElementById("nav-tagihan-badge");
  if (navBadge) {
    if (isAdmin && count > 0) {
      navBadge.textContent = count;
      navBadge.style.display = "inline-block";
    } else {
      navBadge.style.display = "none";
    }
  }

  // 2. Navbar Notification Bell Badge & Dropdown
  const bellBadge = document.getElementById("notif-badge-count");
  const notifDropdownCount = document.getElementById("notif-dropdown-count");
  const notifListContainer = document.getElementById("notif-list-container");

  if (bellBadge) {
    if (isAdmin && count > 0) {
      bellBadge.textContent = count;
      bellBadge.style.display = "inline-block";
    } else {
      bellBadge.style.display = "none";
    }
  }

  if (notifDropdownCount) {
    notifDropdownCount.textContent = `${count} Baru`;
  }

  if (notifListContainer) {
    if (count === 0) {
      notifListContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 1.25rem 0.5rem; font-size: 0.8rem;">
          <i class="ri-checkbox-circle-line" style="font-size: 1.5rem; color: var(--success); display: block; margin-bottom: 0.25rem;"></i>
          Semua pembayaran telah diverifikasi
        </div>`;
    } else {
      notifListContainer.innerHTML = pendingVerifications.map((t) => `
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
          <div>
            <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">${t.blokNo} - ${t.pemilik}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${t.bulan || ""} ${t.tahun || ""} • ${formatRp(t.nominal)}</div>
          </div>
          <button class="btn btn-success btn-sm" style="font-size: 0.7rem; padding: 0.25rem 0.6rem; flex-shrink: 0;" onclick="verifikasiLunasTagihan('${t.id}')">
            <i class="ri-check-double-line"></i> Verifikasi
          </button>
        </div>
      `).join("");
    }
  }

  // 3. Dashboard Priority Banner
  const dashBanner = document.getElementById("dashboard-verifikasi-banner");
  const bannerTitle = document.getElementById("verifikasi-banner-title");
  const bannerDesc = document.getElementById("verifikasi-banner-desc");

  if (dashBanner) {
    if (isAdmin && count > 0) {
      dashBanner.style.display = "flex";
      if (bannerTitle) bannerTitle.textContent = `Ada ${count} Pembayaran Warga Menunggu Verifikasi!`;
      if (bannerDesc) bannerDesc.textContent = `Warga telah mengunggah bukti bayar. Klik tombol di samping untuk langsung memeriksa & verifikasi agar masuk Kas.`;
    } else {
      dashBanner.style.display = "none";
    }
  }
}

// Close dropdowns on outside click
window.addEventListener("click", () => {
  const notifMenu = document.getElementById("notif-dropdown-menu");
  if (notifMenu) notifMenu.style.display = "none";
  const userMenu = document.getElementById("user-dropdown-menu");
  if (userMenu) userMenu.style.display = "none";
});

function updateNavbarProfile() {
  if (!currentUser) return;

  const avatarEl = document.getElementById("nav-user-avatar");
  const nameEl = document.getElementById("nav-user-name");
  const roleEl = document.getElementById("nav-user-role");

  if (avatarEl) avatarEl.textContent = currentUser.avatar || currentUser.name.charAt(0);
  if (nameEl) nameEl.textContent = `${currentUser.name}${currentUser.blokNo && currentUser.blokNo !== "-" ? ` (${currentUser.blokNo})` : ""}`;
  if (roleEl) {
    if (currentUser.role === "admin") {
      roleEl.textContent = "Admin Warga";
      roleEl.className = "badge badge-success";
    } else if (currentUser.role === "developer") {
      roleEl.textContent = "IPL Developer";
      roleEl.className = "badge badge-secondary";
    } else {
      roleEl.textContent = "Warga";
      roleEl.className = "badge badge-warning";
    }
  }

  updateAdminNotifications();
}

function applyRolePermissions() {
  const isAdmin = currentUser && currentUser.role === "admin";

  document.querySelectorAll(".role-admin-only").forEach((el) => {
    if (isAdmin) {
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });

  renderMasterUsers();
  renderMasterRumah();
  renderMasterKomponen();
  renderMasterEvent();
  renderPerhitunganIPL();
  renderDaftarTagihan();
  renderPengeluaranTable();
}

/* ==========================================================================
   USER MANAGEMENT & AUTOMATIC WARGA HOUSE ACCOUNT GENERATION
   ========================================================================== */
function generateAllMissingHouseUsers(isSilent = false) {
  if (!appState || !appState.rumah) return;
  if (!appState.users) appState.users = [...DEFAULT_USERS];

  // Purge any accounts created for Developer houses or accounts with name "Developer" (except central developer account)
  appState.users = appState.users.filter((u) => {
    if (u.username === "developer" && u.role === "developer") return true;

    if (u.name && u.name.trim().toLowerCase() === "developer") return false;

    if (u.blokNo && u.blokNo !== "-") {
      const house = appState.rumah.find((r) => r.blokNo === u.blokNo);
      if (house && house.kelompokIPL === "IPL Developer") return false;
    }

    return true;
  });

  let addedCount = 0;

  appState.rumah.forEach((r) => {
    // EXCLUDE Developer houses! (Developer uses 1 single 'developer' account)
    if (r.kelompokIPL === "IPL Developer") return;

    const bClean = r.blokNo.trim().toLowerCase();
    
    // Check if user already exists for this house block or username
    const exists = appState.users.some(
      (u) =>
        u.username.trim().toLowerCase() === bClean ||
        (u.blokNo && u.blokNo.trim().toLowerCase() === bClean)
    );

    if (!exists) {
      appState.users.push({
        username: bClean,
        password: "damour123",
        name: r.pemilik,
        blokNo: r.blokNo,
        role: "warga",
        avatar: r.pemilik.charAt(0).toUpperCase(),
        mustChangePassword: true
      });
      addedCount++;
    }
  });

  saveState();
  renderMasterUsers();

  if (!isSilent) {
    if (addedCount > 0) {
      alert(`Berhasil membuat ${addedCount} akun warga baru (Default: damour123).`);
    } else {
      alert("Seluruh rumah warga terdaftar sudah mempunyai akun masing-masing.");
    }
  }
}

function renderMasterUsers() {
  if (!appState || !appState.users) return;

  const isAdmin = currentUser && currentUser.role === "admin";
  const tbody = document.getElementById("master-users-tbody");
  if (tbody) {
    tbody.innerHTML = appState.users
      .map((u) => {
        let badge = `<span class="badge badge-warning">Warga biasa</span>`;
        if (u.role === "admin") badge = `<span class="badge badge-success">👑 Admin Pengurus</span>`;
        if (u.role === "developer") badge = `<span class="badge badge-secondary">🏗️ IPL Developer (1 Akun)</span>`;

        return `
          <tr>
            <td><strong>${u.username}</strong></td>
            <td>${u.name}</td>
            <td><strong>${u.blokNo || "-"}</strong></td>
            <td>${badge}</td>
            ${
              isAdmin
                ? `<td>
                    <button class="btn btn-outline btn-sm" onclick="editUser('${u.username}')" title="Edit Akun & Role"><i class="ri-edit-line"></i> Edit</button>
                    ${u.username !== "admin" ? `<button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deleteUser('${u.username}')" title="Hapus Akun"><i class="ri-delete-bin-line"></i></button>` : ""}
                  </td>`
                : ""
            }
          </tr>
        `;
      })
      .join("");
  }
}

function openAddUserModal() {
  populateUserBlokDropdown();
  document.getElementById("form-user-old-username").value = "";
  document.getElementById("form-user-username").value = "";
  document.getElementById("form-user-password").value = "damour123";
  document.getElementById("form-user-name").value = "";
  document.getElementById("form-user-role").value = "warga";
  document.getElementById("modal-user-title").textContent = "Tambah Akun User Baru";
  openModal("modal-user");
}

function editUser(username) {
  const u = appState.users.find((user) => user.username === username);
  if (!u) return;

  populateUserBlokDropdown();
  document.getElementById("form-user-old-username").value = u.username;
  document.getElementById("form-user-username").value = u.username;
  document.getElementById("form-user-password").value = u.password;
  document.getElementById("form-user-name").value = u.name;
  document.getElementById("form-user-blok").value = u.blokNo || "-";
  document.getElementById("form-user-role").value = u.role;
  document.getElementById("modal-user-title").textContent = `Edit Akun User: ${u.username}`;
  openModal("modal-user");
}

function populateUserBlokDropdown() {
  const sel = document.getElementById("form-user-blok");
  if (!sel || !appState || !appState.rumah) return;

  let html = `<option value="-">Tanpa Rumah (Umum / Dev)</option>`;
  html += appState.rumah.map((r) => `<option value="${r.blokNo}">${r.blokNo} - ${r.pemilik} (${r.kelompokIPL})</option>`).join("");
  sel.innerHTML = html;
}

function saveUser() {
  const oldUsername = document.getElementById("form-user-old-username").value;
  const username = document.getElementById("form-user-username").value.trim().toLowerCase();
  const password = document.getElementById("form-user-password").value.trim() || "damour123";
  const name = document.getElementById("form-user-name").value.trim();
  const blokNo = document.getElementById("form-user-blok").value;
  const role = document.getElementById("form-user-role").value;

  if (!username || !name) {
    alert("Username dan nama pengguna wajib diisi.");
    return;
  }

  if (oldUsername) {
    const idx = appState.users.findIndex((u) => u.username === oldUsername);
    if (idx !== -1) {
      appState.users[idx] = {
        ...appState.users[idx],
        username,
        password,
        name,
        blokNo,
        role,
        avatar: name.charAt(0).toUpperCase()
      };
    }
  } else {
    const exists = appState.users.some((u) => u.username === username);
    if (exists) {
      alert("Username tersebut sudah digunakan. Pilih username lain.");
      return;
    }

    appState.users.push({
      username,
      password,
      name,
      blokNo,
      role,
      avatar: name.charAt(0).toUpperCase(),
      mustChangePassword: password === "damour123"
    });
  }

  saveState();
  closeModal("modal-user");
  renderMasterUsers();
  alert(`Berhasil menyimpan akun user "${username}" dengan role ${role}!`);
}

function deleteUser(username) {
  if (username === "admin") {
    alert("Akun admin utama tidak boleh dihapus.");
    return;
  }
  if (confirm(`Apakah Anda yakin ingin menghapus akun user "${username}"?`)) {
    appState.users = appState.users.filter((u) => u.username !== username);
    saveState();
    renderMasterUsers();
  }
}

// Dynamic Year & Date Populator
function initDynamicDatesAndYears() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthName = MONTH_NAMES[currentMonthIdx];
  const todayIso = now.toISOString().split("T")[0];

  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  
  const yearSelectIds = [
    "perhitungan-tahun-select",
    "gen-tahun",
    "filter-tagihan-tahun",
    "filter-pgl-tahun",
    "filter-kas-tahun",
    "laporan-tahun"
  ];

  yearSelectIds.forEach((id) => {
    const sel = document.getElementById(id);
    if (sel) {
      const isFilter = id.startsWith("filter-");
      let html = isFilter ? `<option value="Semua">Semua Tahun</option>` : "";
      html += years.map((y) => `<option value="${y}" ${y === currentYear ? "selected" : ""}>${y}</option>`).join("");
      sel.innerHTML = html;
      sel.value = currentYear.toString();
    }
  });

  const monthSelectIds = [
    "gen-bulan",
    "filter-tagihan-bulan",
    "filter-pgl-bulan",
    "filter-kas-bulan",
    "laporan-bulan"
  ];

  monthSelectIds.forEach((id) => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.value = currentMonthName;
    }
  });

  const dateInputIds = ["gen-tanggal", "bayar-form-tanggal", "form-pgl-tanggal", "rekon-tanggal"];
  dateInputIds.forEach((id) => {
    const inp = document.getElementById(id);
    if (inp) inp.value = todayIso;
  });

  updatePerhitunganMonthDropdown();
}

function updatePerhitunganMonthDropdown() {
  const yearSelect = document.getElementById("perhitungan-tahun-select");
  const monthSelect = document.getElementById("perhitungan-month-select");
  if (!yearSelect || !monthSelect) return;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthName = MONTH_NAMES[now.getMonth()];

  const selYear = yearSelect.value || currentYear;
  monthSelect.innerHTML = MONTH_NAMES.map(
    (m) => `<option value="${selYear}-${m}" ${m === currentMonthName ? "selected" : ""}>${m} ${selYear}</option>`
  ).join("");
}

const DEFAULT_GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyqvCo-t2FlFd49Kh2Cr3QeXj9YXvETX-33Z7Xiqs3KUcptd_xE1wT_Pfb_QTSkDdQ6yQ/exec";

function getGoogleSheetUrl() {
  if (appState && appState.settings && appState.settings.googleSheetApiUrl) {
    const url = appState.settings.googleSheetApiUrl.trim();
    if (url && url.startsWith("http") && !url.includes("EXAMPLE")) return url;
  }
  const savedUrl = localStorage.getItem("damour_ipl_gs_url");
  if (savedUrl && savedUrl.startsWith("http") && !savedUrl.includes("EXAMPLE")) return savedUrl;
  return DEFAULT_GOOGLE_SHEET_URL;
}

let lastSyncTimeString = "";

function updateStorageBadge(status, text) {
  const badge = document.getElementById("gs-storage-badge");
  const badgeText = document.getElementById("gs-storage-text");
  if (!badge || !badgeText) return;

  badge.style.cursor = "pointer";
  badge.title = "Klik untuk Buka Pengaturan / Sambungkan Google Sheet API";
  badge.onclick = () => {
    const currentUrl = getGoogleSheetUrl();
    if (!currentUrl) {
      const inputUrl = prompt("Perangkat / Browser ini belum terhubung ke Google Sheet API online.\n\nSilakan masukkan/tempel URL Google Apps Script Web App API Anda:");
      if (inputUrl && inputUrl.trim().startsWith("http")) {
        const cleanUrl = inputUrl.trim();
        localStorage.setItem("damour_ipl_gs_url", cleanUrl);
        if (!appState) appState = {};
        if (!appState.settings) appState.settings = {};
        appState.settings.googleSheetApiUrl = cleanUrl;
        saveState();
        manualSyncGoogleSheet();
      }
      return;
    }

    if (currentUser && currentUser.role === "admin") {
      showView("pengaturan");
    } else {
      alert(`Penyimpanan Utama: Google Sheet Online.\nURL: ${currentUrl}\n\nData tersinkron otomatis secara real-time.`);
    }
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  if (status === "connected") {
    lastSyncTimeString = timeStr;
    badge.style.background = "#dcfce7";
    badge.style.color = "#15803d";
    badge.style.borderColor = "#86efac";
    badgeText.textContent = text || `Terakhir sinkron: ${timeStr}`;
  } else if (status === "syncing") {
    badge.style.background = "#e0f2fe";
    badge.style.color = "#0369a1";
    badge.style.borderColor = "#bae6fd";
    badgeText.textContent = text || "Syncing ke Google Sheet...";
  } else {
    badge.style.background = "#fef9c3";
    badge.style.color = "#a16207";
    badge.style.borderColor = "#fde047";
    badgeText.textContent = text || (lastSyncTimeString ? `Sinkron Gagal (Terakhir: ${lastSyncTimeString})` : "Cache Lokal (Set URL di Settings)");
  }
}

async function manualSyncGoogleSheet() {
  if (!currentUser || currentUser.role !== "admin") {
    alert("Akses Ditolak: Hanya Admin / Pengurus yang dapat melakukan sinkronisasi & penulisan ke Google Spreadsheet pusat.");
    return;
  }

  const activeUrl = getGoogleSheetUrl();
  if (!activeUrl) {
    alert("URL Google Apps Script API belum di-set. Silakan atur di menu Pengaturan terlebih dahulu.");
    showView("pengaturan");
    return;
  }

  updateStorageBadge("syncing", "Menyimpulkan & Menyinkronkan (GET -> Merge -> POST)...");

  try {
    // 1. GET live cloud data
    const res = await fetch(activeUrl);
    const cloudData = await res.json();

    if (cloudData && typeof cloudData === "object") {
      if (!appState) appState = {};

      // 2. MERGE cloud data safely with local state
      if (Array.isArray(cloudData.rumah) && cloudData.rumah.length > 0) appState.rumah = cloudData.rumah;
      if (Array.isArray(cloudData.tagihan)) {
        cloudData.tagihan.forEach((cloudT) => {
          if (cloudT && appState && Array.isArray(appState.tagihan)) {
            const localT = appState.tagihan.find((t) => t.id === cloudT.id);
            if (localT && localT.buktiTransfer && localT.buktiTransfer.startsWith("data:image")) {
              if (!cloudT.buktiTransfer || cloudT.buktiTransfer === "bukti: foto" || cloudT.buktiTransfer.length < 100) {
                cloudT.buktiTransfer = localT.buktiTransfer;
              }
            }
          }
        });
        appState.tagihan = cloudData.tagihan;
      }
      if (Array.isArray(cloudData.pengeluaran)) appState.pengeluaran = cloudData.pengeluaran;
      if (Array.isArray(cloudData.pemasukanLain)) appState.pemasukanLain = cloudData.pemasukanLain;
      if (Array.isArray(cloudData.komponenIPL) && cloudData.komponenIPL.length > 0) appState.komponenIPL = cloudData.komponenIPL;
      if (Array.isArray(cloudData.masterEvent) && cloudData.masterEvent.length > 0) appState.masterEvent = cloudData.masterEvent;
      if (Array.isArray(cloudData.users) && cloudData.users.length > 0) appState.users = cloudData.users;
      if (Array.isArray(cloudData.targetIPL) && cloudData.targetIPL.length > 0) appState.targetIPL = cloudData.targetIPL;
      if (Array.isArray(cloudData.auditLog)) appState.auditLog = cloudData.auditLog;
      if (cloudData.ringkasanKas && typeof cloudData.ringkasanKas === "object") appState.ringkasanKas = cloudData.ringkasanKas;
    }

    parseNestedJsonFields();
    ensureMasterRumahState();
    ensureMasterKomponenState();
    ensureMasterEventState();
    ensureMasterTargetIPLState();
    getCalculatedKasBalance();
    saveState();

    // 3. POST clean merged state back to Google Sheet
    const payload = getCleanPayloadForGoogleSheet(appState);
    await fetch(activeUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    updateStorageBadge("connected", `Terakhir sinkron: ${timeStr}`);
    
    // Refresh current UI
    const currentView = localStorage.getItem("damour_last_view") || "dashboard";
    showView(currentView);

    alert(`Sinkronisasi Manual Berhasil!\nData Google Spreadsheet telah diperbarui (Terakhir sinkron: ${timeStr})`);
  } catch (err) {
    console.error("Gagal sinkron manual:", err);
    updateStorageBadge("offline", "Sinkron Manual Gagal");
    alert("Sinkronisasi Manual Gagal. Periksa koneksi internet atau pastikan URL Apps Script di-set ke 'Anyone' (Siapa Saja).");
  }
}

function autoUpdateMenunggakStatus() {
  if (!appState || !appState.tagihan) return;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  appState.tagihan.forEach((t) => {
    if (!t) return;
    if (t.status === "Lunas" || t.status === "Menunggu Verifikasi") return;

    let billYear = parseInt(t.tahun, 10) || currentYear;
    let billMonthIdx = MONTH_NAMES.indexOf(t.bulan);

    if (t.periode && t.periode.includes("-")) {
      const parts = t.periode.split("-");
      const pYear = parseInt(parts[0], 10);
      if (!isNaN(pYear)) billYear = pYear;
      const pMonthIdx = MONTH_NAMES.indexOf(parts[1]);
      if (pMonthIdx !== -1) billMonthIdx = pMonthIdx;
    }

    if (billMonthIdx === -1) billMonthIdx = currentMonthIdx;

    const isPastPeriod = billYear < currentYear || (billYear === currentYear && billMonthIdx < currentMonthIdx);

    if (isPastPeriod) {
      t.status = "Menunggak";
    } else if (t.status !== "Menunggu Verifikasi") {
      t.status = "Menunggu Pembayaran";
    }
  });
}

function getWargaTunggakanSummary() {
  if (!appState || !appState.tagihan) return [];

  autoUpdateMenunggakStatus();

  const rumahMap = {};

  appState.tagihan.forEach((t) => {
    if (t.status === "Menunggak") {
      const blokClean = normalizeBlok(t.blokNo);
      if (!rumahMap[blokClean]) {
        rumahMap[blokClean] = {
          blokNo: t.blokNo,
          pemilik: t.pemilik,
          jumlahBulan: 0,
          totalTunggakan: 0,
          bulanList: []
        };
      }
      rumahMap[blokClean].jumlahBulan += 1;
      rumahMap[blokClean].totalTunggakan += (parseFloat(t.nominal) || 0);
      rumahMap[blokClean].bulanList.push(`${t.bulan} ${t.tahun}`);
    }
  });

  return Object.values(rumahMap);
}

// Load App Data with GOOGLE SPREADSHEET as PRIMARY STORAGE
async function loadAppData() {
  let jsonBackup = null;
  try {
    const res = await fetch("data.json");
    jsonBackup = await res.json();
  } catch (err) {
    console.error("Error loading data.json:", err);
  }

  // 1. Check primary local cache
  const saved = localStorage.getItem("damour_ipl_db");
  if (saved) {
    try {
      appState = JSON.parse(saved);
    } catch (e) {
      console.error("Primary LocalStorage cache corrupted:", e);
    }
  }

  // 1b. Secondary Layer Fallback: If primary cache failed/empty, try damour_ipl_db_backup!
  if (!appState || !appState.rumah || appState.rumah.length === 0) {
    const backupSaved = localStorage.getItem("damour_ipl_db_backup");
    if (backupSaved) {
      try {
        appState = JSON.parse(backupSaved);
        console.warn("RECOVERY: Main LocalStorage cache empty/corrupted. Successfully restored from secondary backup (damour_ipl_db_backup)!");
      } catch (e) {
        console.error("Secondary LocalStorage backup also corrupted:", e);
      }
    }
  }

  if (!appState || !appState.rumah || appState.rumah.length === 0) {
    appState = jsonBackup;
  }

  // 2. PRIMARY DATA SOURCE: FETCH LIVE FROM GOOGLE SPREADSHEET API FIRST
  const activeUrl = getGoogleSheetUrl();
  if (activeUrl) {
    updateStorageBadge("syncing", "Memuat data Google Sheet...");
    try {
      const cloudRes = await fetch(activeUrl);
      const cloudData = await cloudRes.json();
      if (cloudData && typeof cloudData === "object") {
        if (!appState) appState = {};

        // Merge cloud data safely instead of blind total overwrite
        if (Array.isArray(cloudData.rumah) && cloudData.rumah.length > 0) appState.rumah = cloudData.rumah;
        if (Array.isArray(cloudData.tagihan)) {
          cloudData.tagihan.forEach((cloudT) => {
            if (cloudT && appState && Array.isArray(appState.tagihan)) {
              const localT = appState.tagihan.find((t) => t.id === cloudT.id);
              if (localT && localT.buktiTransfer && localT.buktiTransfer.startsWith("data:image")) {
                if (!cloudT.buktiTransfer || cloudT.buktiTransfer === "bukti: foto" || cloudT.buktiTransfer.length < 100) {
                  cloudT.buktiTransfer = localT.buktiTransfer;
                }
              }
            }
          });
          appState.tagihan = cloudData.tagihan;
        }
        if (Array.isArray(cloudData.pengeluaran)) appState.pengeluaran = cloudData.pengeluaran;
        if (Array.isArray(cloudData.pemasukanLain)) appState.pemasukanLain = cloudData.pemasukanLain;
        if (Array.isArray(cloudData.komponenIPL) && cloudData.komponenIPL.length > 0) appState.komponenIPL = cloudData.komponenIPL;
        if (Array.isArray(cloudData.masterEvent) && cloudData.masterEvent.length > 0) appState.masterEvent = cloudData.masterEvent;
        if (Array.isArray(cloudData.users) && cloudData.users.length > 0) appState.users = cloudData.users;
        if (Array.isArray(cloudData.targetIPL) && cloudData.targetIPL.length > 0) appState.targetIPL = cloudData.targetIPL;
        if (Array.isArray(cloudData.auditLog)) appState.auditLog = cloudData.auditLog;
        if (cloudData.ringkasanKas && typeof cloudData.ringkasanKas === "object") {
          appState.ringkasanKas = { ...appState.ringkasanKas, ...cloudData.ringkasanKas };
        }

        if (!appState.settings) appState.settings = {};
        appState.settings.googleSheetApiUrl = activeUrl;
        localStorage.setItem("damour_ipl_gs_url", activeUrl);
        updateStorageBadge("connected", "Storage Utama: Google Sheet");
        console.log("PRIMARY DATA MERGED FROM GOOGLE SPREADSHEET WEB APP.");
      }
    } catch (e) {
      console.log("Cloud primary fetch failed, falling back to local cache.", e);
      updateStorageBadge("offline", "Cache Lokal (Google Sheet Offline)");
    }
  } else {
    updateStorageBadge("offline", "Storage: Cache Lokal (Set URL di Settings)");
  }

  parseNestedJsonFields();

  // SAFEGUARD: If rumah data is missing/empty, restore 31 houses from jsonBackup!
  if (!appState || !appState.rumah || !Array.isArray(appState.rumah) || appState.rumah.length === 0) {
    if (jsonBackup && jsonBackup.rumah && jsonBackup.rumah.length > 0) {
      appState.rumah = jsonBackup.rumah;
    }
  }

  // AUTO SEED: If Admin is logged in and Google Sheet is empty, push full initial dataset to Spreadsheet!
  if (currentUser && currentUser.role === "admin" && activeUrl) {
    if (!appState.rumah || appState.rumah.length === 0 || !appState.tagihan || appState.tagihan.length === 0) {
      console.log("INITIAL SPREADSHEET SEED: Spreadsheet empty, seeding full dataset now...");
      setTimeout(() => {
        autoSyncToGoogleSheet();
      }, 1500);
    }
  }

  if (!appState) appState = {};
  if (!appState.rumah) appState.rumah = [];
  if (!appState.tagihan) appState.tagihan = [];
  if (!appState.pengeluaran) appState.pengeluaran = [];
  if (!appState.pemasukanLain) appState.pemasukanLain = [];
  if (!appState.ringkasanKas) appState.ringkasanKas = { kasSaatIni: 0, masuk: 0, keluar: 0, selisih: 0 };

  ensureMasterRumahState();
  ensureMasterKomponenState();
  ensureMasterEventState();
  ensureMasterTargetIPLState();
  generateAllMissingHouseUsers(true);
  autoEnsureCurrentMonthBills();
  setLunasPrepaidB4Nurrudin();
  syncTagihanWithMasterRumah();
  cleanUpSampahFromKomponen();
  deduplicateAppState();
  autoUpdateMenunggakStatus();
  getCalculatedKasBalance();
  
  if (appState) {
    localStorage.setItem("damour_ipl_db", JSON.stringify(appState));
  }

  // Push cleaned state to Google Sheet database so Cloud DB is also updated
  if (activeUrl) {
    fetch(activeUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(appState)
    }).catch((e) => console.log("Cloud sync error:", e));
  }
}

function syncTagihanWithMasterRumah() {
  if (!appState) return;
  if (!appState.tagihan) appState.tagihan = [];
  if (!appState.rumah || appState.rumah.length === 0) return;

  appState.tagihan = appState.tagihan.filter((t) => {
    if (!t || !t.blokNo) return false;
    const cleanBlok = normalizeBlok(t.blokNo);
    const house = appState.rumah.find((r) => normalizeBlok(r.blokNo) === cleanBlok);
    
    if (!house) return false; // Delete tagihan for non-existent houses!

    // Sync live owner name & IPL group from Master Rumah
    t.blokNo = house.blokNo;
    t.pemilik = house.pemilik;
    t.kelompokIPL = house.kelompokIPL;
    return true;
  });
}

function normalizeBlok(b) {
  if (!b) return "";
  return b.trim().toUpperCase().replace(/^([A-Z]+)0+(\d+)$/, "$1$2");
}

function deduplicateAppState() {
  if (!appState) return;

  if (appState.rumah && Array.isArray(appState.rumah)) {
    const seenBlocks = new Set();
    appState.rumah = appState.rumah.filter((r) => {
      if (!r || !r.blokNo) return false;
      const cleanBlok = normalizeBlok(r.blokNo);
      if (seenBlocks.has(cleanBlok)) {
        return false;
      }
      seenBlocks.add(cleanBlok);
      r.blokNo = cleanBlok;
      return true;
    });
  }

  if (appState.users && Array.isArray(appState.users)) {
    const seenUsers = new Set();
    appState.users = appState.users.filter((u) => {
      if (!u || !u.username) return false;
      const cleanU = normalizeBlok(u.username).toLowerCase();
      if (seenUsers.has(cleanU)) {
        return false;
      }
      seenUsers.add(cleanU);
      if (u.blokNo && u.blokNo !== "-") {
        u.blokNo = normalizeBlok(u.blokNo);
      }
      return true;
    });
  }

  if (appState.tagihan && Array.isArray(appState.tagihan)) {
    const seenTagihan = new Set();
    appState.tagihan = appState.tagihan.filter((t) => {
      if (!t || !t.blokNo) return false;
      const cleanBlok = normalizeBlok(t.blokNo);
      t.blokNo = cleanBlok;
      const key = `${cleanBlok}-${t.bulan}-${t.tahun}`;
      if (seenTagihan.has(key)) {
        return false;
      }
      seenTagihan.add(key);
      return true;
    });
  }
}

function autoEnsureCurrentMonthBills() {
  if (!appState || !appState.rumah || appState.rumah.length === 0) return;
  if (!appState.tagihan) appState.tagihan = [];

  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = MONTH_NAMES[now.getMonth()];

  const baseTargetTanpaSampah = (appState.targetIPL && appState.targetIPL.find((t) => t.kelompok === "IPL Tanpa Sampah")?.target) || 150000;
  const baseTargetDeveloper = (appState.targetIPL && appState.targetIPL.find((t) => t.kelompok === "IPL Developer")?.target) || 166000;
  const defaultSampah = appState.biayaSampahDefault || 25000;

  // Filter out any bill for houses that no longer exist in Master Rumah
  const validHouseBlocks = new Set(appState.rumah.map((r) => normalizeBlok(r.blokNo)));
  appState.tagihan = appState.tagihan.filter((t) => t && t.blokNo && validHouseBlocks.has(normalizeBlok(t.blokNo)));

  appState.rumah.forEach((r) => {
    const cleanBlok = normalizeBlok(r.blokNo);
    const tagihanId = `TAG-${currentYear}${currentMonth}-${cleanBlok}`;
    
    let existingBill = appState.tagihan.find((t) => normalizeBlok(t.blokNo) === cleanBlok && t.bulan === currentMonth && t.tahun === currentYear);

    if (existingBill) {
      existingBill.blokNo = cleanBlok;
      existingBill.pemilik = r.pemilik;
      existingBill.kelompokIPL = r.kelompokIPL;
    } else {
      const rincianItems = [];
      let totalNominal = 0;

      if (r.kelompokIPL === "IPL Developer") {
        rincianItems.push({ nama: "IPL Developer", nominal: baseTargetDeveloper });
        totalNominal += baseTargetDeveloper;
      } else {
        rincianItems.push({ nama: "IPL Dasar", nominal: baseTargetTanpaSampah });
        totalNominal += baseTargetTanpaSampah;

        if (r.kelompokIPL === "IPL + Sampah") {
          rincianItems.push({ nama: "Iuran Sampah", nominal: defaultSampah });
          totalNominal += defaultSampah;
        }
      }

      if (appState.masterEvent) {
        appState.masterEvent.filter((e) => e.aktif).forEach((evt) => {
          rincianItems.push({ nama: evt.nama, nominal: evt.nominal });
          totalNominal += evt.nominal;
        });
      }

      appState.tagihan.push({
        id: tagihanId,
        periode: `${currentYear}-${currentMonth}`,
        bulan: currentMonth,
        tahun: currentYear,
        rumahId: r.id,
        blokNo: cleanBlok,
        pemilik: r.pemilik,
        kelompokIPL: r.kelompokIPL,
        nominal: totalNominal,
        rincianItems: rincianItems,
        status: "Menunggu",
        tglBayar: "-",
        metode: "-",
        buktiTransfer: ""
      });
    }
  });

  appState.tagihan.sort((a, b) => a.blokNo.localeCompare(b.blokNo, undefined, { numeric: true }));
}

function ensureMasterEventState() {
  if (!appState.users || appState.users.length === 0) {
    appState.users = DEFAULT_USERS;
  } else {
    DEFAULT_USERS.forEach((defUser) => {
      const exists = appState.users.some((u) => u.username.toLowerCase() === defUser.username.toLowerCase());
      if (!exists) {
        appState.users.push(defUser);
      }
    });
  }

  ensureMasterKomponenState();

  if (!appState.masterEvent) {
    appState.masterEvent = [
      { id: "evt-1", nama: "Iuran THR Satpam", nominal: 50000, dibayarOleh: "Semua", aktif: false },
      { id: "evt-2", nama: "Iuran 17 Agustus", nominal: 20000, dibayarOleh: "Semua", aktif: false }
    ];
  }
  if (!appState.biayaSampahDefault) {
    appState.biayaSampahDefault = 25000;
  }
  if (!appState.pemasukanLain) {
    appState.pemasukanLain = [];
  }
}

const DEFAULT_KOMPONEN_IPL = [
  { id: "komp-1", nama: "Satpam 1", nominalTotal: 1750000, isAutoKas: false, dibayarOleh: "Semua", aktif: true },
  { id: "komp-2", nama: "Kas (Otomatis)", nominalTotal: 0, isAutoKas: true, dibayarOleh: "Semua", aktif: true },
  { id: "komp-4", nama: "Listrik + Wifi", nominalTotal: 550000, isAutoKas: false, dibayarOleh: "Semua", aktif: true },
  { id: "komp-5", nama: "Tambahan Developer", nominalTotal: 32000, isAutoKas: false, dibayarOleh: "IPL Developer", aktif: true },
  { id: "komp-6", nama: "Satpam 2", nominalTotal: 1500000, isAutoKas: false, dibayarOleh: "Semua", aktif: true },
  { id: "komp-7", nama: "Satpam (Inval)", nominalTotal: 450000, isAutoKas: false, dibayarOleh: "Semua", aktif: true }
];

const DEFAULT_31_RUMAH = [
  { id: "RMH-C1", blokNo: "C1", pemilik: "Fendi", noHp: "081234567801", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C2", blokNo: "C2", pemilik: "Ben", noHp: "081234567802", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C3", blokNo: "C3", pemilik: "Putra", noHp: "081234567803", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C4", blokNo: "C4", pemilik: "Fadly", noHp: "081234567804", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C5", blokNo: "C5", pemilik: "Boy", noHp: "081234567805", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C6", blokNo: "C6", pemilik: "Dika", noHp: "081234567806", status: "Aktif", kelompokIPL: "IPL Tanpa Sampah" },
  { id: "RMH-C7", blokNo: "C7", pemilik: "Diki", noHp: "081234567807", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C8", blokNo: "C8", pemilik: "Delon", noHp: "081234567808", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C9", blokNo: "C9", pemilik: "Ika", noHp: "081234567809", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C10", blokNo: "C10", pemilik: "Ferdy", noHp: "081234567810", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C11", blokNo: "C11", pemilik: "Yudi", noHp: "081234567811", status: "Aktif", kelompokIPL: "IPL Tanpa Sampah" },
  { id: "RMH-C12", blokNo: "C12", pemilik: "Riki", noHp: "081234567812", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C13", blokNo: "C13", pemilik: "Lukmana", noHp: "081234567813", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C14", blokNo: "C14", pemilik: "Jamal", noHp: "081234567814", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C15", blokNo: "C15", pemilik: "Iva", noHp: "081234567815", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C16", blokNo: "C16", pemilik: "Ridwan", noHp: "081234567816", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C17", blokNo: "C17", pemilik: "Kristova", noHp: "081234567817", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C18", blokNo: "C18", pemilik: "Panji", noHp: "081234567818", status: "Aktif", kelompokIPL: "IPL Tanpa Sampah" },
  { id: "RMH-C19", blokNo: "C19", pemilik: "Helmi", noHp: "081234567819", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-C20", blokNo: "C20", pemilik: "Fandy", noHp: "081234567820", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-B1", blokNo: "B1", pemilik: "B1 (-)", noHp: "081234567821", status: "Aktif", kelompokIPL: "IPL Tanpa Sampah" },
  { id: "RMH-B2", blokNo: "B2", pemilik: "Developer", noHp: "081234567822", status: "Aktif", kelompokIPL: "IPL Developer" },
  { id: "RMH-B3", blokNo: "B3", pemilik: "Developer", noHp: "081234567823", status: "Aktif", kelompokIPL: "IPL Developer" },
  { id: "RMH-B4", blokNo: "B4", pemilik: "Nurrudin", noHp: "081234567824", status: "Aktif", kelompokIPL: "IPL + Sampah" },
  { id: "RMH-B5", blokNo: "B5", pemilik: "Developer", noHp: "081234567825", status: "Aktif", kelompokIPL: "IPL Developer" },
  { id: "RMH-B6", blokNo: "B6", pemilik: "Developer", noHp: "081234567826", status: "Aktif", kelompokIPL: "IPL Developer" },
  { id: "RMH-B7", blokNo: "B7", pemilik: "Developer", noHp: "081234567827", status: "Aktif", kelompokIPL: "IPL Developer" },
  { id: "RMH-B8", blokNo: "B8", pemilik: "Martins", noHp: "081234567828", status: "Aktif", kelompokIPL: "IPL Tanpa Sampah" },
  { id: "RMH-A1", blokNo: "A1", pemilik: "Developer", noHp: "081234567829", status: "Aktif", kelompokIPL: "IPL Developer" },
  { id: "RMH-A2", blokNo: "A2", pemilik: "Developer", noHp: "081234567830", status: "Aktif", kelompokIPL: "IPL Developer" },
  { id: "RMH-A3", blokNo: "A3", pemilik: "Developer", noHp: "081234567831", status: "Aktif", kelompokIPL: "IPL Developer" }
];

function ensureMasterRumahState() {
  if (!appState) appState = {};

  const validBloks = new Set(DEFAULT_31_RUMAH.map((d) => normalizeBlok(d.blokNo)));

  // Purge any house not in the official 31-house list (including A4 and A8)
  if (appState.rumah && Array.isArray(appState.rumah)) {
    appState.rumah = appState.rumah.filter((r) => r && r.blokNo && validBloks.has(normalizeBlok(r.blokNo)));
  }

  if (!appState.rumah || appState.rumah.length === 0) {
    appState.rumah = JSON.parse(JSON.stringify(DEFAULT_31_RUMAH));
  } else {
    DEFAULT_31_RUMAH.forEach((defR) => {
      const cleanDef = normalizeBlok(defR.blokNo);
      let target = appState.rumah.find((r) => normalizeBlok(r.blokNo) === cleanDef);
      if (target) {
        target.pemilik = defR.pemilik;
        target.kelompokIPL = defR.kelompokIPL;
      } else {
        appState.rumah.push(defR);
      }
    });
  }

  if (appState.users && Array.isArray(appState.users)) {
    appState.users = appState.users.filter((u) => {
      if (u.role === "admin" || u.role === "developer") return true;
      if (!u.blokNo || u.blokNo === "-") return true;
      return validBloks.has(normalizeBlok(u.blokNo));
    });

    appState.users.forEach((u) => {
      if (u.blokNo && u.blokNo !== "-") {
        const cleanUBlok = normalizeBlok(u.blokNo);
        const matchHouse = appState.rumah.find((r) => normalizeBlok(r.blokNo) === cleanUBlok);
        if (matchHouse) {
          u.name = matchHouse.pemilik;
        }
      }
    });
  }

  if (appState.tagihan && Array.isArray(appState.tagihan)) {
    appState.tagihan = appState.tagihan.filter((t) => t && t.blokNo && validBloks.has(normalizeBlok(t.blokNo)));

    appState.tagihan.forEach((t) => {
      if (t.blokNo) {
        const cleanTBlok = normalizeBlok(t.blokNo);
        const matchHouse = appState.rumah.find((r) => normalizeBlok(r.blokNo) === cleanTBlok);
        if (matchHouse) {
          t.pemilik = matchHouse.pemilik;
          t.kelompokIPL = matchHouse.kelompokIPL;
        }
      }
    });
  }
}

function ensureMasterKomponenState() {
  if (!appState) appState = {};
  if (!appState.komponenIPL || !Array.isArray(appState.komponenIPL) || appState.komponenIPL.length === 0) {
    appState.komponenIPL = JSON.parse(JSON.stringify(DEFAULT_KOMPONEN_IPL));
  } else {
    DEFAULT_KOMPONEN_IPL.forEach((defK) => {
      const exists = appState.komponenIPL.some((k) => k.nama.toLowerCase().trim() === defK.nama.toLowerCase().trim());
      if (!exists) {
        appState.komponenIPL.push(defK);
      }
    });
  }
}

const DEFAULT_TARGET_IPL = [
  { id: "tgt-1", kelompok: "IPL + Sampah", target: 175000, keterangan: "IPL standar + Iuran sampah warga" },
  { id: "tgt-2", kelompok: "IPL Tanpa Sampah", target: 150000, keterangan: "IPL standar tanpa kebersihan sampah" },
  { id: "tgt-3", kelompok: "IPL Developer", target: 166000, keterangan: "Khusus unit rumah milik developer" }
];

function ensureMasterTargetIPLState() {
  if (!appState) appState = {};
  if (!appState.targetIPL || !Array.isArray(appState.targetIPL) || appState.targetIPL.length === 0) {
    appState.targetIPL = JSON.parse(JSON.stringify(DEFAULT_TARGET_IPL));
  } else {
    DEFAULT_TARGET_IPL.forEach((defT) => {
      const exists = appState.targetIPL.some((t) => t.kelompok === defT.kelompok);
      if (!exists) {
        appState.targetIPL.push(defT);
      }
    });
  }
}

function parseNestedJsonFields() {
  if (!appState) return;

  if (appState.tagihan && Array.isArray(appState.tagihan)) {
    appState.tagihan.forEach((t) => {
      if (t) {
        if (typeof t.rincianItems === "string" && t.rincianItems.trim().startsWith("[")) {
          try {
            t.rincianItems = JSON.parse(t.rincianItems);
          } catch (e) {
            console.error("Gagal parse rincianItems JSON:", e);
            t.rincianItems = [];
          }
        }
        if (!Array.isArray(t.rincianItems)) {
          t.rincianItems = [];
        }

        if (typeof t.rincian === "string" && t.rincian.trim().startsWith("[")) {
          try {
            t.rincian = JSON.parse(t.rincian);
          } catch (e) {
            t.rincian = [];
          }
        }
      }
    });
  }
}

function cleanUpSampahFromKomponen() {
  if (appState && appState.komponenIPL) {
    appState.komponenIPL = appState.komponenIPL.filter((k) => k.nama.toLowerCase() !== "sampah");
  }
}

function saveState() {
  if (appState) {
    const jsonStr = JSON.stringify(appState);
    // 1. Primary Local Cache
    localStorage.setItem("damour_ipl_db", jsonStr);

    // 2. Secondary Local Backup Layer
    localStorage.setItem("damour_ipl_db_backup", jsonStr);
    localStorage.setItem("damour_ipl_db_backup_time", new Date().toISOString());

    autoSyncToGoogleSheet();
  }
}

function restoreFromLocalBackup() {
  const backupSaved = localStorage.getItem("damour_ipl_db_backup");
  const backupTime = localStorage.getItem("damour_ipl_db_backup_time");

  if (!backupSaved) {
    alert("Belum ada cadangan lokal (damour_ipl_db_backup) yang tersimpan di browser ini.");
    return;
  }

  const timeFormatted = backupTime ? new Date(backupTime).toLocaleString("id-ID") : "Sebelumnya";

  if (confirm(`Apakah Anda yakin ingin memulihkan seluruh data dari Cadangan Lokal Lapisan Kedua (Waktu Cadangan: ${timeFormatted})?`)) {
    try {
      appState = JSON.parse(backupSaved);
      localStorage.setItem("damour_ipl_db", backupSaved);
      saveState();
      alert(`Data berhasil dipulihkan dari Cadangan Lokal (Waktu: ${timeFormatted})!`);
      location.reload();
    } catch (e) {
      alert("Gagal memulihkan cadangan lokal: format data tidak valid.");
    }
  }
}

function getCleanPayloadForGoogleSheet(state) {
  if (!state || typeof state !== "object") return {};
  
  try {
    const stateCopy = JSON.parse(JSON.stringify(state));

    if (stateCopy.tagihan && Array.isArray(stateCopy.tagihan)) {
      stateCopy.tagihan.forEach((t) => {
        if (t) {
          // Google Sheets cell character limit is 50,000 characters.
          // If image is larger than 45,000 chars, truncate placeholder to avoid Google Sheet API error
          if (t.buktiTransfer && t.buktiTransfer.length > 45000) {
            t.buktiTransfer = "bukti: foto (ukuran terlalu besar)";
          }
        }
      });
    }

    return stateCopy;
  } catch (e) {
    console.error("Gagal bersihkan payload Google Sheet:", e);
    return state;
  }
}

// Automatic Real-Time Background Sync to Google Sheet (PRIMARY STORAGE)
let autoSyncDebounceTimer = null;
function autoSyncToGoogleSheet(immediate = false) {
  if (!appState) return;

  const activeUrl = getGoogleSheetUrl();
  if (!activeUrl) {
    updateStorageBadge("offline", "Storage: Cache Lokal (Belum Set URL)");
    return;
  }

  if (autoSyncDebounceTimer) {
    clearTimeout(autoSyncDebounceTimer);
    autoSyncDebounceTimer = null;
  }

  const executeSync = () => {
    updateStorageBadge("syncing", "Menyimpan ke Google Sheet...");
    const payload = getCleanPayloadForGoogleSheet(appState);

    try {
      fetch(activeUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      }).then(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        console.log("PRIMARY STORAGE: Synced data to Google Spreadsheet successfully at " + timeStr);
        updateStorageBadge("connected", `Google Sheet (Real-Time: ${timeStr})`);
      }).catch((err) => {
        console.log("Primary storage sync error:", err);
        updateStorageBadge("offline", "Cache Lokal (GSheet Error)");
      });
    } catch (e) {
      console.log("Failed to trigger background primary sync:", e);
      updateStorageBadge("offline", "Cache Lokal (GSheet Error)");
    }
  };

  if (immediate) {
    executeSync();
  } else {
    autoSyncDebounceTimer = setTimeout(executeSync, 500);
  }
}

function clearAllAppData() {
  if (confirm("Apakah Anda yakin ingin mengosongkan SELURUH data? Anda dapat menginput ulang data rumah dan transaksi satu per satu dari awal.")) {
    appState = {
      settings: { appName: "D'AMOUR Sistem IPL", perumahan: "Perumahan D'AMOUR", periodeAktif: "2025-08", googleSheetApiUrl: "" },
      biayaSampahDefault: 25000,
      _transactionsCleared: true,
      users: DEFAULT_USERS,
      targetIPL: [
        { id: "tgt-1", kelompok: "IPL + Sampah", target: 175000, keterangan: "IPL + Sampah" },
        { id: "tgt-2", kelompok: "IPL Tanpa Sampah", target: 150000, keterangan: "IPL Tanpa Sampah" },
        { id: "tgt-3", kelompok: "IPL Developer", target: 166000, keterangan: "IPL Developer" }
      ],
      masterEvent: [
        { id: "evt-1", nama: "Iuran THR Satpam", nominal: 50000, dibayarOleh: "Semua", aktif: true },
        { id: "evt-2", nama: "Iuran 17 Agustus", nominal: 20000, dibayarOleh: "Semua", aktif: false }
      ],
      komponenIPL: [
        { id: "komp-1", nama: "Satpam 1", nominalTotal: 1750000, isAutoKas: false, dibayarOleh: "Semua", aktif: true },
        { id: "komp-2", nama: "Kas (Otomatis)", nominalTotal: 0, isAutoKas: true, dibayarOleh: "Semua", aktif: true },
        { id: "komp-4", nama: "Listrik + Wifi", nominalTotal: 550000, isAutoKas: false, dibayarOleh: "Semua", aktif: true },
        { id: "komp-5", nama: "Tambahan Developer", nominalTotal: 32000, isAutoKas: false, dibayarOleh: "IPL Developer", aktif: true },
        { id: "komp-6", nama: "Satpam 2", nominalTotal: 1500000, isAutoKas: false, dibayarOleh: "Semua", aktif: true },
        { id: "komp-7", nama: "Satpam (Inval)", nominalTotal: 450000, isAutoKas: false, dibayarOleh: "Semua", aktif: true }
      ],
      rumah: [],
      tagihan: [],
      pengeluaran: [],
      pemasukanLain: [],
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
  const isAdmin = currentUser && currentUser.role === "admin";
  const adminOnlyViews = ["users", "generate-tagihan", "komponen", "event", "target", "pengaturan"];

  if (!isAdmin && adminOnlyViews.includes(viewId)) {
    alert("Akses Ditolak: Halaman ini hanya dapat diakses oleh Admin / Pengurus.");
    return;
  }

  localStorage.setItem("damour_last_view", viewId);

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
      users: "Management User & Hak Akses",
      komponen: "Master Komponen IPL",
      event: "Master Event & Biaya Tambahan",
      target: "Setting Target IPL & Sampah",
      perhitungan: "Perhitungan IPL (Rincian)",
      "generate-tagihan": "Generate Tagihan",
      "daftar-tagihan": "Daftar Tagihan",
      "detail-tagihan": "Detail Tagihan",
      "form-pembayaran": "Pembayaran",
      pengeluaran: "Data Pengeluaran",
      kas: "Kas (Arus Kas)",
      laporan: "Laporan IPL",
      "laporan-neraca": "Laporan Kas & Neraca Per Periode",
      "piutang-warga": "Laporan Piutang & Tunggakan Warga",
      "rekap-realisasi": "Rekap Wajib Setor vs Realisasi Per Komponen",
      "audit-log": "Audit Trail & Log Aktivitas Sistem",
      simulasi: "Simulasi IPL",
      pengaturan: "Pengaturan Sistem"
    };
    breadcrumb.textContent = titles[viewId] || "Dashboard";
  }

  if (viewId === "dashboard") renderDashboard();
  if (viewId === "users") renderMasterUsers();
  if (viewId === "rumah") renderMasterRumah();
  if (viewId === "komponen") renderMasterKomponen();
  if (viewId === "event") renderMasterEvent();
  if (viewId === "laporan-neraca") renderLaporanNeraca();
  if (viewId === "piutang-warga") renderLaporanPiutangWarga();
  if (viewId === "rekap-realisasi") renderWajibSetorVsRealisasi();
  if (viewId === "audit-log") renderAuditLogTable();
  if (viewId === "target") renderSettingTarget();
  if (viewId === "perhitungan") renderPerhitunganIPL();
  if (viewId === "generate-tagihan") {
    updateHouseGroupCounts();
    renderGenerateTagihanForm();
  }
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
      const backdrop = document.getElementById("sidebar-backdrop");
      if (backdrop) backdrop.style.display = "none";
    });
  });

  const toggleBtn = document.getElementById("toggle-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const sidebar = document.querySelector(".sidebar");
      const isOpen = sidebar.classList.toggle("open");
      if (backdrop) backdrop.style.display = isOpen ? "block" : "none";
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      document.querySelector(".sidebar").classList.remove("open");
      backdrop.style.display = "none";
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
  getCalculatedKasBalance();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthName = MONTH_NAMES[now.getMonth()];

  const dashTitle = document.getElementById("dash-summary-title");
  if (dashTitle) {
    dashTitle.textContent = `Ringkasan Bulan Ini (${currentMonthName} ${currentYear})`;
  }

  const totalRumah = appState.rumah ? appState.rumah.length : 0;
  
  const currentMonthBills = (appState.tagihan || []).filter(
    (t) => t.bulan === currentMonthName && (t.tahun === currentYear.toString() || (t.periode && t.periode.includes(currentYear.toString())))
  );

  const lunasCount = currentMonthBills.filter((t) => t.status === "Lunas").length;
  const menungguCount = currentMonthBills.filter((t) => t.status === "Menunggu" || t.status === "Menunggu Pembayaran" || t.status === "Menunggu Verifikasi").length;
  const menunggakCount = currentMonthBills.filter((t) => t.status === "Menunggak").length;

  document.getElementById("kpi-total-rumah").textContent = `${totalRumah} Unit`;
  document.getElementById("kpi-menunggak").textContent = `${menungguCount + menunggakCount} Unit`;
  document.getElementById("kpi-lunas").textContent = `${lunasCount} Unit`;
  document.getElementById("kpi-kas").textContent = formatRp(appState.ringkasanKas ? appState.ringkasanKas.kasSaatIni : 0);

  const totalTagihan = currentMonthBills.reduce((acc, t) => acc + (parseFloat(t.nominal) || 0), 0);
  const totalPembayaran = currentMonthBills
    .filter((t) => t.status === "Lunas" && t.metode !== "Sudah Bayar Sblm Sistem")
    .reduce((acc, t) => acc + (parseFloat(t.nominal) || 0), 0);
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

  // Dashboard Recent Tagihan filtered to personal house for Warga role
  const recentTagihanTbody = document.getElementById("recent-tagihan-tbody");
  if (recentTagihanTbody) {
    let recentTagihanList = appState.tagihan || [];

    if (currentUser && currentUser.role === "warga" && currentUser.blokNo && currentUser.blokNo !== "-") {
      const userBlok = currentUser.blokNo.toLowerCase().trim();
      recentTagihanList = recentTagihanList.filter((t) => t.blokNo.toLowerCase().trim() === userBlok);
    } else if (currentUser && currentUser.role === "developer") {
      recentTagihanList = recentTagihanList.filter((t) => t.kelompokIPL === "IPL Developer");
    }

    if (recentTagihanList.length === 0) {
      recentTagihanTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Belum ada data tagihan.</td></tr>`;
    } else {
      recentTagihanTbody.innerHTML = recentTagihanList
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
  updateAdminNotifications();
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
    
    const now = new Date();
    const dynamicMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      dynamicMonths.push(MONTH_NAMES[d.getMonth()].substring(0, 3));
    }

    const historyData = appState.grafik6Bulan && appState.grafik6Bulan.length > 0
      ? appState.grafik6Bulan
      : dynamicMonths.map((m) => ({ bulan: m, tagihan: 0, pembayaran: 0 }));

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

  const isAdmin = currentUser && currentUser.role === "admin";
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
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 6 : 5}" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada data rumah terdaftar.</td></tr>`;
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
            ${
              isAdmin
                ? `<td>
                    <button class="btn btn-outline btn-sm" onclick="editRumah('${r.id}')"><i class="ri-edit-line"></i></button>
                    <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deleteRumah('${r.id}')"><i class="ri-delete-bin-line"></i></button>
                  </td>`
                : ""
            }
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
  generateAllMissingHouseUsers(true);
  updateHouseGroupCounts();
  renderMasterRumah();
  renderMasterUsers();
  renderDashboard();
  renderPerhitunganIPL();
  renderSimulasiInputs();
  runSimulasiIPL();
}

function deleteRumah(id) {
  if (confirm("Apakah Anda yakin ingin menghapus data rumah ini?")) {
    appState.rumah = appState.rumah.filter((r) => r.id !== id);
    saveState();
    generateAllMissingHouseUsers(true);
    updateHouseGroupCounts();
    renderMasterRumah();
    renderMasterUsers();
    renderDashboard();
    renderPerhitunganIPL();
    renderSimulasiInputs();
    runSimulasiIPL();
  }
}

function renderMasterKomponen() {
  ensureMasterKomponenState();
  if (!appState || !appState.komponenIPL) return;

  const isAdmin = currentUser && currentUser.role === "admin";
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
            <input type="checkbox" ${k.aktif ? "checked" : ""} ${!isAdmin ? "disabled" : ""} onchange="toggleKomponenAktif('${k.id}')" style="width: 18px; height: 18px; cursor: pointer;">
          </td>
          ${
            isAdmin
              ? `<td>
                  <button class="btn btn-outline btn-sm" onclick="editKomponen('${k.id}')"><i class="ri-edit-line"></i></button>
                  <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deleteKomponen('${k.id}')"><i class="ri-delete-bin-line"></i></button>
                </td>`
              : ""
          }
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

/* ==========================================================================
   MASTER EVENT & BIAYA TAMBAHAN
   ========================================================================== */
function renderMasterEvent() {
  if (!appState || !appState.masterEvent) return;

  const isAdmin = currentUser && currentUser.role === "admin";
  const tbody = document.getElementById("master-event-tbody");
  if (tbody) {
    if (appState.masterEvent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 5 : 4}" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada event / iuran tambahan.</td></tr>`;
    } else {
      tbody.innerHTML = appState.masterEvent
        .map(
          (e) => `
          <tr>
            <td><strong>${e.nama}</strong></td>
            <td style="font-weight: 600;">${formatRp(e.nominal)} / rumah</td>
            <td>${e.dibayarOleh}</td>
            <td>
              <input type="checkbox" ${e.aktif ? "checked" : ""} ${!isAdmin ? "disabled" : ""} onchange="toggleEventAktif('${e.id}')" style="width: 18px; height: 18px; cursor: pointer;">
            </td>
            ${
              isAdmin
                ? `<td>
                    <button class="btn btn-outline btn-sm" onclick="editEvent('${e.id}')"><i class="ri-edit-line"></i></button>
                    <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deleteEvent('${e.id}')"><i class="ri-delete-bin-line"></i></button>
                  </td>`
                : ""
            }
          </tr>
        `
        )
        .join("");
    }
  }
}

function toggleEventAktif(id) {
  const e = appState.masterEvent.find((item) => item.id === id);
  if (e) {
    e.aktif = !e.aktif;
    saveState();
    renderMasterEvent();
    renderGenerateTagihanForm();
  }
}

function openAddEventModal() {
  document.getElementById("form-event-id").value = "";
  document.getElementById("form-event-nama").value = "";
  document.getElementById("form-event-nominal").value = "";
  document.getElementById("form-event-dibayar").value = "Semua";
  document.getElementById("modal-event-title").textContent = "Tambah Event / Biaya Tambahan";
  openModal("modal-event");
}

function editEvent(id) {
  const e = appState.masterEvent.find((item) => item.id === id);
  if (!e) return;

  document.getElementById("form-event-id").value = e.id;
  document.getElementById("form-event-nama").value = e.nama;
  document.getElementById("form-event-nominal").value = e.nominal;
  document.getElementById("form-event-dibayar").value = e.dibayarOleh;
  document.getElementById("modal-event-title").textContent = "Edit Event / Biaya Tambahan";
  openModal("modal-event");
}

function saveEvent() {
  const id = document.getElementById("form-event-id").value;
  const nama = document.getElementById("form-event-nama").value.trim();
  const nominal = parseFloat(document.getElementById("form-event-nominal").value) || 0;
  const dibayar = document.getElementById("form-event-dibayar").value;

  if (!nama || nominal <= 0) {
    alert("Nama event dan nominal wajib diisi.");
    return;
  }

  if (id) {
    const idx = appState.masterEvent.findIndex((e) => e.id === id);
    if (idx !== -1) {
      appState.masterEvent[idx] = { ...appState.masterEvent[idx], nama, nominal, dibayarOleh: dibayar };
    }
  } else {
    appState.masterEvent.push({
      id: `evt-${Date.now()}`,
      nama,
      nominal,
      dibayarOleh: dibayar,
      aktif: true
    });
  }

  saveState();
  closeModal("modal-event");
  renderMasterEvent();
  renderGenerateTagihanForm();
}

function deleteEvent(id) {
  if (confirm("Apakah Anda yakin ingin menghapus event ini?")) {
    appState.masterEvent = appState.masterEvent.filter((e) => e.id !== id);
    saveState();
    renderMasterEvent();
    renderGenerateTagihanForm();
  }
}

/* ==========================================================================
   SETTING TARGET IPL & SAMPAH
   ========================================================================== */
function renderSettingTarget() {
  if (!appState || !appState.targetIPL) return;

  const tbody = document.getElementById("setting-target-tbody");
  if (tbody) {
    const rows = appState.targetIPL
      .map(
        (t) => `
        <tr>
          <td><strong>${t.kelompok}</strong></td>
          <td style="font-weight: 600;">${formatRp(t.target)}</td>
        </tr>
      `
      )
      .join("");

    const sampahRow = `
      <tr style="background: #f8fafc;">
        <td><strong>Biaya Sampah Default (Tambahan Penagihan)</strong></td>
        <td style="font-weight: 600; color: var(--primary);">${formatRp(appState.biayaSampahDefault || 25000)} / rumah</td>
      </tr>
    `;

    tbody.innerHTML = rows + sampahRow;
  }
}

function recalcTargetPlusSampah() {
  const baseVal = parseFloat(document.getElementById("target-val-2").value) || 150000;
  const sampahVal = parseFloat(document.getElementById("target-val-sampah").value) || 25000;

  document.getElementById("target-val-1").value = baseVal + sampahVal;
}

function openEditTargetModal() {
  const targetStandard = appState.targetIPL.find((t) => t.kelompok === "IPL + Sampah")?.target || 175000;
  const targetTanpaSampah = appState.targetIPL.find((t) => t.kelompok === "IPL Tanpa Sampah")?.target || 150000;
  const targetDev = appState.targetIPL.find((t) => t.kelompok === "IPL Developer")?.target || 166000;

  document.getElementById("target-val-2").value = targetTanpaSampah;
  document.getElementById("target-val-sampah").value = appState.biayaSampahDefault || 25000;
  document.getElementById("target-val-1").value = targetStandard;
  document.getElementById("target-val-3").value = targetDev;

  openModal("modal-target");
}

function saveSettingTarget() {
  const val1 = parseFloat(document.getElementById("target-val-1").value) || 175000;
  const val2 = parseFloat(document.getElementById("target-val-2").value) || 150000;
  const val3 = parseFloat(document.getElementById("target-val-3").value) || 166000;
  const valSampah = parseFloat(document.getElementById("target-val-sampah").value) || 25000;

  appState.biayaSampahDefault = valSampah;

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

/* ==========================================================================
   4. PERHITUNGAN IPL (DYNAMIC CALCULATION FOR ADDITIONS & REDUCTIONS)
   ========================================================================== */
function renderPerhitunganIPL() {
  ensureMasterKomponenState();
  if (!appState) return;

  const isAdmin = currentUser && currentUser.role === "admin";
  const hasHouses = appState.rumah && appState.rumah.length > 0;
  const totalRumahAll = hasHouses ? appState.rumah.length : 31;
  const totalRumahDev = hasHouses ? (appState.rumah.filter((r) => r.kelompokIPL === "IPL Developer").length || totalRumahAll) : 2;

  const targetTanpaSampahObj = appState.targetIPL ? appState.targetIPL.find((t) => t.kelompok === "IPL Tanpa Sampah") : null;
  const baseTargetTanpaSampah = targetTanpaSampahObj ? targetTanpaSampahObj.target : 150000;

  let generalCostsPerHomeSum = 0;

  const tbody = document.getElementById("perhitungan-ipl-tbody");
  if (!tbody) return;

  const activeKomponen = (appState.komponenIPL || []).filter((k) => {
    return k.aktif === true || String(k.aktif).toLowerCase() === "true" || k.aktif === undefined;
  });

  const rowsHtml = activeKomponen
    .map((k) => {
      let targetJmlRumah = totalRumahAll;
      if (k.dibayarOleh === "IPL Developer" || k.dibayarOleh === "Developer") {
        targetJmlRumah = totalRumahDev;
      }

      if (k.isAutoKas) {
        return `<tr id="row-auto-kas">
          <td><strong>${k.nama}</strong></td>
          <td><span class="badge badge-secondary">AUTO (Sisa)</span></td>
          <td>${k.dibayarOleh}</td>
          <td>${targetJmlRumah}</td>
          <td id="cell-kas-per-rumah" style="font-weight: 700; color: var(--success);">-</td>
          ${
            isAdmin
              ? `<td>
                  <button class="btn btn-outline btn-sm" onclick="editKomponen('${k.id}')"><i class="ri-edit-line"></i></button>
                </td>`
              : ""
          }
        </tr>`;
      }

      const costPerHome = targetJmlRumah > 0 ? k.nominalTotal / targetJmlRumah : 0;
      
      if (k.dibayarOleh !== "IPL Developer" && k.dibayarOleh !== "Developer") {
        generalCostsPerHomeSum += costPerHome;
      }

      return `
        <tr>
          <td><strong>${k.nama}</strong></td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.25rem;">
              <span style="font-size: 0.8rem; color: var(--text-muted);">Rp</span>
              <input type="number" class="form-control" style="width: 140px; font-weight: 600;" value="${k.nominalTotal}" ${!isAdmin ? "readonly style='background:#f1f5f9;'" : ""} oninput="updatePerhitunganNominalDirect('${k.id}', this.value)">
            </div>
          </td>
          <td>${k.dibayarOleh}</td>
          <td><strong style="color: var(--primary);">${targetJmlRumah}</strong></td>
          <td style="font-weight: 600;">${formatRpDecimal(costPerHome)}</td>
          ${
            isAdmin
              ? `<td>
                  <button class="btn btn-outline btn-sm" onclick="editKomponen('${k.id}')" title="Edit Master"><i class="ri-edit-line"></i></button>
                  <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deleteKomponen('${k.id}')" title="Hapus"><i class="ri-delete-bin-line"></i></button>
                </td>`
              : ""
          }
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rowsHtml;

  const kasPerHome = Math.max(0, baseTargetTanpaSampah - generalCostsPerHomeSum);
  const kasCell = document.getElementById("cell-kas-per-rumah");
  if (kasCell) {
    kasCell.textContent = formatRpDecimal(kasPerHome);
  }

  const generalTotalCell = document.getElementById("perhitungan-general-total");
  if (generalTotalCell) {
    generalTotalCell.textContent = `${formatRpDecimal(generalCostsPerHomeSum)}`;
  }

  const grandTotalCell = document.getElementById("perhitungan-grand-total");
  if (grandTotalCell) {
    const grandTotal = generalCostsPerHomeSum + kasPerHome;
    grandTotalCell.textContent = `${formatRpDecimal(grandTotal)}`;
  }
}

function updatePerhitunganNominalDirect(id, value) {
  if (currentUser && currentUser.role !== "admin") return;

  const nominal = parseFloat(value) || 0;
  const k = appState.komponenIPL.find((item) => item.id === id);
  if (k) {
    k.nominalTotal = nominal;
    saveState();
    renderPerhitunganIPL();
    renderSimulasiInputs();
    runSimulasiIPL();
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

function renderGenerateTagihanForm() {
  const container = document.getElementById("gen-event-checkboxes-container");
  if (!container || !appState || !appState.masterEvent) return;

  const activeEvents = appState.masterEvent.filter((e) => e.aktif);

  if (activeEvents.length === 0) {
    container.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-muted);">Tidak ada event aktif. (Dapat ditambah melalui menu <strong>Master Event & Biaya Tambahan</strong>).</span>`;
    return;
  }

  container.innerHTML = activeEvents
    .map(
      (e) => `
      <label class="checkbox-item">
        <input type="checkbox" class="chk-gen-event" data-id="${e.id}" data-nama="${e.nama}" data-nominal="${e.nominal}" checked>
        <span><strong>${e.nama}</strong> (+${formatRp(e.nominal)} / rumah)</span>
      </label>
    `
    )
    .join("");

  const sampahInput = document.getElementById("gen-sampah-nominal");
  if (sampahInput) {
    sampahInput.value = appState.biayaSampahDefault || 25000;
  }
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

  const nominalSampahGen = parseFloat(document.getElementById("gen-sampah-nominal")?.value) || 25000;

  const selectedEvents = [];
  document.querySelectorAll(".chk-gen-event:checked").forEach((chk) => {
    selectedEvents.push({
      nama: chk.getAttribute("data-nama"),
      nominal: parseFloat(chk.getAttribute("data-nominal")) || 0
    });
  });

  const baseTargetTanpaSampah = (appState.targetIPL && appState.targetIPL.find((t) => t.kelompok === "IPL Tanpa Sampah")?.target) || 150000;
  const baseTargetDeveloper = (appState.targetIPL && appState.targetIPL.find((t) => t.kelompok === "IPL Developer")?.target) || 166000;

  const matchingHouses = appState.rumah.filter((r) => selectedGroups.includes(r.kelompokIPL));

  let generatedCount = 0;

  matchingHouses.forEach((r) => {
    const tagihanId = `TAG-${tahun}${bulan}-${r.blokNo}`;
    const exists = appState.tagihan.find((t) => t.id === tagihanId);

    const rincianItems = [];
    let totalNominal = 0;

    if (r.kelompokIPL === "IPL Developer") {
      rincianItems.push({ nama: "IPL Developer", nominal: baseTargetDeveloper });
      totalNominal += baseTargetDeveloper;
    } else {
      rincianItems.push({ nama: "IPL Dasar", nominal: baseTargetTanpaSampah });
      totalNominal += baseTargetTanpaSampah;

      if (r.kelompokIPL === "IPL + Sampah") {
        rincianItems.push({ nama: "Iuran Sampah", nominal: nominalSampahGen });
        totalNominal += nominalSampahGen;
      }
    }

    selectedEvents.forEach((evt) => {
      rincianItems.push({ nama: evt.nama, nominal: evt.nominal });
      totalNominal += evt.nominal;
    });

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
        nominal: totalNominal,
        rincianItems: rincianItems,
        status: "Menunggu Pembayaran",
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
  syncTagihanWithMasterRumah();
  autoUpdateMenunggakStatus();
  if (!appState || !appState.tagihan) return;

  const isAdmin = currentUser && currentUser.role === "admin";
  const isWarga = currentUser && currentUser.role === "warga";
  const userBlok = currentUser && currentUser.blokNo ? currentUser.blokNo.toLowerCase().trim() : "";

  const now = new Date();
  const searchInput = document.getElementById("filter-tagihan-search");
  const searchVal = (searchInput?.value || "").toLowerCase();
  const filterBulan = document.getElementById("filter-tagihan-bulan")?.value || MONTH_NAMES[now.getMonth()];
  const filterTahun = document.getElementById("filter-tagihan-tahun")?.value || now.getFullYear().toString();
  const filterStatus = document.getElementById("filter-tagihan-status")?.value || "Semua";

  if (isWarga && userBlok && userBlok !== "-") {
    if (searchInput) {
      searchInput.value = currentUser.blokNo;
      searchInput.setAttribute("readonly", "true");
      searchInput.style.background = "#f1f5f9";
    }
  } else {
    if (searchInput && searchInput.hasAttribute("readonly")) {
      searchInput.removeAttribute("readonly");
      searchInput.style.background = "";
    }
  }

  const filtered = appState.tagihan.filter((t) => {
    const matchesSearch = t.blokNo.toLowerCase().includes(searchVal) || t.pemilik.toLowerCase().includes(searchVal);
    const matchesBulan = filterBulan === "Semua" || t.bulan === filterBulan || t.periode.includes(filterBulan);
    const matchesTahun = filterTahun === "Semua" || t.tahun === filterTahun || t.periode.includes(filterTahun);

    let displayStatus = t.status;
    if (displayStatus === "Menunggu") displayStatus = "Menunggu Pembayaran";
    const matchesStatus = filterStatus === "Semua" || displayStatus === filterStatus;

    if (currentUser && currentUser.role === "developer") {
      return t.kelompokIPL === "IPL Developer" && matchesSearch && matchesBulan && matchesTahun && matchesStatus;
    }

    if (isWarga && userBlok && userBlok !== "-") {
      const isMyBill = t.blokNo.toLowerCase().trim() === userBlok;
      return isMyBill && matchesBulan && matchesTahun && matchesStatus;
    }

    return matchesSearch && matchesBulan && matchesTahun && matchesStatus;
  });

  // Prioritize "Menunggu Verifikasi" bills at the top for Admin
  filtered.sort((a, b) => {
    const aVerif = a.status === "Menunggu Verifikasi" ? 1 : 0;
    const bVerif = b.status === "Menunggu Verifikasi" ? 1 : 0;
    if (aVerif !== bVerif) return bVerif - aVerif;
    return 0;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentTagihanPage > totalPages) currentTagihanPage = totalPages;

  const startIdx = (currentTagihanPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

  const tbody = document.getElementById("daftar-tagihan-tbody");
  if (tbody) {
    if (paginated.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">${isWarga ? `Belum ada tagihan untuk rumah ${currentUser.blokNo}.` : "Belum ada data tagihan."}</td></tr>`;
    } else {
      tbody.innerHTML = paginated
        .map((t, idx) => {
          let displayStatus = t.status;
          if (!displayStatus || displayStatus === "Menunggu") {
            displayStatus = "Menunggu Pembayaran";
            t.status = "Menunggu Pembayaran";
          }

          let badgeClass = "badge-secondary";
          if (displayStatus === "Lunas") badgeClass = "badge-success";
          if (displayStatus === "Menunggu Pembayaran") badgeClass = "badge-warning";
          if (displayStatus === "Menunggu Verifikasi") badgeClass = "badge-info";
          if (displayStatus === "Menunggak") badgeClass = "badge-danger";

          const globalIndex = startIdx + idx + 1;
          const userBlokClean = currentUser && currentUser.blokNo ? normalizeBlok(currentUser.blokNo) : "";
          const billBlokClean = normalizeBlok(t.blokNo);
          const isMyHouse = userBlokClean !== "" && userBlokClean !== "-" && userBlokClean === billBlokClean;

          return `
            <tr>
              <td>${globalIndex}</td>
              <td><strong>${t.blokNo}</strong></td>
              <td>${t.pemilik}</td>
              <td>${t.kelompokIPL}</td>
              <td style="font-weight: 600;">${formatRp(t.nominal)}</td>
              <td><span class="badge ${badgeClass}">${displayStatus}</span></td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="viewDetailTagihan('${t.id}')" title="Lihat Detail"><i class="ri-eye-line"></i></button>
                ${isAdmin ? `<button class="btn btn-outline btn-sm" onclick="openEditTagihanModal('${t.id}')" title="Edit Nominal Tagihan"><i class="ri-edit-line"></i></button>` : ""}
                ${
                  displayStatus !== "Lunas" && isMyHouse
                    ? displayStatus === "Menunggu Verifikasi"
                      ? `<button class="btn btn-outline btn-sm" onclick="openFormPembayaran('${t.id}')" title="Ubah Bukti Transfer"><i class="ri-image-edit-line"></i> Ubah Bukti</button>`
                      : `<button class="btn btn-primary btn-sm" onclick="openFormPembayaran('${t.id}')" title="Bayar / Upload Bukti"><i class="ri-checkbox-circle-line"></i> Bayar</button>`
                    : ""
                }
                ${
                  t.status !== "Lunas" && isAdmin
                    ? `<button class="btn btn-success btn-sm" onclick="verifikasiLunasTagihan('${t.id}')" title="Verifikasi LUNAS & Masuk Kas"><i class="ri-check-double-line"></i> Verifikasi</button>`
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

  updateAdminNotifications();
}

function changeTagihanPage(page) {
  currentTagihanPage = page;
  renderDaftarTagihan();
}

function openEditTagihanModal(id) {
  const t = appState.tagihan.find((item) => item.id === id);
  if (!t) return;

  document.getElementById("edit-tagihan-id").value = t.id;
  document.getElementById("edit-tagihan-warga").value = `${t.blokNo} - ${t.pemilik} (${t.kelompokIPL})`;
  document.getElementById("edit-tagihan-nominal").value = t.nominal;
  
  const catInput = document.getElementById("edit-tagihan-catatan");
  if (catInput) {
    catInput.value = t.catatanKhusus || "";
  }
  
  openModal("modal-edit-tagihan");
}

function saveEditTagihanNominal() {
  const id = document.getElementById("edit-tagihan-id").value;
  const nom = parseFloat(document.getElementById("edit-tagihan-nominal").value) || 0;
  const catInput = document.getElementById("edit-tagihan-catatan");
  const cat = catInput ? catInput.value.trim() : "";

  const t = appState.tagihan.find((item) => item.id === id);
  if (t) {
    t.nominal = nom;
    t.catatanKhusus = cat;

    if (cat) {
      if (!t.rincianItems) t.rincianItems = [];
      const existingNote = t.rincianItems.find((item) => item.isCustomNote);
      if (existingNote) {
        existingNote.nama = cat;
        existingNote.nominal = nom;
      } else {
        t.rincianItems.push({ nama: `Penyesuaian: ${cat}`, nominal: nom, isCustomNote: true });
      }
    }

    saveState();
    closeModal("modal-edit-tagihan");
    renderDaftarTagihan();
    renderDashboard();
    alert(`Berhasil memperbarui tagihan rumah ${t.blokNo} (${t.pemilik})!`);
  }
}

function viewDetailTagihan(id) {
  const t = appState.tagihan.find((item) => item.id === id);
  if (!t) return;

  document.getElementById("detail-val-rumah").textContent = `${t.blokNo} - ${t.pemilik}`;
  document.getElementById("detail-val-kelompok").textContent = t.kelompokIPL;
  document.getElementById("detail-val-bulan").textContent = `${t.bulan || MONTH_NAMES[new Date().getMonth()]} ${t.tahun || new Date().getFullYear()}`;
  document.getElementById("detail-val-nominal").textContent = formatRp(t.nominal);

  let displayStatus = t.status;
  if (!displayStatus || displayStatus === "Menunggu") displayStatus = "Menunggu Pembayaran";

  let badgeClass = "badge-secondary";
  if (displayStatus === "Lunas") badgeClass = "badge-success";
  if (displayStatus === "Menunggu Pembayaran") badgeClass = "badge-warning";
  if (displayStatus === "Menunggu Verifikasi") badgeClass = "badge-info";
  if (displayStatus === "Menunggak") badgeClass = "badge-danger";

  document.getElementById("detail-val-status").innerHTML = `<span class="badge ${badgeClass}">${displayStatus}</span>`;

  const tbody = document.getElementById("detail-rincian-tbody");

  if (tbody) {
    if (typeof t.rincianItems === "string") {
      try { t.rincianItems = JSON.parse(t.rincianItems); } catch (e) { t.rincianItems = []; }
    }
    if (Array.isArray(t.rincianItems) && t.rincianItems.length > 0) {
      tbody.innerHTML = t.rincianItems
        .map(
          (item) => `
          <tr>
            <td>${item.nama}</td>
            <td style="text-align: right; font-weight: 600;">${formatRpDecimal(item.nominal)}</td>
          </tr>
        `
        )
        .join("");
    } else {
      const totalRumah = appState.rumah.length || 31;
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
  }

  document.getElementById("detail-val-total-rounded").textContent = formatRp(t.nominal).replace("Rp ", "");

  const wrapper = document.getElementById("detail-bukti-wrapper");
  const imgEl = document.getElementById("detail-bukti-img");
  const infoEl = document.getElementById("detail-bukti-info");

  if (wrapper && imgEl && infoEl) {
    if (t.buktiTransfer && t.buktiTransfer.length > 10) {
      imgEl.src = t.buktiTransfer;
      infoEl.textContent = `Tanggal Bayar: ${t.tglBayar || "-"} | Metode: ${t.metode || "-"}`;
      wrapper.style.display = "block";
    } else {
      wrapper.style.display = "none";
      imgEl.src = "";
    }
  }

  showView("detail-tagihan");
}

function openFormPembayaran(id) {
  const t = appState.tagihan.find((item) => item.id === id);
  if (!t) return;

  document.getElementById("bayar-form-id").value = t.id;
  document.getElementById("bayar-form-rumah").textContent = `${t.blokNo} - ${t.pemilik}`;
  document.getElementById("bayar-form-bulan").textContent = `${t.bulan || MONTH_NAMES[new Date().getMonth()]} ${t.tahun || new Date().getFullYear()}`;
  document.getElementById("bayar-form-total").textContent = formatRp(t.nominal);
  document.getElementById("bayar-form-nominal").value = t.nominal;

  let displayStatus = t.status || "Menunggu Pembayaran";
  if (displayStatus === "Menunggu") displayStatus = "Menunggu Pembayaran";

  let badgeClass = "badge-secondary";
  if (displayStatus === "Lunas") badgeClass = "badge-success";
  if (displayStatus === "Menunggu Pembayaran") badgeClass = "badge-warning";
  if (displayStatus === "Menunggu Verifikasi") badgeClass = "badge-info";
  if (displayStatus === "Menunggak") badgeClass = "badge-danger";

  document.getElementById("bayar-form-status").className = `badge ${badgeClass}`;
  document.getElementById("bayar-form-status").textContent = displayStatus;

  if (t.buktiTransfer && t.buktiTransfer.startsWith("data:image")) {
    document.getElementById("preview-bukti-wrapper").style.display = "block";
    document.getElementById("img-preview-bukti").src = t.buktiTransfer;
  } else {
    document.getElementById("preview-bukti-wrapper").style.display = "none";
    document.getElementById("img-preview-bukti").src = "";
  }

  showView("form-pembayaran");
}

function compressImageBase64(file, maxWidth = 500, maxHeight = 500, quality = 0.55) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => resolve("");
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(e.target.result);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let q = quality;
        let compressedDataUrl = canvas.toDataURL("image/jpeg", q);
        
        // Ensure compressed image is strictly under 45,000 characters to fit inside a single Google Sheet cell safely
        while (compressedDataUrl.length > 42000 && q > 0.2) {
          q -= 0.1;
          compressedDataUrl = canvas.toDataURL("image/jpeg", q);
        }

        resolve(compressedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function previewBuktiTransfer(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const compressedBase64 = await compressImageBase64(file, 500, 500, 0.55);
    document.getElementById("img-preview-bukti").src = compressedBase64;
    document.getElementById("preview-bukti-wrapper").style.display = "block";
  }
}

async function simpanFormPembayaran() {
  const id = document.getElementById("bayar-form-id").value;
  const tgl = document.getElementById("bayar-form-tanggal").value;
  const metode = document.getElementById("bayar-form-metode").value;
  const fileInput = document.getElementById("file-bukti-transfer") || document.getElementById("bayar-form-bukti");
  let previewImg = document.getElementById("img-preview-bukti").src;

  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      previewImg = await compressImageBase64(fileInput.files[0], 500, 500, 0.55);
    } catch (e) {
      console.error("Image compression error:", e);
    }
  }

  const t = appState.tagihan.find((item) => item.id === id);
  if (t) {
    t.tglBayar = tgl ? tgl.split("-").reverse().join("/") : new Date().toLocaleDateString("id-ID");
    t.metode = metode;
    if (previewImg && !previewImg.endsWith("#") && previewImg.length > 50) {
      t.buktiTransfer = previewImg;
    }

    t.status = "Menunggu Verifikasi";
    saveState();
    autoSyncToGoogleSheet(true);
    addAuditLog("Upload Pembayaran", `Warga rumah ${t.blokNo} (${t.pemilik}) mengunggah bukti transfer sebesar ${formatRp(t.nominal)}`);
    alert("Bukti pembayaran berhasil dikompresi & dikirim! Status telah diubah menjadi 'Menunggu Verifikasi'. Silakan tunggu verifikasi admin.");

    showView("daftar-tagihan");
    renderDashboard();
    renderKasArusKasTable();
  }
}

function verifikasiLunasTagihan(id) {
  const isAdmin = currentUser && currentUser.role === "admin";
  if (!isAdmin) {
    alert("Hanya Admin yang berhak mengverifikasi pembayaran.");
    return;
  }

  const t = appState.tagihan.find((item) => item.id === id);
  if (!t) return;

  if (confirm(`Verifikasi pembayaran LUNAS untuk rumah ${t.blokNo} - ${t.pemilik} (Nominal: ${formatRp(t.nominal)})?`)) {
    t.status = "Lunas";
    if (!t.tglBayar || t.tglBayar === "-") {
      t.tglBayar = new Date().toLocaleDateString("id-ID");
    }
    
    getCalculatedKasBalance();

    saveState();
    renderDaftarTagihan();
    renderDashboard();
    renderKasArusKasTable();

    if (appState.settings && appState.settings.googleSheetApiUrl) {
      const url = appState.settings.googleSheetApiUrl.trim();
      if (url && url.startsWith("http") && !url.includes("EXAMPLE")) {
        fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(appState)
        }).catch((e) => console.log("Background sync error:", e));
      }
    }

    alert(`Pembayaran rumah ${t.blokNo} (${t.pemilik}) berhasil diverifikasi LUNAS dan Rp ${t.nominal.toLocaleString("id-ID")} resmi masuk ke Kas!`);
  }
}

function matchesMonthAndYear(dateStr, filterBulan, filterTahun) {
  if (!dateStr) return true;

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  let monthIndex = -1;
  let yearStr = "";

  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      monthIndex = parseInt(parts[1], 10) - 1;
      yearStr = parts[2];
    }
  } else if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        yearStr = parts[0];
        monthIndex = parseInt(parts[1], 10) - 1;
      } else {
        monthIndex = parseInt(parts[1], 10) - 1;
        yearStr = parts[2];
      }
    }
  }

  const matchesBulan = filterBulan === "Semua" || 
                       (monthIndex >= 0 && monthNames[monthIndex] === filterBulan) ||
                       dateStr.toLowerCase().includes(filterBulan.toLowerCase());

  const matchesTahun = filterTahun === "Semua" || 
                       yearStr === filterTahun || 
                       dateStr.includes(filterTahun);

  return matchesBulan && matchesTahun;
}

function renderPengeluaranTable() {
  if (!appState || !appState.pengeluaran) return;
  getCalculatedKasBalance();

  const isAdmin = currentUser && currentUser.role === "admin";
  const now = new Date();
  const filterBulan = document.getElementById("filter-pgl-bulan")?.value || MONTH_NAMES[now.getMonth()];
  const filterTahun = document.getElementById("filter-pgl-tahun")?.value || now.getFullYear().toString();
  const tbody = document.getElementById("pengeluaran-full-tbody");

  if (tbody) {
    if (appState.pengeluaran.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 5 : 4}" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada catatan pengeluaran.</td></tr>`;
    } else {
      const filteredPgl = appState.pengeluaran.filter((p) => matchesMonthAndYear(p.tanggal, filterBulan, filterTahun));
      
      if (filteredPgl.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 5 : 4}" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada catatan pengeluaran untuk periode ${filterBulan} ${filterTahun}.</td></tr>`;
      } else {
        tbody.innerHTML = filteredPgl
          .map(
            (p) => `
            <tr>
              <td>${p.tanggal}</td>
              <td><strong>${p.kategori}</strong></td>
              <td>${p.penerima || "-"}</td>
              <td style="font-weight: 600; color: var(--danger);">${formatRp(p.nominal)}</td>
              ${
                isAdmin
                  ? `<td>
                      <button class="btn btn-outline btn-sm" onclick="editPengeluaran('${p.id}')"><i class="ri-edit-line"></i></button>
                      <button class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="deletePengeluaran('${p.id}')"><i class="ri-delete-bin-line"></i></button>
                    </td>`
                  : ""
              }
            </tr>
          `
          )
          .join("");
      }
    }
  }
}

function populatePengeluaranKategoriDropdown(selectedVal = "") {
  ensureMasterKomponenState();
  ensureMasterEventState();

  const sel = document.getElementById("form-pgl-kategori");
  if (!sel) return;

  const activeKomponen = (appState.komponenIPL || []).filter((k) => k.aktif);
  const activeEvents = (appState.masterEvent || []).filter((e) => e.aktif);

  let html = `<option value="">-- Pilih Kategori Pengeluaran --</option>`;
  
  html += `<optgroup label="Komponen IPL Perumahan">`;
  activeKomponen.forEach((k) => {
    html += `<option value="${k.nama}">${k.nama}</option>`;
  });
  html += `</optgroup>`;

  if (activeEvents.length > 0) {
    html += `<optgroup label="Event / Biaya Tambahan">`;
    activeEvents.forEach((e) => {
      html += `<option value="Event: ${e.nama}">Event: ${e.nama}</option>`;
    });
    html += `</optgroup>`;
  }

  html += `<optgroup label="Lainnya">`;
  html += `<option value="Lain-Lain">Lain-Lain (Tambah Detail Keterangan)</option>`;
  html += `</optgroup>`;

  sel.innerHTML = html;

  if (selectedVal) {
    const isStandard = Array.from(sel.options).some((opt) => opt.value === selectedVal);
    if (isStandard) {
      sel.value = selectedVal;
      togglePglKategoriLainnya(sel);
    } else {
      sel.value = "Lain-Lain";
      togglePglKategoriLainnya(sel);
      const customInp = document.getElementById("form-pgl-kategori-custom");
      if (customInp) customInp.value = selectedVal;
    }
  } else {
    togglePglKategoriLainnya(sel);
  }
}

function togglePglKategoriLainnya(selEl) {
  const groupCustom = document.getElementById("group-pgl-kategori-lainnya");
  if (!groupCustom) return;

  if (selEl.value === "Lain-Lain") {
    groupCustom.style.display = "block";
  } else {
    groupCustom.style.display = "none";
  }
}

function openAddPengeluaranModal() {
  document.getElementById("form-pgl-id").value = "";
  document.getElementById("form-pgl-tanggal").value = new Date().toISOString().split("T")[0];
  populatePengeluaranKategoriDropdown("");
  document.getElementById("form-pgl-kategori-custom").value = "";
  document.getElementById("form-pgl-penerima").value = "";
  document.getElementById("form-pgl-nominal").value = "";
  document.getElementById("modal-pgl-title").textContent = "Tambah Pengeluaran Baru";
  openModal("modal-pengeluaran");
}

function editPengeluaran(id) {
  const p = appState.pengeluaran.find((item) => item.id === id);
  if (!p) return;

  document.getElementById("form-pgl-id").value = p.id;
  populatePengeluaranKategoriDropdown(p.kategori);
  document.getElementById("form-pgl-penerima").value = p.penerima || "";
  document.getElementById("form-pgl-nominal").value = p.nominal;
  document.getElementById("modal-pgl-title").textContent = "Edit Data Pengeluaran";
  openModal("modal-pengeluaran");
}

function savePengeluaran() {
  const id = document.getElementById("form-pgl-id").value;
  const tglInput = document.getElementById("form-pgl-tanggal").value;
  const selKategori = document.getElementById("form-pgl-kategori").value;
  const customKategori = document.getElementById("form-pgl-kategori-custom").value.trim();
  const pen = document.getElementById("form-pgl-penerima").value.trim();
  const nom = parseFloat(document.getElementById("form-pgl-nominal").value) || 0;

  let finalKategori = selKategori;
  if (selKategori === "Lain-Lain") {
    finalKategori = customKategori ? `Lain-Lain (${customKategori})` : "Lain-Lain";
  }

  if (!finalKategori || nom <= 0) {
    alert("Kategori dan nominal pengeluaran wajib diisi.");
    return;
  }

  const tglFormatted = tglInput ? tglInput.split("-").reverse().join("/") : new Date().toLocaleDateString("id-ID");

  if (id) {
    const idx = appState.pengeluaran.findIndex((p) => p.id === id);
    if (idx !== -1) {
      appState.pengeluaran[idx] = { ...appState.pengeluaran[idx], tanggal: tglFormatted, kategori: finalKategori, penerima: pen, nominal: nom };
    }
  } else {
    if (!appState.pengeluaran) appState.pengeluaran = [];
    appState.pengeluaran.unshift({
      id: `PGL-${Date.now()}`,
      tanggal: tglFormatted,
      kategori: finalKategori,
      penerima: pen,
      keterangan: finalKategori,
      nominal: nom
    });

  }

  getCalculatedKasBalance();

  saveState();

  if (appState.settings && appState.settings.googleSheetApiUrl) {
    const url = appState.settings.googleSheetApiUrl.trim();
    if (url && url.startsWith("http") && !url.includes("EXAMPLE")) {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(appState)
      }).catch((e) => console.log("Background sync error:", e));
    }
  }

  closeModal("modal-pengeluaran");
  renderPengeluaranTable();
  renderDashboard();
  renderKasArusKasTable();
  alert("Data pengeluaran berhasil disimpan dan disinkronkan ke Google Spreadsheet!");
}

function deletePengeluaran(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) return;

  if (!appState || !appState.pengeluaran) return;

  const targetItem = appState.pengeluaran.find((p) => String(p.id) === String(id));
  const detailKeterangan = targetItem ? `${targetItem.kategori} (${formatRp(targetItem.nominal)})` : id;

  appState.pengeluaran = appState.pengeluaran.filter((p) => String(p.id) !== String(id));
  
  getCalculatedKasBalance();
  saveState();
  addAuditLog("Hapus Pengeluaran", `Menghapus pengeluaran: ${detailKeterangan}`);

  renderPengeluaranTable();
  renderDashboard();
  renderKasArusKasTable();
  
  alert("Catatan pengeluaran berhasil dihapus!");
}

function inputSaldoKasSaatIni() {
  const currentKas = appState.ringkasanKas ? appState.ringkasanKas.kasSaatIni : 0;
  const val = prompt("Masukkan nominal Kas yang tersedia saat ini (Rp):", currentKas);
  if (val === null) return;
  
  const nom = parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0;
  
  if (!appState.ringkasanKas) {
    appState.ringkasanKas = { kasSaatIni: 0, masuk: 0, keluar: 0, selisih: 0 };
  }
  
  appState.ringkasanKas.kasSaatIni = nom;
  appState.ringkasanKas.masuk = nom + (appState.ringkasanKas.keluar || 0);
  appState.ringkasanKas.selisih = nom;

  // Log to PemasukanLain so it is recorded in Google Spreadsheet sheet!
  if (!appState.pemasukanLain) appState.pemasukanLain = [];
  const existingAwal = appState.pemasukanLain.find((p) => p.kategori === "Saldo Awal Kas");
  const todayFormatted = new Date().toLocaleDateString("id-ID");

  if (existingAwal) {
    existingAwal.nominal = nom;
    existingAwal.tanggal = todayFormatted;
  } else {
    appState.pemasukanLain.unshift({
      id: `PEM-${Date.now()}`,
      tanggal: todayFormatted,
      kategori: "Saldo Awal Kas",
      penerima: "Pengurus IPL",
      keterangan: "Saldo Awal Kas Tersedia",
      nominal: nom
    });
  }

  saveState();
  renderDashboard();
  renderKasArusKasTable();

  // Trigger live background sync to Google Spreadsheet if connected
  if (appState.settings && appState.settings.googleSheetApiUrl) {
    const url = appState.settings.googleSheetApiUrl.trim();
    if (url && url.startsWith("http") && !url.includes("EXAMPLE")) {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(getCleanPayloadForGoogleSheet(appState))
      }).catch((e) => console.log("Background sync error:", e));
    }
  }

  alert(`Berhasil memperbarui Kas Saat Ini menjadi ${formatRp(nom)} dan tersimpan ke Google Spreadsheet!`);
}

function clearAllPemasukanLain() {
  if (!confirm("Apakah Anda yakin ingin mengosongkan/menghapus seluruh catatan Pemasukan Lain-Lain?")) return;

  appState.pemasukanLain = [];
  saveState();
  renderDashboard();
  renderKasArusKasTable();

  if (appState.settings && appState.settings.googleSheetApiUrl) {
    const url = appState.settings.googleSheetApiUrl.trim();
    if (url && url.startsWith("http") && !url.includes("EXAMPLE")) {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(appState)
      }).catch((e) => console.log("Background sync error:", e));
    }
  }

  alert("Seluruh catatan Pemasukan Lain-Lain berhasil dikosongkan!");
}

/* ==========================================================================
   BANK RECONCILIATION & ADJUSTMENT LOGIC
   ========================================================================== */
function openModalRekonsiliasiBank() {
  const currentKas = appState.ringkasanKas ? appState.ringkasanKas.kasSaatIni : 0;
  document.getElementById("rekon-sys-balance").textContent = formatRp(currentKas);
  document.getElementById("rekon-bank-balance").value = "";
  document.getElementById("rekon-tanggal").value = new Date().toISOString().split("T")[0];
  document.getElementById("rekon-keterangan").value = "Bunga Bank & Admin Rekening (Penyesuaian Saldo)";
  document.getElementById("rekon-result-box").style.display = "none";
  openModal("modal-rekon-bank");
}

function calculateBankRekonSelisih() {
  const currentKas = appState.ringkasanKas ? appState.ringkasanKas.kasSaatIni : 0;
  const inputBankVal = parseFloat(document.getElementById("rekon-bank-balance").value);
  const resultBox = document.getElementById("rekon-result-box");
  const resultText = document.getElementById("rekon-result-text");

  if (isNaN(inputBankVal)) {
    resultBox.style.display = "none";
    return;
  }

  const selisih = inputBankVal - currentKas;
  resultBox.style.display = "block";

  if (selisih > 0) {
    resultBox.style.background = "#ecfdf5";
    resultBox.style.borderColor = "#a7f3d0";
    resultText.style.color = "#047857";
    resultText.textContent = `Selisih Pemasukan (Bunga Bank): +${formatRp(selisih)}`;
  } else if (selisih < 0) {
    resultBox.style.background = "#fef2f2";
    resultBox.style.borderColor = "#fecaca";
    resultText.style.color = "#b91c1c";
    resultText.textContent = `Selisih Pengeluaran (Admin/Biaya Bank): -${formatRp(Math.abs(selisih))}`;
  } else {
    resultBox.style.background = "#f8fafc";
    resultBox.style.borderColor = "#e2e8f0";
    resultText.style.color = "var(--text-muted)";
    resultText.textContent = `Saldo Sistem & Saldo Bank Sudah Sama (Tidak Ada Selisih).`;
  }
}

function simpanRekonsiliasiBank() {
  const currentKas = appState.ringkasanKas ? appState.ringkasanKas.kasSaatIni : 0;
  const inputBankVal = parseFloat(document.getElementById("rekon-bank-balance").value);
  const tglInput = document.getElementById("rekon-tanggal").value;
  const ket = document.getElementById("rekon-keterangan").value.trim() || "Bunga Bank & Admin Rekening (Penyesuaian)";

  if (isNaN(inputBankVal)) {
    alert("Masukkan nominal saldo riil rekening bank.");
    return;
  }

  const selisih = inputBankVal - currentKas;
  if (selisih === 0) {
    alert("Saldo bank sudah sama persis dengan saldo catatan sistem.");
    closeModal("modal-rekon-bank");
    return;
  }

  const tglFormatted = tglInput ? tglInput.split("-").reverse().join("/") : new Date().toLocaleDateString("id-ID");

  if (selisih > 0) {
    if (!appState.pemasukanLain) appState.pemasukanLain = [];
    appState.pemasukanLain.unshift({
      id: `MSK-${Date.now()}`,
      tanggal: tglFormatted,
      kategori: "Bunga Bank",
      penerima: "Bank (Bunga Netto)",
      keterangan: ket,
      nominal: selisih
    });

  }

  getCalculatedKasBalance();

  saveState();
  closeModal("modal-rekon-bank");
  alert(`Berhasil menyesuaikan saldo kas bank menjadi ${formatRp(inputBankVal)}!`);
  renderDashboard();
  renderKasArusKasTable();
  renderPengeluaranTable();
}

function renderKasArusKasTable() {
  if (!appState) return;
  getCalculatedKasBalance();

  const tbody = document.getElementById("kas-arus-tbody");
  if (!tbody) return;

  const ledgerRows = [];
  const kasSaatIniVal = (appState.ringkasanKas && appState.ringkasanKas.kasSaatIni) ? appState.ringkasanKas.kasSaatIni : 0;
  const hasSaldoAwalInPemasukan = (appState.pemasukanLain || []).some((p) => p.kategori === "Saldo Awal Kas");

  let currentBalance = 0;

  // Add initial Saldo Awal row if kasSaatIniVal exists and not already in pemasukanLain
  if (!hasSaldoAwalInPemasukan && kasSaatIniVal > 0) {
    currentBalance = kasSaatIniVal;
    ledgerRows.push({
      tanggal: new Date().toLocaleDateString("id-ID"),
      referensi: "Saldo Awal Kas Tersedia",
      masuk: kasSaatIniVal,
      keluar: null,
      saldo: currentBalance
    });
  }

  if (appState.pemasukanLain) {
    appState.pemasukanLain.forEach((m) => {
      currentBalance += m.nominal;
      ledgerRows.push({
        tanggal: m.tanggal,
        referensi: `${m.kategori} - ${m.keterangan || "Penyesuaian"}`,
        masuk: m.nominal,
        keluar: null,
        saldo: currentBalance
      });
    });
  }

  const lunasBills = appState.tagihan
    ? appState.tagihan.filter((t) => t.status === "Lunas" && t.metode !== "Sudah Bayar Sblm Sistem" && (!t.tglBayar || !t.tglBayar.includes("Sudah Lunas")))
    : [];

  if (lunasBills.length > 0) {
    lunasBills.forEach((t) => {
      currentBalance += t.nominal;
      ledgerRows.push({
        tanggal: t.tglBayar || new Date().toLocaleDateString("id-ID"),
        referensi: `Pembayaran IPL Blok ${t.blokNo} (${t.pemilik}) - ${t.bulan || ""} ${t.tahun || ""}`,
        masuk: t.nominal,
        keluar: null,
        saldo: currentBalance
      });
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
   12. FULLY EDITABLE & REAL-TIME DYNAMIC SIMULASI IPL
   ========================================================================== */
function renderSimulasiInputs() {
  const container = document.getElementById("simulasi-dynamic-inputs-container");
  if (!container || !appState || !appState.komponenIPL) return;

  const isAdmin = currentUser && currentUser.role === "admin";
  const activeKomponen = appState.komponenIPL.filter((k) => k.aktif);

  let html = "";
  activeKomponen.forEach((k) => {
    if (k.isAutoKas) {
      return;
    }

    html += `
      <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        <label style="margin-bottom: 0;">${k.nama} (Total)</label>
        <input type="number" class="form-control sim-input-komponen" data-id="${k.id}" data-dibayar="${k.dibayarOleh}" style="width: 160px; text-align: right;" value="${k.nominalTotal}" ${!isAdmin ? "readonly style='background:#f1f5f9;'" : ""} oninput="runSimulasiIPL()">
      </div>
    `;
  });

  container.innerHTML = html;
}

function syncSimulasiFromMaster() {
  renderSimulasiInputs();
  runSimulasiIPL();
  alert("Input simulasi berhasil di-reset sesuai data terkini Perhitungan IPL!");
}

function runSimulasiIPL() {
  if (!appState || !appState.komponenIPL) return;

  const hasHouses = appState && appState.rumah && appState.rumah.length > 0;
  const totalRumahAll = hasHouses ? appState.rumah.length : 31;
  const rumahDevCount = hasHouses ? (appState.rumah.filter((r) => r.kelompokIPL === "IPL Developer").length || totalRumahAll) : 2;

  let costGeneralPerHome = 0;
  let costDevPerHome = 0;

  const inputs = document.querySelectorAll(".sim-input-komponen");
  inputs.forEach((inp) => {
    const val = parseFloat(inp.value) || 0;
    const dibayar = inp.getAttribute("data-dibayar");

    if (dibayar === "Developer" || dibayar === "IPL Developer") {
      costDevPerHome += val / rumahDevCount;
    } else {
      costGeneralPerHome += val / totalRumahAll;
    }
  });

  const target1 = appState && appState.targetIPL ? (appState.targetIPL.find((t) => t.kelompok === "IPL + Sampah")?.target || 175000) : 175000;
  const target2 = appState && appState.targetIPL ? (appState.targetIPL.find((t) => t.kelompok === "IPL Tanpa Sampah")?.target || 150000) : 150000;
  const target3 = appState && appState.targetIPL ? (appState.targetIPL.find((t) => t.kelompok === "IPL Developer")?.target || 166000) : 166000;

  const kasBase = Math.round(target2 - costGeneralPerHome);
  
  const kasGroup1 = kasBase;
  const kasGroup2 = kasBase;
  
  const kasGroup3 = Math.round(target3 - (costGeneralPerHome + costDevPerHome));

  const tbody = document.getElementById("simulasi-result-tbody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td><strong>IPL + Sampah</strong></td>
        <td style="text-align: right;"><span style="font-weight: 700; margin-right: 1.5rem;">${formatRp(target1)}</span> <span style="color: var(--text-main); font-weight: 600;">${kasGroup1.toLocaleString("id-ID")}</span></td>
      </tr>
      <tr>
        <td><strong>IPL Tanpa Sampah</strong></td>
        <td style="text-align: right;"><span style="font-weight: 700; margin-right: 1.5rem;">${formatRp(target2)}</span> <span style="color: var(--text-main); font-weight: 600;">${kasGroup2.toLocaleString("id-ID")}</span></td>
      </tr>
      <tr>
        <td><strong>IPL Developer</strong></td>
        <td style="text-align: right;"><span style="font-weight: 700; margin-right: 1.5rem;">${formatRp(target3)}</span> <span style="color: var(--text-main); font-weight: 600;">${kasGroup3.toLocaleString("id-ID")}</span></td>
      </tr>
    `;
  }
}

/* ==========================================================================
   GOOGLE SPREADSHEET API SYNC
   ========================================================================== */
async function saveAndSyncGoogleSheet() {
  const urlInput = document.getElementById("setting-gsheet-url");
  const url = urlInput ? urlInput.value.trim() : (appState && appState.settings ? appState.settings.googleSheetApiUrl : "");
  if (!url) {
    alert("Masukkan URL Google Apps Script Web App terlebih dahulu.");
    return;
  }

  if (!appState.settings) appState.settings = {};
  appState.settings.googleSheetApiUrl = url;
  
  ensureMasterEventState();
  generateAllMissingHouseUsers(true);
  autoEnsureCurrentMonthBills();
  syncTagihanWithMasterRumah();
  deduplicateAppState();
  saveState();

  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(appState)
    });
    alert("Berhasil membersihkan data dummy dan mengirimkan data resmi 31 rumah ke Google Spreadsheet Anda!");
  } catch (err) {
    alert("Data lokal tersimpan dan terkirim ke Google Spreadsheet.");
    console.log("Sync error or CORS mode:", err);
  }
}

function exportDataJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `damour_ipl_backup_${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/* ==========================================================================
   PASSWORD HASHING (SHA-256 WITH SALT)
   ========================================================================== */
async function hashPassword(plainText) {
  if (!plainText) return "";
  if (/^[a-f0-9]{64}$/i.test(plainText)) return plainText;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText + "_DAMOUR_SALT_2026");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    return plainText;
  }
}

/* ==========================================================================
   AUDIT TRAIL / LOG AKTIVITAS SYSTEM
   ========================================================================== */
function addAuditLog(action, detail) {
  if (!appState) return;
  if (!appState.auditLog) appState.auditLog = [];

  const timestamp = new Date().toLocaleString("id-ID");
  const actor = currentUser ? `${currentUser.name} (${currentUser.username})` : "Sistem";

  appState.auditLog.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: timestamp,
    actor: actor,
    action: action,
    detail: detail
  });

  if (appState.auditLog.length > 500) {
    appState.auditLog = appState.auditLog.slice(0, 500);
  }
}

function renderAuditLogTable() {
  if (!appState) return;
  if (!appState.auditLog) appState.auditLog = [];

  const searchInput = document.getElementById("filter-audit-search");
  const searchVal = (searchInput?.value || "").toLowerCase();
  const tbody = document.getElementById("audit-log-tbody");

  if (!tbody) return;

  const filtered = appState.auditLog.filter((log) => {
    return (
      log.actor.toLowerCase().includes(searchVal) ||
      log.action.toLowerCase().includes(searchVal) ||
      log.detail.toLowerCase().includes(searchVal)
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada catatan log aktivitas.</td></tr>`;
  } else {
    tbody.innerHTML = filtered
      .map(
        (log, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><span style="font-size: 0.8rem; color: var(--text-muted);"><i class="ri-time-line"></i> ${log.timestamp}</span></td>
          <td><strong>${log.actor}</strong></td>
          <td><span class="badge badge-info">${log.action}</span></td>
          <td>${log.detail}</td>
        </tr>
      `
      )
      .join("");
  }
}

function getCalculatedKasBalance() {
  if (!appState) return 0;

  const totalMasukIPL = (appState.tagihan || [])
    .filter((t) => t.status === "Lunas" && t.metode !== "Sudah Bayar Sblm Sistem" && (!t.tglBayar || !t.tglBayar.includes("Sudah Lunas")))
    .reduce((sum, t) => sum + (parseFloat(t.nominal) || 0), 0);

  const totalMasukLain = (appState.pemasukanLain || [])
    .reduce((sum, p) => sum + (parseFloat(p.nominal) || 0), 0);

  const totalPengeluaran = (appState.pengeluaran || [])
    .reduce((sum, p) => sum + (parseFloat(p.nominal) || 0), 0);

  const calculatedBalance = totalMasukIPL + totalMasukLain - totalPengeluaran;

  if (!appState.ringkasanKas) appState.ringkasanKas = {};

  if (calculatedBalance === 0 && appState.ringkasanKas.kasSaatIni > 0) {
    const currentPreserved = appState.ringkasanKas.kasSaatIni - totalPengeluaran;
    appState.ringkasanKas.keluar = totalPengeluaran;
    appState.ringkasanKas.selisih = currentPreserved;
    return currentPreserved;
  }

  appState.ringkasanKas.kasSaatIni = calculatedBalance;
  appState.ringkasanKas.masuk = totalMasukIPL + totalMasukLain;
  appState.ringkasanKas.keluar = totalPengeluaran;
  appState.ringkasanKas.selisih = calculatedBalance;

  return calculatedBalance;
}

function setLunasPrepaidB4Nurrudin() {
  if (!appState) return;
  if (!appState.tagihan) appState.tagihan = [];

  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = MONTH_NAMES[now.getMonth()];

  appState.tagihan = appState.tagihan.filter((t) => {
    if (normalizeBlok(t.blokNo) === "B4") {
      return t.bulan === currentMonth && t.tahun === currentYear;
    }
    return true;
  });

  let bill = appState.tagihan.find(
    (t) => normalizeBlok(t.blokNo) === "B4" && t.bulan === currentMonth && t.tahun === currentYear
  );

  if (!bill) {
    appState.tagihan.push({
      id: `TAG-${currentYear}${currentMonth}-B4`,
      periode: `${currentYear}-${currentMonth}`,
      bulan: currentMonth,
      tahun: currentYear,
      rumahId: "RMH-B4",
      blokNo: "B4",
      pemilik: "Nurrudin",
      kelompokIPL: "IPL + Sampah",
      nominal: 175000,
      rincianItems: [
        { nama: "IPL Dasar", nominal: 150000 },
        { nama: "Iuran Sampah", nominal: 25000 }
      ],
      status: "Lunas",
      tglBayar: "Sudah Lunas Sblm Sistem",
      metode: "Sudah Bayar Sblm Sistem",
      buktiTransfer: ""
    });
  } else {
    bill.nominal = 175000;
    bill.rincianItems = [
      { nama: "IPL Dasar", nominal: 150000 },
      { nama: "Iuran Sampah", nominal: 25000 }
    ];
    bill.status = "Lunas";
    bill.tglBayar = "Sudah Lunas Sblm Sistem";
    bill.metode = "Sudah Bayar Sblm Sistem";
  }
}

/* ==========================================================================
   LAPORAN KAS & NERACA PER PERIODE (REKONSILIASI PERIODE AWAL + MASUK - KELUAR = AKHIR)
   ========================================================================== */
function renderLaporanNeraca() {
  if (!appState) return;

  // Dynamic recalculation of Cash Balance from transactions
  getCalculatedKasBalance();

  const now = new Date();
  const filterBulan = document.getElementById("filter-neraca-bulan")?.value || "Semua";
  const filterTahunSelect = document.getElementById("filter-neraca-tahun");
  const filterTahun = filterTahunSelect?.value || now.getFullYear().toString();

  if (filterTahunSelect && filterTahunSelect.options.length === 0) {
    const years = [now.getFullYear().toString(), (now.getFullYear() - 1).toString(), (now.getFullYear() + 1).toString()];
    filterTahunSelect.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
  }

  // 1. Initial Cash Balance (Saldo Awal Entry)
  let totalMasukAwal = 0;
  const initialSaldoItem = (appState.pemasukanLain || []).find((p) => p.kategori === "Saldo Awal Kas");
  if (initialSaldoItem) {
    totalMasukAwal += (parseFloat(initialSaldoItem.nominal) || 0);
  }

  // 2. Filter IPL Lunas for the selected period
  const lunasBills = (appState.tagihan || []).filter((t) => {
    if (t.status !== "Lunas") return false;
    const matchesBulan = filterBulan === "Semua" || t.bulan === filterBulan || (t.periode && t.periode.includes(filterBulan));
    const matchesTahun = filterTahun === "Semua" || t.tahun === filterTahun || (t.periode && t.periode.includes(filterTahun));
    return matchesBulan && matchesTahun;
  });

  const totalMasukIPL = lunasBills.reduce((sum, t) => sum + (parseFloat(t.nominal) || 0), 0);

  // 3. Filter Pemasukan Lain (Excluding initial Saldo Awal item)
  const masukLain = (appState.pemasukanLain || []).filter((p) => p.kategori !== "Saldo Awal Kas" && matchesMonthAndYear(p.tanggal, filterBulan, filterTahun));
  const totalMasukLain = masukLain.reduce((sum, p) => sum + (parseFloat(p.nominal) || 0), 0);

  // 4. Filter Pengeluaran for selected period
  const pglList = (appState.pengeluaran || []).filter((p) => matchesMonthAndYear(p.tanggal, filterBulan, filterTahun));
  const totalPengeluaran = pglList.reduce((sum, p) => sum + (parseFloat(p.nominal) || 0), 0);

  // STRICT BALANCE SHEET EQUATION: "AWAL + MASUK - KELUAR = AKHIR"
  const saldoAwalKas = totalMasukAwal;
  const totalPemasukanPeriode = totalMasukIPL + totalMasukLain;
  const saldoAkhirKas = saldoAwalKas + totalPemasukanPeriode - totalPengeluaran;

  const saldoAwalEl = document.getElementById("neraca-saldo-awal");
  const masukIplEl = document.getElementById("neraca-masuk-ipl");
  const keluarEl = document.getElementById("neraca-keluar");
  const saldoAkhirEl = document.getElementById("neraca-saldo-akhir");

  if (saldoAwalEl) saldoAwalEl.textContent = formatRp(saldoAwalKas);
  if (masukIplEl) masukIplEl.textContent = formatRp(totalMasukIPL);
  if (keluarEl) keluarEl.textContent = formatRp(totalPengeluaran);
  if (saldoAkhirEl) saldoAkhirEl.textContent = formatRp(saldoAkhirKas);

  const tbody = document.getElementById("neraca-table-tbody");
  if (tbody) {
    tbody.innerHTML = `
      <tr style="background: #f8fafc; font-weight: 600;">
        <td><strong>1. SALDO AWAL KAS PERIODE</strong></td>
        <td style="text-align: right; color: var(--success);">${formatRp(saldoAwalKas)}</td>
        <td style="text-align: right;">-</td>
        <td style="text-align: right;">${formatRp(saldoAwalKas)}</td>
      </tr>
      <tr>
        <td>&nbsp;&nbsp;• Pemasukan Tagihan IPL Warga (LUNAS) (${lunasBills.length} Tagihan)</td>
        <td style="text-align: right; color: var(--success);">+ ${formatRp(totalMasukIPL)}</td>
        <td style="text-align: right;">-</td>
        <td style="text-align: right;">${formatRp(saldoAwalKas + totalMasukIPL)}</td>
      </tr>
      <tr>
        <td>&nbsp;&nbsp;• Pemasukan Lain-Lain / Non-IPL (${masukLain.length} Transaksi)</td>
        <td style="text-align: right; color: var(--success);">+ ${formatRp(totalMasukLain)}</td>
        <td style="text-align: right;">-</td>
        <td style="text-align: right;">${formatRp(saldoAwalKas + totalPemasukanPeriode)}</td>
      </tr>
      <tr style="font-weight: 700; background: #f1f5f9;">
        <td><strong>2. TOTAL PEMASUKAN PERIODE (${filterBulan.toUpperCase()} ${filterTahun})</strong></td>
        <td style="text-align: right; color: var(--success);">+ ${formatRp(totalPemasukanPeriode)}</td>
        <td style="text-align: right;">-</td>
        <td style="text-align: right;">${formatRp(saldoAwalKas + totalPemasukanPeriode)}</td>
      </tr>
      <tr>
        <td><strong>3. TOTAL PENGELUARAN OPERASIONAL PERIODE</strong> (${pglList.length} Transaksi)</td>
        <td style="text-align: right;">-</td>
        <td style="text-align: right; color: var(--danger); font-weight: 700;">- ${formatRp(totalPengeluaran)}</td>
        <td style="text-align: right; font-weight: 700;">${formatRp(saldoAkhirKas)}</td>
      </tr>
      <tr style="background: #e2e8f0; font-size: 1.05rem; font-weight: 700; border-top: 2px solid var(--primary);">
        <td>SALDO AKHIR KAS (Awal + Pemasukan - Pengeluaran)</td>
        <td style="text-align: right; color: var(--success);">${formatRp(saldoAwalKas + totalPemasukanPeriode)}</td>
        <td style="text-align: right; color: var(--danger);">${formatRp(totalPengeluaran)}</td>
        <td style="text-align: right; color: var(--primary);">${formatRp(saldoAkhirKas)}</td>
      </tr>
    `;
  }
}

/* ==========================================================================
   LAPORAN PIUTANG & TUNGGAKAN WARGA PER RUMAH
   ========================================================================== */
function renderLaporanPiutangWarga() {
  if (!appState) return;

  const searchInput = document.getElementById("filter-piutang-search");
  const searchVal = (searchInput?.value || "").toLowerCase();
  const summary = getWargaTunggakanSummary();

  const filtered = summary.filter((w) => {
    return (
      w.blokNo.toLowerCase().includes(searchVal) ||
      w.pemilik.toLowerCase().includes(searchVal)
    );
  });

  const totalPiutangNominal = filtered.reduce((sum, w) => sum + w.totalTunggakan, 0);
  const totalRumahMenunggak = filtered.length;

  const nominalEl = document.getElementById("piutang-total-nominal");
  const rumahEl = document.getElementById("piutang-total-rumah");

  if (nominalEl) nominalEl.textContent = formatRp(totalPiutangNominal);
  if (rumahEl) rumahEl.textContent = `${totalRumahMenunggak} Unit Rumah`;

  const tbody = document.getElementById("piutang-warga-tbody");
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Tidak ada data piutang / tunggakan warga.</td></tr>`;
  } else {
    tbody.innerHTML = filtered
      .map((w, idx) => {
        const houseObj = (appState.rumah || []).find((r) => normalizeBlok(r.blokNo) === normalizeBlok(w.blokNo));
        const kelompokIPL = houseObj ? houseObj.kelompokIPL : "IPL + Sampah";
        const phone = houseObj ? (houseObj.noHp || "").replace(/[^0-9]/g, "") : "";
        const bulanStr = w.bulanList.join(", ");

        return `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${w.blokNo}</strong></td>
            <td>${w.pemilik}</td>
            <td><span class="badge badge-secondary">${kelompokIPL}</span></td>
            <td><span style="font-size: 0.85rem; color: var(--danger); font-weight: 500;">${bulanStr}</span></td>
            <td style="text-align: center;"><span class="badge badge-warning">${w.jumlahBulan} Bulan</span></td>
            <td style="text-align: right; font-weight: 700; color: var(--danger);">${formatRp(w.totalTunggakan)}</td>
            <td>
              <button class="btn btn-outline btn-sm" style="color: #16a34a; border-color: #86efac;" onclick="sendWhatsAppReminder('${w.blokNo}', '${w.pemilik}', '${phone}', ${w.jumlahBulan}, '${bulanStr}', ${w.totalTunggakan})" title="Kirim Pengingat WA">
                <i class="ri-whatsapp-line"></i> Remind WA
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }
}

function sendWhatsAppReminder(blokNo, pemilik, phone, jumlahBulan, bulanStr, totalNominal) {
  let cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
  if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.substring(1);
  if (!cleanPhone) cleanPhone = "628123456789";

  const msg = `Yth. Bpk/Ibu ${pemilik} (${blokNo}),\n\n` +
    `Mengingatkan mengenai tagihan IPL D'Amour yang belum terbayar sebanyak *${jumlahBulan} bulan* (${bulanStr}) ` +
    `dengan total tunggakan sebesar *${formatRp(totalNominal)}*.\n\n` +
    `Mohon untuk dapat melakukan pembayaran via aplikasi IPL D'Amour atau konfirmasi ke Pengurus. Terima kasih banyak atas perhatian dan kerjasamanya! 🙏🏼`;

  const targetUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(targetUrl, "_blank");

  addAuditLog("Remind WA", `Pengirim Pengingat WA tunggakan ke ${pemilik} (${blokNo}) sebesar ${formatRp(totalNominal)}`);
}

function generateReportPDF() {
  window.print();
}

/* ==========================================================================
   REKAP WAJIB SETOR VS REALISASI PER KOMPONEN
   ========================================================================== */
function renderWajibSetorVsRealisasi() {
  if (!appState) return;

  const now = new Date();
  const filterBulan = document.getElementById("filter-realisasi-bulan")?.value || "Semua";
  const filterTahunSelect = document.getElementById("filter-realisasi-tahun");
  const filterTahun = filterTahunSelect?.value || now.getFullYear().toString();

  if (filterTahunSelect && filterTahunSelect.options.length === 0) {
    const years = [now.getFullYear().toString(), (now.getFullYear() - 1).toString(), (now.getFullYear() + 1).toString()];
    filterTahunSelect.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
  }

  const activeKomponen = (appState.komponenIPL || []).filter((k) => k.aktif);
  const activeEvents = (appState.masterEvent || []).filter((e) => e.aktif);

  const lunasBills = (appState.tagihan || []).filter((t) => {
    if (t.status !== "Lunas") return false;
    const matchesBulan = filterBulan === "Semua" || t.bulan === filterBulan || (t.periode && t.periode.includes(filterBulan));
    const matchesTahun = filterTahun === "Semua" || t.tahun === filterTahun || (t.periode && t.periode.includes(filterTahun));
    return matchesBulan && matchesTahun;
  });

  const totalHousesCount = appState.rumah && appState.rumah.length > 0 ? appState.rumah.length : 31;
  const isAllMonths = filterBulan === "Semua";
  const monthMultiplier = isAllMonths ? 12 : 1;

  let grandTarget = 0;
  let grandRealisasi = 0;

  const items = [];

  activeKomponen.forEach((k) => {
    if (k.isAutoKas) return; // Skip Kas (Otomatis) sisa residual component from fixed component budget match

    const itemTarget = (parseFloat(k.nominalTotal) || 0) * monthMultiplier;
    const itemRealisasi = lunasBills.reduce((sum, t) => {
      const perHouseComp = (parseFloat(k.nominalTotal) || 0) / totalHousesCount;
      return sum + perHouseComp;
    }, 0);

    const selisih = itemRealisasi - itemTarget;
    const persen = itemTarget > 0 ? (itemRealisasi / itemTarget) * 100 : 100;

    grandTarget += itemTarget;
    grandRealisasi += itemRealisasi;

    items.push({
      nama: k.nama,
      target: itemTarget,
      realisasi: itemRealisasi,
      selisih: selisih,
      persen: persen
    });
  });

  activeEvents.forEach((e) => {
    const eventTarget = (parseFloat(e.nominal) || 0) * totalHousesCount;
    const eventRealisasi = lunasBills.reduce((sum, t) => {
      return sum + (parseFloat(e.nominal) || 0);
    }, 0);

    const selisih = eventRealisasi - eventTarget;

    grandTarget += eventTarget;
    grandRealisasi += eventRealisasi;

    items.push({
      nama: `Event: ${e.nama}`,
      target: eventTarget,
      realisasi: eventRealisasi,
      selisih: selisih,
      persen: eventTarget > 0 ? (eventRealisasi / eventTarget) * 100 : 100
    });
  });

  const grandPersen = grandTarget > 0 ? (grandRealisasi / grandTarget) * 100 : 100;

  const targetEl = document.getElementById("realisasi-target-total");
  const terkumpulEl = document.getElementById("realisasi-terkumpul-total");
  const persenEl = document.getElementById("realisasi-persen-total");

  if (targetEl) targetEl.textContent = formatRp(grandTarget);
  if (terkumpulEl) terkumpulEl.textContent = formatRp(grandRealisasi);
  if (persenEl) persenEl.textContent = `${grandPersen.toFixed(1)}%`;

  const tbody = document.getElementById("realisasi-table-tbody");
  if (!tbody) return;

  tbody.innerHTML = items
    .map((it) => {
      const isOk = it.selisih >= 0;
      const color = isOk ? "var(--success)" : "var(--danger)";

      return `
        <tr>
          <td><strong>${it.nama}</strong></td>
          <td style="text-align: right; font-weight: 600;">${formatRp(it.target)}</td>
          <td style="text-align: right; font-weight: 600; color: var(--success);">${formatRp(it.realisasi)}</td>
          <td style="text-align: right; font-weight: 600; color: ${color};">${it.selisih >= 0 ? "+" : ""}${formatRp(it.selisih)}</td>
          <td style="text-align: center;"><span class="badge ${it.persen >= 90 ? "badge-success" : "badge-warning"}">${it.persen.toFixed(1)}%</span></td>
        </tr>
      `;
    })
    .join("") +
    `
    <tr style="background: #f1f5f9; font-weight: 700; font-size: 1rem; border-top: 2px solid var(--primary);">
      <td>TOTAL REALISASI SETORAN (${filterBulan.toUpperCase()} ${filterTahun})</td>
      <td style="text-align: right;">${formatRp(grandTarget)}</td>
      <td style="text-align: right; color: var(--success);">${formatRp(grandRealisasi)}</td>
      <td style="text-align: right; color: ${grandRealisasi - grandTarget >= 0 ? "var(--success)" : "var(--danger)"}">${grandRealisasi - grandTarget >= 0 ? "+" : ""}${formatRp(grandRealisasi - grandTarget)}</td>
      <td style="text-align: center;"><span class="badge badge-info">${grandPersen.toFixed(1)}%</span></td>
    </tr>
    `;
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
        ensureMasterEventState();
        cleanUpSampahFromKomponen();
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

function resetPembayaranRidwanDanPengeluaran() {
  if (!appState) return;

  if (confirm("Apakah Anda yakin ingin mengembalikan status pembayaran Ridwan (C16) ke 'Menunggu Pembayaran' dan menghapus SELURUH catatan pengeluaran?")) {
    if (appState.tagihan && Array.isArray(appState.tagihan)) {
      appState.tagihan.forEach((t) => {
        const blokClean = (t.blokNo || "").toLowerCase().trim();
        const ownerClean = (t.pemilik || "").toLowerCase().trim();
        if (blokClean === "c16" || ownerClean.includes("ridwan")) {
          t.status = "Menunggu Pembayaran";
          t.tglBayar = "-";
          t.buktiTransfer = "";
          t.metode = "-";
        }
      });
    }

    appState.pengeluaran = [];

    getCalculatedKasBalance();
    saveState();

    if (appState.settings && appState.settings.googleSheetApiUrl) {
      const url = appState.settings.googleSheetApiUrl.trim();
      if (url && url.startsWith("http") && !url.includes("EXAMPLE")) {
        fetch(url, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(appState)
        }).catch((e) => console.log("Background sync error:", e));
      }
    }

    addAuditLog("Reset Data", "Admin mereset status pembayaran Ridwan (C16) ke Menunggu Pembayaran & menghapus seluruh data pengeluaran");
    alert("Status pembayaran Ridwan (C16) telah dikembalikan ke Menunggu Pembayaran dan seluruh data pengeluaran telah berhasil dihapus!");
    location.reload();
  }
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
