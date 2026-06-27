const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
const SHEET_NAME = "leads";
const DEVELOPER_NAME = "장문희";
const PAGE_NAME = "메디스파크 랜딩페이지";
const MAX_FIELD_LENGTH = 200;
const DUPLICATE_WINDOW_SECONDS = 300;

function doPost(e) {
  try {
    if (SPREADSHEET_ID === "YOUR_SPREADSHEET_ID") {
      throw new Error("스프레드시트 ID가 아직 설정되지 않았습니다.");
    }

    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const payload = sanitizePayload_(data);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error("시트를 찾을 수 없습니다.");
    }

    preventDuplicateLead_(payload);

    sheet.appendRow([
      formatDate_(new Date()),
      payload.name,
      payload.phone,
      DEVELOPER_NAME,
      PAGE_NAME,
      payload.leadType,
      payload.interestType,
      payload.consultType,
      payload.inflowSource,
      payload.deviceType,
      payload.userAgent
    ]);

    return jsonOutput_({
      ok: true,
      message: "saved"
    });
  } catch (error) {
    return jsonOutput_({
      ok: false,
      message: error.message || "unknown_error"
    });
  }
}

function doGet() {
  return jsonOutput_({
    ok: true,
    message: "running"
  });
}

function sanitizePayload_(data) {
  const payload = {
    name: sanitizeName_(data.name),
    phone: sanitizePhone_(data.phone),
    leadType: sanitizeText_(data.leadType, 30),
    interestType: sanitizeText_(data.interestType, 30),
    consultType: sanitizeText_(data.consultType, 30),
    inflowSource: sanitizeText_(data.inflowSource, 50),
    deviceType: sanitizeText_(data.deviceType, 20),
    userAgent: sanitizeText_(data.userAgent, MAX_FIELD_LENGTH),
    company: sanitizeText_(data.company, 50)
  };

  if (payload.company) {
    throw new Error("비정상 요청이 감지되었습니다.");
  }

  if (!payload.name || payload.name.length < 2 || payload.name.length > 20) {
    throw new Error("이름 형식이 올바르지 않습니다.");
  }

  if (!/^01[0-9]\d{7,8}$/.test(payload.phone)) {
    throw new Error("연락처 형식이 올바르지 않습니다.");
  }

  if (!payload.leadType) {
    payload.leadType = "상담신청";
  }

  if (!payload.consultType) {
    payload.consultType = payload.leadType === "방문예약" ? "방문예약" : "전화상담";
  }

  return payload;
}

function preventDuplicateLead_(payload) {
  const cache = CacheService.getScriptCache();
  const cacheKey = "lead:" + payload.phone + ":" + payload.leadType;

  if (cache.get(cacheKey)) {
    throw new Error("같은 신청이 잠시 전 접수되었습니다. 잠시 후 다시 시도해주세요.");
  }

  cache.put(cacheKey, "1", DUPLICATE_WINDOW_SECONDS);
}

function sanitizeName_(input) {
  return sanitizeText_(input, 20).replace(/\s+/g, " ").replace(/[<>]/g, "").trim();
}

function sanitizePhone_(input) {
  return String(input == null ? "" : input).replace(/[^\d]/g, "");
}

function sanitizeText_(input, maxLength) {
  return String(input == null ? "" : input)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLength);
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate_(date) {
  return Utilities.formatDate(date, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
}
