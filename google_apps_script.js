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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (contents.rumah && Array.isArray(contents.rumah)) {
      updateSheetData(ss.getSheetByName("Rumah") || createRumahSheet(ss), contents.rumah, "blokNo", ["id", "blokNo", "pemilik", "noHp", "status", "kelompokIPL"]);
    }
    if (contents.tagihan && Array.isArray(contents.tagihan)) {
      updateSheetData(ss.getSheetByName("Tagihan") || createTagihanSheet(ss), contents.tagihan, "id", ["id", "periode", "bulan", "tahun", "rumahId", "blokNo", "pemilik", "kelompokIPL", "nominal", "status", "tglBayar", "metode", "buktiTransfer", "rincianItems"]);
    }
    if (contents.pengeluaran && Array.isArray(contents.pengeluaran)) {
      updateSheetData(ss.getSheetByName("Pengeluaran") || createPengeluaranSheet(ss), contents.pengeluaran, "id", ["id", "tanggal", "kategori", "penerima", "keterangan", "nominal"]);
    }
    if (contents.pemasukanLain && Array.isArray(contents.pemasukanLain)) {
      updateSheetData(ss.getSheetByName("PemasukanLain") || createPemasukanLainSheet(ss), contents.pemasukanLain, "id", ["id", "tanggal", "kategori", "penerima", "keterangan", "nominal"]);
    }
    if (contents.komponenIPL && Array.isArray(contents.komponenIPL)) {
      updateSheetData(ss.getSheetByName("Komponen") || createKomponenSheet(ss), contents.komponenIPL, "id", ["id", "nama", "nominalTotal", "isAutoKas", "dibayarOleh", "aktif"]);
    }
    if (contents.masterEvent && Array.isArray(contents.masterEvent)) {
      updateSheetData(ss.getSheetByName("Event") || createEventSheet(ss), contents.masterEvent, "id", ["id", "nama", "nominal", "dibayarOleh", "aktif"]);
    }
    if (contents.users && Array.isArray(contents.users)) {
      updateSheetData(ss.getSheetByName("Users") || createUsersSheet(ss), contents.users, "username", ["username", "password", "name", "blokNo", "role", "avatar", "mustChangePassword"]);
    }
    if (contents.auditLog && Array.isArray(contents.auditLog)) {
      updateSheetData(ss.getSheetByName("AuditLog") || createAuditLogSheet(ss), contents.auditLog, "id", ["id", "timestamp", "actor", "action", "detail"]);
    }
    if (contents.ringkasanKas && typeof contents.ringkasanKas === "object") {
      updateRingkasanKasSheet(ss.getSheetByName("RingkasanKas") || createRingkasanKasSheet(ss), contents.ringkasanKas);
    }
    if (contents.targetIPL && Array.isArray(contents.targetIPL)) {
      updateSheetData(ss.getSheetByName("TargetIPL") || createTargetIPLSheet(ss), contents.targetIPL, "id", ["id", "kelompok", "target", "keterangan"]);
    }
    
    result = { status: "success", message: "Data Google Spreadsheet berhasil disinkronkan secara real-time!" };
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

function updateSheetData(sheet, dataArray, keyField, defaultHeaders) {
  if (!sheet) return;
  if (!dataArray || !Array.isArray(dataArray)) dataArray = [];
  
  var seenKeys = {};
  var cleanArray = [];
  
  dataArray.forEach(function(item) {
    if (!item) return;
    var rawKey = keyField ? item[keyField] : (item.id || item.username || item.blokNo);
    var key = keyField === "blokNo" ? normalizeBlokGS(rawKey) : String(rawKey).trim().toLowerCase();
    
    if (keyField === "blokNo" && item.blokNo) {
      item.blokNo = normalizeBlokGS(item.blokNo);
    }
    
    if (key && !seenKeys[key]) {
      seenKeys[key] = true;
      cleanArray.push(item);
    }
  });

  sheet.clear();
  if (cleanArray.length === 0) return;

  // Build complete union of headers
  var headerMap = {};
  var headers = [];
  
  if (defaultHeaders && Array.isArray(defaultHeaders)) {
    defaultHeaders.forEach(function(h) {
      if (!headerMap[h]) {
        headerMap[h] = true;
        headers.push(h);
      }
    });
  }

  cleanArray.forEach(function(item) {
    Object.keys(item).forEach(function(k) {
      if (!headerMap[k]) {
        headerMap[k] = true;
        headers.push(k);
      }
    });
  });

  sheet.appendRow(headers);

  var rowsToAppend = cleanArray.map(function(item) {
    return headers.map(function(key) {
      var val = item[key];
      if (val === undefined || val === null) {
        return "";
      }
      if (typeof val === "object") {
        return JSON.stringify(val);
      }
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
  sheet.appendRow(["id", "periode", "bulan", "tahun", "rumahId", "blokNo", "pemilik", "kelompokIPL", "nominal", "status", "tglBayar", "metode", "buktiTransfer", "rincianItems"]);
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

function createTargetIPLSheet(ss) {
  var sheet = ss.insertSheet("TargetIPL");
  sheet.appendRow(["id", "kelompok", "target", "keterangan"]);
  return sheet;
}
