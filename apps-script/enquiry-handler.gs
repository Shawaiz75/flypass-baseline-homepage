/**
 * Flypass Holidays — enquiry form handler.
 *
 * This code does NOT run on the website. It lives in Google Apps Script,
 * attached to the enquiries spreadsheet. It is kept here so there is a
 * version-controlled copy of what is deployed.
 *
 * It receives submissions from the website, filters out automated ones,
 * logs the genuine ones to this Sheet, and emails them to the practice inbox.
 *
 * Filtering rule: a blocked submission is NEVER silently discarded. It is
 * written to the "Blocked" tab with the reason, so nothing is ever lost.
 * Every check below errs towards accepting, because a lost enquiry costs far
 * more than a spam email does.
 */

var NOTIFY  = "info@flypassholidays.co.uk";   // where enquiries are sent
var SHEET   = "Enquiries";                    // tab for genuine enquiries
var BLOCKED = "Blocked";                      // tab for filtered submissions

var MIN_FILL_MS   = 2500;   // no person completes the form faster than this
var MAX_PER_10MIN = 20;     // flood guard

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);

    var reason = spamReason(d);
    if (reason) {
      appendRow(
        BLOCKED,
        ["Received", "Blocked because", "Full name", "Email", "Phone", "WhatsApp", "Nationality", "Destination", "Description"],
        [new Date(), reason, d.name || "", d.email || "", d.phone || "", d.whatsapp || "",
         d.nationality || "", d.destination || "", d.notes || ""]
      );
      // Reply as though it was accepted, so an automated sender learns nothing
      // from the response and does not start probing for what got through.
      return json({ ok: true });
    }

    appendRow(
      SHEET,
      ["Received", "Full name", "Email", "Phone", "WhatsApp", "Nationality", "Destination", "Description"],
      [new Date(), d.name || "", d.email || "", d.phone || "", d.whatsapp || "",
       d.nationality || "", d.destination || "", d.notes || ""]
    );

    var body =
      "New enquiry from the website\n\n" +
      "Full name:    " + (d.name || "-") + "\n" +
      "Email:        " + (d.email || "-") + "\n" +
      "Phone:        " + (d.phone || "-") + "\n" +
      "WhatsApp:     " + (d.whatsapp || "-") + "\n" +
      "Nationality:  " + (d.nationality || "-") + "\n" +
      "Destination:  " + (d.destination || "-") + "\n\n" +
      "Description:\n" + (d.notes || "-") + "\n\n" +
      "Received " + new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

    MailApp.sendEmail({
      to: NOTIFY,
      subject: "Visa enquiry: " + (d.name || "new applicant"),
      body: body,
      replyTo: d.email || NOTIFY
    });

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/**
 * Returns a short reason to block, or "" to accept.
 */
function spamReason(d) {
  // 1. The honeypot: a field hidden from people on the website. Automated fillers
  //    complete every field they find, so anything here means it was not a person.
  if (String(d.fp_hp || "").trim() !== "") return "hidden field filled";

  // 2. Time taken to fill the form. Judged only when the website reported it, so a
  //    visitor whose page was loaded before this change is never blocked by it.
  var ms = Number(d.fp_ms);
  if (isFinite(ms) && ms > 0 && ms < MIN_FILL_MS) return "submitted in " + ms + "ms";

  // 3. The website refuses to send without a name and an email, so a submission
  //    missing them did not come from the form at all.
  if (String(d.name || "").trim() === "") return "no name given";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(d.email || "").trim())) return "email not a usable address";

  // 4. Real enquiries do not run this long.
  if (String(d.name || "").length > 100) return "name absurdly long";
  if (String(d.notes || "").length > 5000) return "description absurdly long";

  // 5. Flood guard, in case the endpoint is scripted directly.
  if (!underRateLimit()) return "more than " + MAX_PER_10MIN + " in 10 minutes";

  return "";
}

function underRateLimit() {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get("fp_rate") || 0) + 1;
  cache.put("fp_rate", String(n), 600); // 600 seconds = 10 minutes
  return n <= MAX_PER_10MIN;
}

function appendRow(tabName, header, row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(tabName);
  if (!sh) {
    sh = ss.insertSheet(tabName);
    sh.appendRow(header);
    sh.setFrozenRows(1);
  }
  sh.appendRow(row);
}

function doGet() {
  return json({ ok: true, note: "Flypass enquiry endpoint is live." });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
