const SHEET_NAME = 'Supabase Guests';
const TABLE_START_ROW = 1;
const TABLE_START_COLUMN = 1;
const METADATA_CELL = 'R1';
const REQUIRED_PROPERTIES = [
  'SUPABASE_PROJECT_URL',
  'SHEET_SYNC_TOKEN',
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Supabase Sync')
    .addItem('Sync Supabase Guests', 'syncSupabaseGuests')
    .addItem('Install hourly guests sync', 'installHourlyGuestsSyncTrigger')
    .addToUi();
}

function syncSupabaseGuests() {
  const config = getSyncConfig_();
  const payload = fetchGuestsExport_(config);
  const sheet = getOrCreateSheet_(SHEET_NAME);

  replaceSheetData_(sheet, payload.columns, payload.rows, payload.exported_at);
}

function installHourlyGuestsSyncTrigger() {
  const handlerName = 'syncSupabaseGuests';

  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === handlerName)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger(handlerName)
    .timeBased()
    .everyHours(1)
    .create();
}

function getSyncConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const missing = REQUIRED_PROPERTIES.filter(name => !properties.getProperty(name));

  if (missing.length > 0) {
    throw new Error('Missing Script Properties: ' + missing.join(', '));
  }

  const projectUrl = properties.getProperty('SUPABASE_PROJECT_URL').replace(/\/+$/, '');
  return {
    endpoint: projectUrl + '/functions/v1/guests-sheet-export',
    token: properties.getProperty('SHEET_SYNC_TOKEN'),
  };
}

function fetchGuestsExport_(config) {
  const response = UrlFetchApp.fetch(config.endpoint, {
    method: 'post',
    muteHttpExceptions: true,
    headers: {
      'x-sheet-sync-token': config.token,
    },
  });

  const status = response.getResponseCode();
  const bodyText = response.getContentText();
  let body = {};

  if (bodyText) {
    body = JSON.parse(bodyText);
  }

  if (status !== 200) {
    const errorCode = body && body.error ? body.error : 'unknown_error';
    throw new Error('Guests export failed (' + status + '): ' + errorCode);
  }

  if (!Array.isArray(body.columns) || !Array.isArray(body.rows)) {
    throw new Error('Guests export returned an unexpected payload.');
  }

  return body;
}

function getOrCreateSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function replaceSheetData_(sheet, columns, rows, exportedAt) {
  const totalColumns = columns.length;
  const totalRows = rows.length + 1;
  const maxRows = Math.max(sheet.getMaxRows(), totalRows);
  const maxColumns = Math.max(sheet.getMaxColumns(), totalColumns);

  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }

  sheet.clearContents();

  if (sheet.getMaxRows() < totalRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), totalRows - sheet.getMaxRows());
  }

  if (sheet.getMaxColumns() < totalColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), totalColumns - sheet.getMaxColumns());
  }

  sheet.getRange(TABLE_START_ROW, TABLE_START_COLUMN, 1, totalColumns).setValues([columns]);

  if (rows.length > 0) {
    const normalisedRows = rows.map(row => {
      const output = row.slice(0, totalColumns);
      while (output.length < totalColumns) output.push('');
      return output.map(value => value === null ? '' : value);
    });

    sheet
      .getRange(TABLE_START_ROW + 1, TABLE_START_COLUMN, normalisedRows.length, totalColumns)
      .setValues(normalisedRows);
  }

  const usedRange = sheet.getRange(TABLE_START_ROW, TABLE_START_COLUMN, Math.max(totalRows, 1), totalColumns);
  usedRange.createFilter();
  sheet.setFrozenRows(1);

  sheet.getRange(METADATA_CELL).setValue('Last sync: ' + new Date().toISOString());
  sheet.getRange('R2').setValue('Exported at: ' + (exportedAt || 'unknown'));
  sheet.autoResizeColumns(TABLE_START_COLUMN, totalColumns);
}
