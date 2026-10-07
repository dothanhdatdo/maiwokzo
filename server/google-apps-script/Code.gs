/**
 * Maiwok Zo Freiburg – Bestellnummern & Bestellliste (Google Apps Script)
 *
 * - Vergibt fortlaufende Bestellnummern pro Tag (deutsche Zeit): 100, 101, 102, …
 *   Am nächsten Tag beginnt die Zählung automatisch wieder bei START_NUMBER.
 * - Schreibt jede Bestellung als neue Zeile (neueste oben) in das Tabellenblatt "Bestellungen".
 *
 * Einrichtung: siehe ANLEITUNG.md im gleichen Ordner.
 */

const TIMEZONE = "Europe/Berlin";
const START_NUMBER = 100;
const SHEET_NAME = "Bestellungen";
const HEADER = [
  "Datum", "Eingang", "Nr.", "Name", "Telefon", "E-Mail",
  "Abholung", "Gerichte", "Summe", "Zahlung", "Hinweise", "Quelle"
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!data.name || !data.items) return json_({ ok: false, error: "missing fields" });

    const now = new Date();
    const today = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
    const props = PropertiesService.getScriptProperties();
    const key = "counter-" + today;
    const number = Number(props.getProperty(key) || START_NUMBER - 1) + 1;
    props.setProperty(key, String(number));
    cleanupOldCounters_(props, today);

    const sheet = getSheet_();
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, HEADER.length).setValues([[
      today,
      Utilities.formatDate(now, TIMEZONE, "HH:mm"),
      number,
      clip_(data.name, 80),
      clip_(data.phone, 40),
      clip_(data.email, 120),
      clip_(data.pickup, 60),
      clip_(data.items, 2000),
      clip_(data.total, 20),
      clip_(data.payment, 60),
      clip_(data.notes, 500),
      clip_(data.source, 60)
    ]]);

    return json_({ ok: true, number: number, date: today });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Zum Testen im Browser: zeigt die nächste Nummer, ohne zu zählen.
function doGet() {
  const today = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
  const current = PropertiesService.getScriptProperties().getProperty("counter-" + today);
  return json_({ ok: true, date: today, next: Number(current || START_NUMBER - 1) + 1 });
}

function getSheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  // Vorbereitete Tabelle: erstes Blatt hat schon die Kopfzeile ("Datum" in A1) -> übernehmen und umbenennen.
  const first = book.getSheets()[0];
  if (!sheet && first && first.getRange(1, 1).getValue() === "Datum") {
    sheet = first.setName(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADER.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Zähler älter als 7 Tage entfernen, damit sich nichts ansammelt.
function cleanupOldCounters_(props, today) {
  const limit = new Date(today + "T00:00:00Z").getTime() - 7 * 86400000;
  Object.keys(props.getProperties()).forEach(function (key) {
    if (key.indexOf("counter-") !== 0) return;
    const time = new Date(key.slice(8) + "T00:00:00Z").getTime();
    if (time < limit) props.deleteProperty(key);
  });
}

// Text kürzen und Formeln verhindern (Eingaben wie "=..." würden sonst als Formel ausgeführt).
function clip_(value, max) {
  const text = String(value == null ? "" : value).slice(0, max);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json_(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}
