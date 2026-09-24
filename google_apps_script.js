/**
 * GOOGLE APPS SCRIPT DATABASE ENDPOINT FOR D'AMOUR SISTEM IPL
 * 
 * SINKRONISASI 100% REAL-TIME DENGAN PEMBERSIH DUPLIKAT OTOMATIS
 * 
 * CARA PENGGUNAAN:
 * 1. Buka Google Spreadsheet Anda (https://docs.google.com/spreadsheets/d/1c1y4wD7hhBDfmJdtmINf2dka7bduuz0i_l1TNYtll_4/edit)
 * 2. Klik menu Ekstensi -> Apps Script
 * 3. Hapus semua kode lama di editor Apps Script, lalu paste (tempel) SELURUH KODE DI BAWAH INI.
 * 4. Klik "Simpan" (Ctrl+S / Cmd+S).
 * 5. Klik "Terapkan" (Deploy) -> "Kelola Penerapan" (Manage Deployments).
 * 6. Klik ikon Pensil (Edit) pada penerapan aktif -> pilih "Versi Baru" (New Version) -> Klik "Terapkan" (Deploy).
 *    (Atau klik "Terapkan Baru" -> Web app -> Akses: "Siapa Saja / Anyone").
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};
  
  try {
    var rumahSheet = ss.getSheetByName("Rumah") || createRumahSheet(ss);
    var tagihanSheet = ss.getSheetByName("Tagihan") || createTagihanSheet(ss);
    var pengeluaranSheet = ss.getSheetByName("Pengeluaran") || createPengeluaranSheet(ss);
    var pemasukanLainSheet = ss.getSheetByName("PemasukanLain") || createPemasukanLainSheet(ss);
    var komponenSheet = ss.getSheetByName("Komponen") || createKomponenSheet(ss);
    var eventSheet = ss.getSheetByName("Event") || createEventSheet(ss);
    var usersSheet = ss.getSheetByName("Users") || createUsersSheet(ss);
    var auditSheet = ss.getSheetByName("AuditLog") || createAuditLogSheet(ss);
    var ringkasanSheet = ss.getSheetByName("RingkasanKas") || createRingkasanKasSheet(ss);
    var targetSheet = ss.getSheetByName("TargetIPL") || createTargetIPLSheet(ss);
    
    result = {
      status: "success",
      rumah: getSheetData(rumahSheet, "blokNo"),
      tagihan: getSheetData(tagihanSheet, "id"),
      pengeluaran: getSheetData(pengeluaranSheet, "id"),
      pemasukanLain: getSheetData(pemasukanLainSheet, "id"),
      komponenIPL: getSheetData(komponenSheet, "id"),
      masterEvent: getSheetData(eventSheet, "id"),
      users: getSheetData(usersSheet, "username"),
      auditLog: getSheetData(auditSheet, "id"),
      ringkasanKas: getRingkasanKasData(ringkasanSheet),
      targetIPL: getSheetData(targetSheet, "id")
    };
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result = {};
  try {
    var raw = "";
    if (e && e.postData && e.postData.contents) {
      raw = e.postData.contents;
    } else if (e && e.parameter && e.parameter.data) {
      raw = e.parameter.data;
    }

    var contents = typeof raw === "string" ? JSON.parse(raw) : (raw || {});
    // forceReplace = sinkronisasi penuh ADMIn (mis. "Simpan & Sinkronkan Sekarang").
    // Semua sync otomatis (unggah warga / perangkat lama) TIDAK punya flag ini,
    // sehingga server hanya melakukan UPSERT:
    //   - tidak pernah menghapus baris yang tidak dikirim
    //   - status tagihan TIDAK bisa mundur (Lunas/Verifikasi tidak bisa jadi Belum Bayar)
    var forceReplace = contents.forceReplace === true;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    function sheetOpts() {
      return { replaceAllowed: forceReplace, statusForwardOnly: !forceReplace };
    }

    if (contents.rumah && Array.isArray(contents.rumah) && contents.rumah.length > 0) {
      updateSheetData(ss.getSheetByName("Rumah") || createRumahSheet(ss), contents.rumah, "blokNo", ["id", "blokNo", "pemilik", "noHp", "status", "kelompokIPL"], sheetOpts());
    }
    if (contents.tagihan && Array.isArray(contents.tagihan) && contents.tagihan.length > 0) {
      updateSheetData(ss.getSheetByName("Tagihan") || createTagihanSheet(ss), contents.tagihan, "id", ["id", "periode", "bulan", "tahun", "rumahId", "blokNo", "pemilik", "kelompokIPL", "nominal", "jumlahDibayar", "potonganDeposit", "status", "tglBayar", "metode", "buktiTransfer", "rincianItems", "catatanKhusus"], sheetOpts());
    }
    if (contents.pengeluaran && Array.isArray(contents.pengeluaran)) {
      if (contents.pengeluaran.length > 0 || (contents.allowEmptyPengeluaran === true && forceReplace)) {
        updateSheetData(ss.getSheetByName("Pengeluaran") || createPengeluaranSheet(ss), contents.pengeluaran, "id", ["id", "tanggal", "kategori", "penerima", "keterangan", "nominal"], sheetOpts());
      }
    }
    if (contents.pemasukanLain && Array.isArray(contents.pemasukanLain)) {
      if (contents.pemasukanLain.length > 0 || (contents.allowEmptyPemasukanLain === true && forceReplace)) {
        updateSheetData(ss.getSheetByName("PemasukanLain") || createPemasukanLainSheet(ss), contents.pemasukanLain, "id", ["id", "tanggal", "kategori", "penerima", "keterangan", "nominal"], sheetOpts());
      }
    }
    if (contents.komponenIPL && Array.isArray(contents.komponenIPL) && contents.komponenIPL.length > 0) {
      updateSheetData(ss.getSheetByName("Komponen") || createKomponenSheet(ss), contents.komponenIPL, "id", ["id", "nama", "nominalTotal", "isAutoKas", "dibayarOleh", "aktif"], sheetOpts());
    }
    if (contents.masterEvent && Array.isArray(contents.masterEvent) && contents.masterEvent.length > 0) {
      updateSheetData(ss.getSheetByName("Event") || createEventSheet(ss), contents.masterEvent, "id", ["id", "nama", "nominal", "dibayarOleh", "aktif"], sheetOpts());
    }
    if (contents.users && Array.isArray(contents.users) && contents.users.length > 0) {
      updateSheetData(ss.getSheetByName("Users") || createUsersSheet(ss), contents.users, "username", ["username", "password", "name", "blokNo", "role", "avatar", "mustChangePassword"], sheetOpts());
    }
    if (contents.auditLog && Array.isArray(contents.auditLog) && contents.auditLog.length > 0) {
      // Log aktivitas TIDAK PERNAH dihapus oleh sinkronisasi (hanya di-upsert/ditambah)
      updateSheetData(ss.getSheetByName("AuditLog") || createAuditLogSheet(ss), contents.auditLog, "id", ["id", "timestamp", "actor", "action", "detail"], { replaceAllowed: false, statusForwardOnly: false });
    }
    if (contents.targetIPL && Array.isArray(contents.targetIPL) && contents.targetIPL.length > 0) {
      updateSheetData(ss.getSheetByName("TargetIPL") || createTargetIPLSheet(ss), contents.targetIPL, "id", ["id", "kelompok", "target", "keterangan"], sheetOpts());
    }

    // KAS DIHITUNG OLEH SERVER dari data di sheet (sumber utama),
    // BUKAN dari angka yang dikirim klien — mencegah perangkat lama menimpa angka kas.
    var kasComputed = computeRingkasanKas(ss);
    updateRingkasanKasSheet(ss.getSheetByName("RingkasanKas") || createRingkasanKasSheet(ss), kasComputed);

    result = {
      status: "success",
      message: "Data Google Spreadsheet berhasil disinkronkan secara real-time!",
      ringkasanKas: kasComputed
    };
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeBlokGS(b) {
  if (!b) return "";
  return String(b).trim().toUpperCase().replace(/^([A-Z]+)0+(\d+)$/, "$1$2");
}

function getSheetData(sheet, keyField) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = [];
  var seenKeys = {};

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j];
      var val = data[i][j];
      
      // Auto-parse JSON string values
      if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
        try {
          val = JSON.parse(val);
        } catch (e) {}
      }
      obj[headerName] = val;
    }
    
    var rawKey = keyField ? obj[keyField] : (obj.id || obj.username || obj.blokNo);
    var key = keyField === "blokNo" ? normalizeBlokGS(rawKey) : String(rawKey).trim().toLowerCase();

    if (keyField === "blokNo" && obj.blokNo) {
      obj.blokNo = normalizeBlokGS(obj.blokNo);
    }

    if (key && !seenKeys[key]) {
      seenKeys[key] = true;
      rows.push(obj);
    }
  }
  return rows;
}

function statusRankTagihan(s) {
  var table = { "Menunggu Pembayaran": 1, "Menunggak": 2, "Menunggu Verifikasi": 3, "Lunas": 4 };
  var v = table[String(s || "").trim()];
  return v === undefined ? 0 : v;
}

function keyOfRow(row, keyField) {
  if (!row) return "";
  var rawKey = keyField ? row[keyField] : (row.id || row.username || row.blokNo);
  if (rawKey === undefined || rawKey === null) return "";
  if (keyField === "blokNo") return normalizeBlokGS(rawKey);
  return String(rawKey).trim().toLowerCase();
}

function mergeRows(base, overlay) {
  var out = {};
  if (base && typeof base === "object") { for (var k in base) { if (base.hasOwnProperty(k)) out[k] = base[k]; } }
  if (overlay && typeof overlay === "object") { for (var k2 in overlay) { if (overlay.hasOwnProperty(k2)) out[k2] = overlay[k2]; } }
  return out;
}

function isPaidishStatus(s) {
  s = String(s || "").trim();
  return s === "Lunas" || s === "Menunggu Verifikasi";
}

function isPrepaidMethod(m) {
  m = String(m || "").trim();
  return m === "Sudah Bayar Sblm Sistem" || m === "Saldo Lebih Bayar";
}

// PROTEKSI KAS #2: baris tagihan yang SUDAH Lunas/Menunggu Verifikasi tahan-banting
// terhadap auto-sync/perangkat lama. Kiriman biasa tidak boleh:
//   - mengubah Metode normal jadi "Sudah Bayar Sblm Sistem"/"Saldo Lebih Bayar" (kas turun)
//   - mengosongkan jumlahDibayar yang sudah terisi
//   - menimpa tglBayar jadi penanda prepaid ("Sudah Lunas..."/"Lebih Bayar Bulan Lalu")
//   - me-nol-kan nominal yang sudah ada
// Hanya sinkronisasi admin penuh (forceReplace) yang diperbolehkan mengubah hal ini.
function protectCashFields(merged, existingRow, incoming) {
  var exMet = String(existingRow.metode || "");
  var inMet = String(incoming.metode || "");
  if (isPrepaidMethod(inMet) && !isPrepaidMethod(exMet)) {
    merged.metode = existingRow.metode;
  }
  if (existingRow.jumlahDibayar !== undefined && existingRow.jumlahDibayar !== null &&
      existingRow.jumlahDibayar !== "" && money(existingRow.jumlahDibayar) > 0) {
    var incVal = incoming.jumlahDibayar;
    if (incVal === undefined || incVal === null || incVal === "" ||
        money(incVal) < money(existingRow.jumlahDibayar)) {
      // pembayaran yang sudah tercatat TIDAK boleh menyusut/terhapus oleh auto-sync
      merged.jumlahDibayar = existingRow.jumlahDibayar;
    }
  }
  var exTgl = String(existingRow.tglBayar || "");
  var inTgl = String(incoming.tglBayar || "");
  if ((inTgl.indexOf("Sudah Lunas") !== -1 || inTgl.indexOf("Lebih Bayar Bulan Lalu") !== -1) &&
      exTgl.indexOf("Sudah Lunas") === -1 && exTgl.indexOf("Lebih Bayar Bulan Lalu") === -1) {
    merged.tglBayar = existingRow.tglBayar;
  }
  if (existingRow.nominal !== undefined && existingRow.nominal !== null &&
      money(existingRow.nominal) > 0 && money(incoming.nominal) < money(existingRow.nominal)) {
    merged.nominal = existingRow.nominal;
  }
}

function updateSheetData(sheet, dataArray, keyField, defaultHeaders, opts) {
  if (!sheet) return;
  opts = opts || {};
  var replaceAllowed = opts.replaceAllowed === true;
  var statusForwardOnly = opts.statusForwardOnly === true;
  var isTagihan = keyField === "id" && sheet.getName() === "Tagihan";
  var useStatusGuard = statusForwardOnly && isTagihan;

  if (!dataArray || !Array.isArray(dataArray)) dataArray = [];

  // Dedupe payload masuk berdasarkan kunci unik
  var cleanArray = [];
  var seenKeys = {};
  dataArray.forEach(function (item) {
    if (!item) return;
    if (keyField === "blokNo" && item.blokNo) item.blokNo = normalizeBlokGS(item.blokNo);
    var key = keyOfRow(item, keyField);
    if (key && !seenKeys[key]) { seenKeys[key] = true; cleanArray.push(item); }
  });

  var existing = getSheetData(sheet, keyField);

  // Gabungkan: mulai dari semua baris yang ADA di sheet, lalu timpa dengan payload masuk.
  // Baris yang TIDAK dikirim tetap dipertahankan (TIDAK dihapus otomatis).
  var finalByKey = {};
  var order = [];
  var seenOrder = {};

  existing.forEach(function (row) {
    var key = keyOfRow(row, keyField);
    if (key && !seenOrder[key]) { seenOrder[key] = true; order.push(key); }
    if (key) finalByKey[key] = row;
  });

  var incomingKeys = {};
  var blockedKeys = {};

  cleanArray.forEach(function (item) {
    var key = keyOfRow(item, keyField);
    if (!key) return;
    incomingKeys[key] = true;
    var cur = finalByKey[key];
    // PROTEKSI KAS #1: status tagihan TIDAK BOLEH MUNDUR.
    // Kiriman lama/otomatis tidak bisa mengubah Lunas/Verifikasi kembali jadi Belum Bayar.
    if (cur && useStatusGuard && statusRankTagihan(item.status) < statusRankTagihan(cur.status)) {
      blockedKeys[key] = true;
      return; // pertahankan baris existing apa adanya
    }
    var merged = cur ? mergeRows(cur, item) : mergeRows(null, item);
    // PROTEKSI KAS #2: baris yang sudah Lunas/Verifikasi tahan-banting utk auto-sync
    if (useStatusGuard && cur && isPaidishStatus(cur.status)) {
      protectCashFields(merged, cur, item);
    }
    finalByKey[key] = merged;
    if (!seenOrder[key]) { seenOrder[key] = true; order.push(key); }
  });

  var finalRows = [];
  if (replaceAllowed) {
    // Sinkronisasi admin penuh: baris yang TIDAK dikirim & tidak diblokir = dihapus
    order.forEach(function (key) {
      if (incomingKeys[key] || blockedKeys[key]) finalRows.push(finalByKey[key]);
    });
  } else {
    order.forEach(function (key) { finalRows.push(finalByKey[key]); });
  }

  // Tulis ulang sheet dengan kolom union
  var headerMap = {};
  var headers = [];
  function addHeader(h) {
    if (!headerMap[h]) { headerMap[h] = true; headers.push(h); }
  }
  if (defaultHeaders && Array.isArray(defaultHeaders)) {
    defaultHeaders.forEach(addHeader);
  }
  finalRows.forEach(function (row) {
    for (var k in row) { if (row.hasOwnProperty(k)) addHeader(k); }
  });

  sheet.clear();
  if (finalRows.length === 0) {
    if (headers.length > 0) sheet.appendRow(headers);
    return;
  }

  sheet.appendRow(headers);

  var rowsToAppend = finalRows.map(function (row) {
    return headers.map(function (key) {
      var val = row[key];
      if (val === undefined || val === null) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return val;
    });
  });

  sheet.getRange(2, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
}

function createRumahSheet(ss) {
  var sheet = ss.insertSheet("Rumah");
  sheet.appendRow(["id", "blokNo", "pemilik", "noHp", "status", "kelompokIPL"]);
  return sheet;
}

function createTagihanSheet(ss) {
  var sheet = ss.insertSheet("Tagihan");
  sheet.appendRow(["id", "periode", "bulan", "tahun", "rumahId", "blokNo", "pemilik", "kelompokIPL", "nominal", "jumlahDibayar", "potonganDeposit", "status", "tglBayar", "metode", "buktiTransfer", "rincianItems", "catatanKhusus"]);
  return sheet;
}

function createPengeluaranSheet(ss) {
  var sheet = ss.insertSheet("Pengeluaran");
  sheet.appendRow(["id", "tanggal", "kategori", "penerima", "keterangan", "nominal"]);
  return sheet;
}

function createPemasukanLainSheet(ss) {
  var sheet = ss.insertSheet("PemasukanLain");
  sheet.appendRow(["id", "tanggal", "kategori", "penerima", "keterangan", "nominal"]);
  return sheet;
}

function createKomponenSheet(ss) {
  var sheet = ss.insertSheet("Komponen");
  sheet.appendRow(["id", "nama", "nominalTotal", "isAutoKas", "dibayarOleh", "aktif"]);
  return sheet;
}

function createEventSheet(ss) {
  var sheet = ss.insertSheet("Event");
  sheet.appendRow(["id", "nama", "nominal", "dibayarOleh", "aktif"]);
  return sheet;
}

function createUsersSheet(ss) {
  var sheet = ss.insertSheet("Users");
  sheet.appendRow(["username", "password", "name", "blokNo", "role", "avatar", "mustChangePassword"]);
  return sheet;
}

function createAuditLogSheet(ss) {
  var sheet = ss.insertSheet("AuditLog");
  sheet.appendRow(["id", "timestamp", "actor", "action", "detail"]);
  return sheet;
}

function createRingkasanKasSheet(ss) {
  var sheet = ss.insertSheet("RingkasanKas");
  sheet.appendRow(["kasSaatIni", "masuk", "keluar", "selisih", "lastUpdated"]);
  return sheet;
}

function updateRingkasanKasSheet(sheet, kasData) {
  if (!kasData || typeof kasData !== "object") return;
  sheet.clear();
  sheet.appendRow(["kasSaatIni", "masuk", "keluar", "selisih", "lastUpdated"]);
  sheet.appendRow([
    kasData.kasSaatIni || 0,
    kasData.masuk || 0,
    kasData.keluar || 0,
    kasData.selisih || 0,
    new Date().toLocaleString("id-ID")
  ]);
}

function getRingkasanKasData(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;
  var row = data[1];
  return {
    kasSaatIni: Number(row[0]) || 0,
    masuk: Number(row[1]) || 0,
    keluar: Number(row[2]) || 0,
    selisih: Number(row[3]) || 0
  };
}

function money(v) {
  if (v === undefined || v === null || v === "") return 0;
  var n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

// Menghitung kas PERSIS sama dengan rumus di aplikasi (getCalculatedKasBalance):
//   masuk = (tagihan Lunas non-prepay, non-saldo-lebih) + pemasukanLain
//   keluar = pengeluaran
//   kas = masuk - keluar
function computeRingkasanKas(ss) {
  var tagihan = getSheetData(ss.getSheetByName("Tagihan") || createTagihanSheet(ss), "id");
  var pemasukanLain = getSheetData(ss.getSheetByName("PemasukanLain") || createPemasukanLainSheet(ss), "id");
  var pengeluaran = getSheetData(ss.getSheetByName("Pengeluaran") || createPengeluaranSheet(ss), "id");

  var masukIPL = 0;
  tagihan.forEach(function (t) {
    if (!t || t.status !== "Lunas") return;
    var metode = String(t.metode || "");
    if (metode === "Sudah Bayar Sblm Sistem" || metode === "Saldo Lebih Bayar") return;
    var tglStr = (t.tglBayar === undefined || t.tglBayar === null) ? "" : String(t.tglBayar);
    if (tglStr.indexOf("Sudah Lunas") !== -1 || tglStr.indexOf("Lebih Bayar Bulan Lalu") !== -1) return;
    if (t.jumlahDibayar !== undefined && t.jumlahDibayar !== null && t.jumlahDibayar !== "") {
      masukIPL += money(t.jumlahDibayar);
    } else {
      masukIPL += money(t.nominal);
    }
  });

  var masukLain = 0;
  pemasukanLain.forEach(function (p) { if (p) masukLain += money(p.nominal); });

  var keluar = 0;
  pengeluaran.forEach(function (p) { if (p) keluar += money(p.nominal); });

  var masuk = masukIPL + masukLain;
  var saldo = masuk - keluar;
  return { kasSaatIni: saldo, masuk: masuk, keluar: keluar, selisih: saldo };
}

function createTargetIPLSheet(ss) {
  var sheet = ss.insertSheet("TargetIPL");
  sheet.appendRow(["id", "kelompok", "target", "keterangan"]);
  return sheet;
}
