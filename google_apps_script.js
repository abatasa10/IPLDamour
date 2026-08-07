/**
 * GOOGLE APPS SCRIPT DATABASE ENDPOINT FOR D'AMOUR SISTEM IPL
 * 
 * SINKRONISASI 100% REAL-TIME DENGAN PEMBERSIH DUPLIKAT OTOMATIS
 * Menjamin Google Spreadsheet TIDAK AKAN PERNAH DUPLIKAT lagi.
 * 
 * CARA PENGGUNAAN:
 * 1. Buka Google Spreadsheet Anda (https://docs.google.com/spreadsheets/d/1c1y4wD7hhBDfmJdtmINf2dka7bduuz0i_l1TNYtll_4/edit)
 * 2. Klik menu Extensi -> Apps Script
 * 3. Hapus semua kode lama, lalu paste (tempel) SELURUH KODE DI BAWAH INI.
 * 4. Klik "Simpan" (Ctrl+S / Cmd+S).
 * 5. Klik "Terapkan" (Deploy) -> "Peluncuran Baru" (New Deployment).
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Yang memiliki akses: "Siapa Saja" (Anyone)
 * 6. Klik "Terapkan", lalu Salin URL Web App yang dihasilkan.
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
    var ringkasanSheet = ss.getSheetByName("RingkasanKas") || createRingkasanKasSheet(ss);
    
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
      ringkasanKas: getRingkasanKasData(ringkasanSheet)
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
    var contents = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (contents.rumah) {
      updateSheetData(ss.getSheetByName("Rumah") || createRumahSheet(ss), contents.rumah, "blokNo");
    }
    if (contents.tagihan) {
      updateSheetData(ss.getSheetByName("Tagihan") || createTagihanSheet(ss), contents.tagihan, "id");
    }
    if (contents.pengeluaran) {
      updateSheetData(ss.getSheetByName("Pengeluaran") || createPengeluaranSheet(ss), contents.pengeluaran, "id");
    }
    if (contents.pemasukanLain) {
      updateSheetData(ss.getSheetByName("PemasukanLain") || createPemasukanLainSheet(ss), contents.pemasukanLain, "id");
    }
    if (contents.komponenIPL) {
      updateSheetData(ss.getSheetByName("Komponen") || createKomponenSheet(ss), contents.komponenIPL, "id");
    }
    if (contents.masterEvent) {
      updateSheetData(ss.getSheetByName("Event") || createEventSheet(ss), contents.masterEvent, "id");
    }
    if (contents.users) {
      updateSheetData(ss.getSheetByName("Users") || createUsersSheet(ss), contents.users, "username");
    }
    if (contents.auditLog) {
      updateSheetData(ss.getSheetByName("AuditLog") || createAuditLogSheet(ss), contents.auditLog, "id");
    }
    if (contents.ringkasanKas) {
      updateRingkasanKasSheet(ss.getSheetByName("RingkasanKas") || createRingkasanKasSheet(ss), contents.ringkasanKas);
    }
    
    result = { status: "success", message: "Data Google Spreadsheet berhasil dibersihkan & disinkronkan tanpa duplikat!" };
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
      obj[headers[j]] = data[i][j];
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

function updateSheetData(sheet, dataArray, keyField) {
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

  var headers = Object.keys(cleanArray[0]);
  sheet.appendRow(headers);

  var rowsToAppend = cleanArray.map(function(item) {
    return headers.map(function(key) {
      var val = item[key];
      if (typeof val === "object" && val !== null) {
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
  sheet.appendRow(["id", "periode", "bulan", "tahun", "rumahId", "blokNo", "pemilik", "kelompokIPL", "nominal", "status", "tglBayar", "metode", "buktiTransfer"]);
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
