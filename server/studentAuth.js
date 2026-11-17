const crypto = require("crypto");

const SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET ||
  crypto.createHash("sha256").update("hwb-student-login-local-session-secret").digest("hex");

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_VERIFY_ATTEMPTS = 5;

const challenges = new Map();
const latestChallengeByKey = new Map();
const savedPhonesByRoll = new Map();

const DEPARTMENT_BY_CODE = {
  CU: "Computer Science and Engineering",
  CS: "Computer Science and Engineering",
  IT: "Information Technology",
  EC: "Electronics and Communication Engineering",
  EE: "Electrical and Electronics Engineering",
  ME: "Mechanical Engineering",
  CE: "Civil Engineering",
  AE: "Aeronautical Engineering",
  AI: "Artificial Intelligence and Data Science",
  BM: "Biomedical Engineering",
  BT: "Biotechnology",
  CA: "Computer Applications",
  BA: "Business Administration",
};

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function signToken(payload) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest()
  );
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expectedSig = base64UrlEncode(
    crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest()
  );
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    if (!payload || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function deriveStudentProfile({ rollNo, email, phone, role, parentName }) {
  const cleanRoll = rollNo.trim().toUpperCase();
  const yearMatch = cleanRoll.match(/^(\d{2})([A-Z]{2})/);
  let year = 2;
  let semester = "IV";
  let department = "Engineering and Technology";

  if (yearMatch) {
    const admitYear = 2000 + Number(yearMatch[1]);
    const currentYear = new Date().getFullYear();
    const diff = Math.max(1, Math.min(4, currentYear - admitYear + 1));
    year = diff;
    const romanSemesters = ["II", "IV", "VI", "VIII"];
    semester = romanSemesters[diff - 1] || "II";
    department = DEPARTMENT_BY_CODE[yearMatch[2]] || department;
  }

  return {
    rollNo: cleanRoll,
    name: `Student ${cleanRoll}`,
    role: role === "parent" ? "parent" : "student",
    parentName: role === "parent" ? parentName.trim() : "",
    semester,
    year,
    section: "A",
    department,
    email: email.trim().toLowerCase(),
    phone,
    whatsappVerified: false,
  };
}

function normalizePhone(rawPhone) {
  const trimmed = String(rawPhone || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  return trimmed;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 64) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  if (typeof authHeader !== "string") return "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

let upstreamDisabled = false;

function isValidApiResponse(upstreamRes) {
  const contentType = (upstreamRes.headers.get("content-type") || "").toLowerCase();
  return (
    upstreamRes.status !== 404 &&
    upstreamRes.status !== 405 &&
    upstreamRes.status < 500 &&
    contentType.includes("application/json")
  );
}

// Non-blocking startup probe so non-API or unreachable ERP_API_URL never delays user requests.
(function probeExternalBackend() {
  const upstreamBase = (process.env.ERP_API_URL || "").trim().replace(/\/+$/, "");
  if (!upstreamBase) {
    upstreamDisabled = true;
    return;
  }
  const timer = setTimeout(() => {
    upstreamDisabled = true;
  }, 1500);
  fetch(`${upstreamBase}/api/student-auth/me`, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then((res) => {
      if (!isValidApiResponse(res)) {
        upstreamDisabled = true;
      }
    })
    .catch(() => {
      upstreamDisabled = true;
    })
    .finally(() => clearTimeout(timer));
})();

async function proxyToExternalBackend(req, res, pathname) {
  const upstreamBase = (process.env.ERP_API_URL || "").trim().replace(/\/+$/, "");
  if (!upstreamBase || upstreamDisabled) return false;

  try {
    const targetUrl = `${upstreamBase}${pathname}`;
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    const init = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD") {
      const body = await readJsonBody(req);
      init.body = JSON.stringify(body);
    }

    const upstreamRes = await Promise.race([
      fetch(targetUrl, init),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Upstream timeout")), 1500)),
    ]);

    if (!isValidApiResponse(upstreamRes)) {
      upstreamDisabled = true;
      return false;
    }

    const contentType = upstreamRes.headers.get("content-type") || "application/json";
    const text = await upstreamRes.text();
    res.statusCode = upstreamRes.status;
    res.setHeader("Content-Type", contentType);
    res.end(text);
    return true;
  } catch (err) {
    upstreamDisabled = true;
    console.warn("[student-auth] Upstream ERP_API_URL unavailable, using local auth:", err.message);
    return false;
  }
}

async function handleStudentAuthRequest(req, res) {
  const fullUrl = req.originalUrl || req.url || "";
  const pathname = fullUrl.split("?")[0];

  if (!pathname.startsWith("/api/student-auth/")) {
    return false;
  }

  if (await proxyToExternalBackend(req, res, pathname)) {
    return true;
  }

  if (req.method === "POST" && pathname === "/api/student-auth/request-otp") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "Invalid request payload." });
      return true;
    }

    const rollNo = String(body.rollNo || "").trim().toUpperCase();
    const email = String(body.email || "").trim().toLowerCase();
    const role = body.role === "parent" ? "parent" : "student";
    const parentName = String(body.parentName || "").trim();
    const normalizedPhone = normalizePhone(body.phone);

    if (!rollNo || rollNo.length < 4 || !/^[A-Z0-9_-]+$/.test(rollNo)) {
      sendJson(res, 400, { error: "Enter a valid student roll number." });
      return true;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendJson(res, 400, { error: "Enter a valid university student email address." });
      return true;
    }

    if (!normalizedPhone) {
      sendJson(res, 400, { error: "Enter a valid WhatsApp mobile number (at least 10 digits)." });
      return true;
    }

    if (role === "parent" && parentName.length < 2) {
      sendJson(res, 400, { error: "Enter the parent name." });
      return true;
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const challengeId = crypto.randomUUID();
    const challengeKey = `${rollNo}:${role}`;

    challenges.set(challengeId, {
      challengeId,
      challengeKey,
      rollNo,
      email,
      phone: normalizedPhone,
      role,
      parentName,
      code,
      attempts: 0,
      expiresAt: Date.now() + OTP_TTL_MS,
    });
    latestChallengeByKey.set(challengeKey, challengeId);

    sendJson(res, 200, {
      challengeId,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      deliveryMode: "local",
      devCode: code,
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/student-auth/verify-otp") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "Invalid request payload." });
      return true;
    }

    const challengeId = String(body.challengeId || "").trim();
    const code = String(body.code || "").trim();
    const rollNo = String(body.rollNo || "").trim().toUpperCase();
    const email = String(body.email || "").trim().toLowerCase();

    const challenge = challenges.get(challengeId);
    if (!challenge) {
      sendJson(res, 400, { error: "Verification session expired. Please request a new code." });
      return true;
    }

    if (latestChallengeByKey.get(challenge.challengeKey) !== challengeId) {
      challenges.delete(challengeId);
      sendJson(res, 400, { error: "A newer code was requested. Please use the newest code." });
      return true;
    }

    if (Date.now() > challenge.expiresAt) {
      challenges.delete(challengeId);
      sendJson(res, 400, { error: "This code has expired. Please request a new code." });
      return true;
    }

    if (challenge.rollNo !== rollNo || challenge.email !== email) {
      sendJson(res, 400, { error: "Roll number or email does not match the requested code." });
      return true;
    }

    if (!/^\d{6}$/.test(code)) {
      sendJson(res, 400, { error: "Enter the six-digit code." });
      return true;
    }

    if (challenge.code !== code) {
      challenge.attempts += 1;
      if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
        challenges.delete(challengeId);
        sendJson(res, 400, { error: "Too many incorrect attempts. Please request a new code." });
        return true;
      }
      sendJson(res, 400, { error: "Incorrect verification code. Please check and try again." });
      return true;
    }

    challenges.delete(challengeId);

    let effectivePhone = challenge.phone;
    if (challenge.role === "student") {
      if (savedPhonesByRoll.has(challenge.rollNo)) {
        effectivePhone = savedPhonesByRoll.get(challenge.rollNo);
      } else {
        savedPhonesByRoll.set(challenge.rollNo, challenge.phone);
      }
    }

    const student = deriveStudentProfile({
      rollNo: challenge.rollNo,
      email: challenge.email,
      phone: effectivePhone,
      role: challenge.role,
      parentName: challenge.parentName,
    });

    const token = signToken({
      student,
      iat: Date.now(),
      exp: Date.now() + SESSION_TTL_MS,
    });

    sendJson(res, 200, { token, student });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/student-auth/me") {
    const token = getBearerToken(req);
    const payload = verifyToken(token);
    if (!payload || !payload.student) {
      sendJson(res, 401, { error: "Session expired or invalid." });
      return true;
    }
    sendJson(res, 200, { student: payload.student });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/student-auth/link-code") {
    const token = getBearerToken(req);
    const payload = verifyToken(token);
    if (!payload || !payload.student) {
      sendJson(res, 401, { error: "Session expired or invalid." });
      return true;
    }
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    sendJson(res, 200, { code });
    return true;
  }

  sendJson(res, 404, { error: "Auth endpoint not found." });
  return true;
}

module.exports = { handleStudentAuthRequest };
