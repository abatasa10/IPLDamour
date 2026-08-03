/**
 * GOOGLE APPS SCRIPT DATABASE ENDPOINT FOR D'AMOUR SISTEM IPL
 * 
 * SINKRONISASI 100% REAL-TIME DENGAN GOOGLE SPREADSHEET
 * Menyiapkan sheet otomatis untuk:
 * 1. Rumah (Master Unit Warga)
 * 2. Tagihan (Riwayat Tagihan & Pembayaran Warga)
 * 3. Pengeluaran (Riwayat Biaya Operasional, Satpam, dll.)
 * 4. PemasukanLain (Bunga Bank, Donasi, dll.)
 * 5. Komponen (Rincian Komponen Biaya IPL)
 * 6. Event (Master Event & Biaya Tambahan)
 * 7. Users (Data Akun & Hak Akses Warga/Admin)
 * 
 * CARA PENGGUNAAN MEMASANG KE GOOGLE SPREADSHEET:
 * 1. Buka Google Spreadsheet Anda (https://docs.google.com/spreadsheets/d/1c1y4wD7hhBDfmJdtmINf2dka7bduuz0i_l1TNYtll_4/edit)
 * 2. Klik menu Extensi -> Apps Script
 * 3. Hapus semua kode bawaan, lalu paste (tempel) SELURUH KODE DI BAWAH INI.
 * 4. Klik "Simpan" (Ctrl+S / Cmd+S).
 * 5. Klik "Terapkan" (Deploy) -> "Peluncuran Baru" (New Deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web App).
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Yang memiliki akses: "Siapa Saja" (Anyone)
 * 7. Klik "Terapkan", lalu Salin URL Web App yang dihasilkan.
 * 8. Tempelkan URL tersebut di menu "Pengaturan Sistem" aplikasi IPL D'AMOUR.
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
    
    result = {
      status: "success",
      rumah: getSheetData(rumahSheet),
      tagihan: getSheetData(tagihanSheet),
      pengeluaran: getSheetData(pengeluaranSheet),
      pemasukanLain: getSheetData(pemasukanLainSheet),
      komponenIPL: getSheetData(komponenSheet),
      masterEvent: getSheetData(eventSheet),
      users: getSheetData(usersSheet)
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
      updateSheetData(ss.getSheetByName("Rumah") || createRumahSheet(ss), contents.rumah);
    }
    if (contents.tagihan) {
      updateSheetData(ss.getSheetByName("Tagihan") || createTagihanSheet(ss), contents.tagihan);
    }
    if (contents.pengeluaran) {
      updateSheetData(ss.getSheetByName("Pengeluaran") || createPengeluaranSheet(ss), contents.pengeluaran);
    }
    if (contents.pemasukanLain) {
      updateSheetData(ss.getSheetByName("PemasukanLain") || createPemasukanLainSheet(ss), contents.pemasukanLain);
    }
    if (contents.komponenIPL) {
      updateSheetData(ss.getSheetByName("Komponen") || createKomponenSheet(ss), contents.komponenIPL);
    }
    if (contents.masterEvent) {
      updateSheetData(ss.getSheetByName("Event") || createEventSheet(ss), contents.masterEvent);
    }
    if (contents.users) {
      updateSheetData(ss.getSheetByName("Users") || createUsersSheet(ss), contents.users);
    }
    
    result = { status: "success", message: "Seluruh data pembiayaan & transaksi berhasil disimpan ke Google Spreadsheet!" };
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}

function updateSheetData(sheet, dataArray) {
  if (!dataArray || dataArray.length === 0) return;
  sheet.clear();
  var headers = Object.keys(dataArray[0]);
  sheet.appendRow(headers);
  
  dataArray.forEach(function(item) {
    var row = headers.map(function(key) {
      var val = item[key];
      if (typeof val === "object" && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });
    sheet.appendRow(row);
  });
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
