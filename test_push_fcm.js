// Script untuk mengetes pengiriman notifikasi FCM langsung dari Node.js ke iPhone / HP
const fs = require("fs");
const crypto = require("crypto");

const saFile = "ipl-damour-firebase-adminsdk-fbsvc-529bbd26a1.json";
if (!fs.existsSync(saFile)) {
  console.error("File service account tidak ditemukan:", saFile);
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(saFile, "utf8"));
const GAS_URL = "https://script.google.com/macros/s/AKfycbyqvCo-t2FlFd49Kh2Cr3QeXj9YXvETX-33Z7Xiqs3KUcptd_xE1wT_Pfb_QTSkDdQ6yQ/exec";

function base64url(str) {
  return Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getFCMAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(header + "." + claimSet);
  const signature = base64url(sign.sign(sa.private_key));
  const jwt = header + "." + claimSet + "." + signature;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  const data = await res.json();
  return data.access_token;
}

async function sendPushToToken(accessToken, token, title, body) {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const payload = {
    message: {
      token: token,
      notification: {
        title: title,
        body: body
      },
      webpush: {
        notification: {
          title: title,
          body: body,
          icon: "https://abatasa10.github.io/IPLDamour/icons/icon-192.png",
          badge: "https://abatasa10.github.io/IPLDamour/icons/favicon-32x32.png",
          requireInteraction: false,
          vibrate: [200, 100, 200]
        },
        fcm_options: {
          link: "https://abatasa10.github.io/IPLDamour/"
        }
      }
    }
  };

  const res = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const resData = await res.text();
  return { status: res.status, data: resData };
}

async function main() {
  const targetToken = process.argv[2];
  const title = process.argv[3] || "🔔 Tes Notifikasi D'AMOUR IPL";
  const body = process.argv[4] || "Halo! Notifikasi pengingat IPL di HP iPhone Anda berhasil aktif! 🎉🏡";

  console.log("🔐 Mendapatkan OAuth Access Token Firebase...");
  const token = await getFCMAccessToken();
  if (!token) {
    console.error("❌ Gagal mendapatkan token FCM.");
    return;
  }
  console.log("✅ Berhasil mendapatkan Access Token.");

  if (targetToken) {
    console.log("📲 Mengirim notifikasi ke token target...");
    const res = await sendPushToToken(token, targetToken, title, body);
    console.log("Status kirim:", res.status);
    console.log("Response:", res.data);
    return;
  }

  // Jika tidak ada token yang di-pass, coba panggil GAS action=getTokens atau action=testPush
  console.log("🔍 Mengecek subscriber terdaftar di Google Apps Script...");
  try {
    const gasRes = await fetch(`${GAS_URL}?action=getTokens`);
    const gasData = await gasRes.json();
    if (gasData && gasData.tokens && gasData.tokens.length > 0) {
      console.log(`📋 Ditemukan ${gasData.tokens.length} subscriber terdaftar.`);
      for (const t of gasData.tokens) {
        console.log(`Mengirim ke: ${t.substring(0, 25)}...`);
        const res = await sendPushToToken(token, t, title, body);
        console.log("Status:", res.status, res.data.substring(0, 100));
      }
    } else {
      console.log("ℹ️ Belum ada token terdaftar di GAS via action=getTokens.");
      console.log("💡 Cara menggunakannya:");
      console.log("   node test_push_fcm.js <FCM_TOKEN>");
    }
  } catch (err) {
    console.log("GAS fetch error:", err.message);
  }
}

main().catch(console.error);
