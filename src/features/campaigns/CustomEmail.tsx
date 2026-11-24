import { useState, useRef, useEffect, useMemo, type ChangeEvent, type DragEvent } from 'react';
import * as XLSX from 'xlsx';
import { Card } from '../../components/ui/Card';
import { sendTestEmail } from '../../services/campaignService';
import './CustomEmail.css';

interface RecipientRow {
  __id: number;
  [key: string]: unknown;
}

interface SendResult {
  rowId: number;
  email: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error?: string;
  sentAt?: string;
}

interface RawWorkbookData {
  sheetNames: string[];
  sheets: Record<string, unknown[][]>;
}

export function CustomEmail() {
  // File & Excel State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [workbookData, setWorkbookData] = useState<RawWorkbookData | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [showTablePreview, setShowTablePreview] = useState(false);

  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [emailColumn, setEmailColumn] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Email Composition State
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Cursor tracking for inserting variables
  const [activeInput, setActiveInput] = useState<'subject' | 'body'>('body');
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Single Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingSingleTest, setIsSendingSingleTest] = useState(false);

  // Preview State
  const [previewIndex, setPreviewIndex] = useState(0);

  // Batch Sending State
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  /**
   * Intelligently find the most likely header row in a 2D sheet.
   * Skips banner/title rows (e.g. "STAFF LIST - NOVEMBER 2026") that have only 1 cell.
   */
  function detectBestHeaderRow(rawSheet: unknown[][]): number {
    let bestRow = 0;
    let bestScore = -1;

    const maxScan = Math.min(rawSheet.length, 12);
    for (let r = 0; r < maxScan; r++) {
      const row = rawSheet[r];
      if (!Array.isArray(row)) continue;

      const nonEmptyCells = row
        .map((cell) => String(cell ?? '').trim())
        .filter((c) => c.length > 0);

      // Title banners usually only occupy 1 cell or have 0
      if (nonEmptyCells.length <= 1) continue;

      let score = nonEmptyCells.length * 2;
      const combined = nonEmptyCells.join(' ').toLowerCase();

      // Bonus points for standard header keywords
      if (combined.includes('email') || combined.includes('mail')) score += 15;
      if (combined.includes('name') || combined.includes('first') || combined.includes('last')) score += 8;
      if (combined.includes('id') || combined.includes('no') || combined.includes('number')) score += 5;
      if (combined.includes('phone') || combined.includes('balance') || combined.includes('dept')) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestRow = r;
      }
    }

    return bestRow;
  }

  /**
   * Parse rows given a sheet array and selected header row index.
   */
  function applyHeaderRow(rawSheet: unknown[][], headerIdx: number) {
    if (!rawSheet || rawSheet.length === 0) {
      setColumns([]);
      setRows([]);
      return;
    }

    const headerRow = rawSheet[headerIdx] || [];
    const rawHeaders = headerRow.map((h) => String(h ?? '').trim());

    // Only keep columns that actually have a real header text written in the spreadsheet
    const validColIndices: number[] = [];
    const activeColNames: string[] = [];
    const seen = new Map<string, number>();

    rawHeaders.forEach((raw, colIdx) => {
      const trimmed = raw.trim();
      // Ignore blank headers or sheetjs internal __EMPTY columns
      if (!trimmed || trimmed.startsWith('__EMPTY')) {
        return;
      }

      let colName = trimmed.replace(/\s+/g, ' ');
      if (seen.has(colName)) {
        const count = seen.get(colName)! + 1;
        seen.set(colName, count);
        colName = `${colName}_${count}`;
      } else {
        seen.set(colName, 1);
      }

      validColIndices.push(colIdx);
      activeColNames.push(colName);
    });

    if (activeColNames.length === 0) {
      setParseError('No column headers with text found in the selected row.');
      setColumns([]);
      setRows([]);
      return;
    }

    setParseError(null);

    // Parse recipient data rows below the header
    const parsedRows: RecipientRow[] = [];
    let idCounter = 1;

    for (let r = headerIdx + 1; r < rawSheet.length; r++) {
      const row = rawSheet[r];
      if (!Array.isArray(row)) continue;

      // Check if row is completely blank across valid columns
      const hasContent = validColIndices.some((colIdx) => {
        const cell = row[colIdx];
        return cell !== undefined && cell !== null && String(cell).trim() !== '';
      });
      if (!hasContent) continue;

      const rowObj: RecipientRow = { __id: idCounter++ };
      validColIndices.forEach((colIdx, i) => {
        const key = activeColNames[i];
        const val = row[colIdx];
        rowObj[key] = val !== undefined && val !== null ? String(val).trim() : '';
      });

      parsedRows.push(rowObj);
    }

    setColumns(activeColNames);
    setRows(parsedRows);
    setPreviewIndex(0);

    // Auto-detect email column
    const autoEmail = activeColNames.find((h) => {
      const lower = h.toLowerCase();
      return lower.includes('email') || lower.includes('mail') || lower === 'to' || lower.includes('recipient');
    }) || activeColNames[0] || '';

    setEmailColumn(autoEmail);
  }

  // Handle Sheet or Header row changes
  function handleSheetChange(sheetName: string) {
    setSelectedSheet(sheetName);
    if (!workbookData) return;
    const rawSheet = workbookData.sheets[sheetName] || [];
    const bestHeader = detectBestHeaderRow(rawSheet);
    setHeaderRowIndex(bestHeader);
    applyHeaderRow(rawSheet, bestHeader);
  }

  function handleHeaderRowChange(newIdx: number) {
    setHeaderRowIndex(newIdx);
    if (!workbookData || !selectedSheet) return;
    const rawSheet = workbookData.sheets[selectedSheet] || [];
    applyHeaderRow(rawSheet, newIdx);
  }

  // File parsing logic
  function processFile(file: File) {
    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('The uploaded spreadsheet contains no sheets.');
        }

        const sheets2D: Record<string, unknown[][]> = {};
        for (const name of workbook.SheetNames) {
          sheets2D[name] = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
            header: 1,
            defval: '',
          });
        }

        const initialSheet = workbook.SheetNames[0];
        const initialRaw = sheets2D[initialSheet] || [];

        if (initialRaw.length === 0) {
          throw new Error('The spreadsheet sheet is empty.');
        }

        const wbInfo: RawWorkbookData = {
          sheetNames: workbook.SheetNames,
          sheets: sheets2D,
        };

        setWorkbookData(wbInfo);
        setSelectedSheet(initialSheet);

        const bestHeaderIdx = detectBestHeaderRow(initialRaw);
        setHeaderRowIndex(bestHeaderIdx);
        applyHeaderRow(initialRaw, bestHeaderIdx);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Failed to parse file.');
        setWorkbookData(null);
        setColumns([]);
        setRows([]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setParseError('Failed to read the file.');
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(file);
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  // Insert variable into active input
  function insertVariable(variableName: string) {
    const tag = `{{${variableName}}}`;

    if (activeInput === 'subject') {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart ?? subject.length;
        const end = input.selectionEnd ?? subject.length;
        const next = subject.slice(0, start) + tag + subject.slice(end);
        setSubject(next);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      } else {
        setSubject((prev) => prev + tag);
      }
    } else {
      const textarea = bodyTextareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? body.length;
        const end = textarea.selectionEnd ?? body.length;
        const next = body.slice(0, start) + tag + body.slice(end);
        setBody(next);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      } else {
        setBody((prev) => prev + tag);
      }
    }
  }

  // Merge template text with a row's data
  function resolveTemplate(template: string, row: RecipientRow): string {
    return template.replace(/\{\{\s*([\w.\s-]+)\s*\}\}/gi, (match, key) => {
      const cleanKey = key.trim().toLowerCase();
      const rowKey = Object.keys(row).find((k) => k.trim().toLowerCase() === cleanKey);
      if (rowKey && row[rowKey] !== undefined && row[rowKey] !== null) {
        return String(row[rowKey]);
      }
      return match;
    });
  }

  // Current row in preview
  const currentRow = rows[previewIndex] || null;
  const currentEmail = currentRow && emailColumn ? String(currentRow[emailColumn] ?? '').trim() : '';

  const previewSubject = useMemo(() => {
    if (!currentRow) return subject;
    return resolveTemplate(subject, currentRow);
  }, [subject, currentRow]);

  const previewBody = useMemo(() => {
    if (!currentRow) return body;
    return resolveTemplate(body, currentRow);
  }, [body, currentRow]);

  // Send single test email
  async function handleSendSingleTest() {
    const target = testEmailAddress.trim() || currentEmail;
    if (!target) {
      alert('Please enter a test email address or select a row with a valid email.');
      return;
    }
    if (!previewSubject.trim() || !previewBody.trim()) {
      alert('Subject and email content cannot be empty.');
      return;
    }

    setIsSendingSingleTest(true);
    try {
      await sendTestEmail({
        to: target,
        subject: previewSubject,
        html: previewBody,
      });
      alert(`Test email sent successfully to ${target}`);
    } catch (err) {
      alert(`Failed to send test email: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSendingSingleTest(false);
    }
  }

  // Batch Sending Engine
  async function startBatchSending() {
    if (rows.length === 0) {
      alert('No recipients loaded from spreadsheet.');
      return;
    }
    if (!emailColumn) {
      alert('Please specify the recipient email column.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      alert('Please complete the subject line and email body.');
      return;
    }

    setConfirmSendOpen(false);
    setIsSendingBatch(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    const initialResults: SendResult[] = rows.map((r) => ({
      rowId: r.__id,
      email: String(r[emailColumn] ?? '').trim(),
      status: 'pending',
    }));
    setResults(initialResults);

    const CONCURRENCY = 2;
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < rows.length && !isCancelledRef.current) {
        while (isPausedRef.current && !isCancelledRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        if (isCancelledRef.current) break;

        const currentIndex = nextIndex++;
        const row = rows[currentIndex];
        const recipientEmail = String(row[emailColumn] ?? '').trim();

        if (!recipientEmail || !recipientEmail.includes('@')) {
          setResults((prev) =>
            prev.map((item, idx) =>
              idx === currentIndex
                ? { ...item, status: 'failed', error: 'Invalid or missing email address' }
                : item
            )
          );
          continue;
        }

        setResults((prev) =>
          prev.map((item, idx) => (idx === currentIndex ? { ...item, status: 'sending' } : item))
        );

        const rowSubject = resolveTemplate(subject, row);
        const rowBody = resolveTemplate(body, row);

        try {
          await sendTestEmail({
            to: recipientEmail,
            subject: rowSubject,
            html: rowBody,
          });

          setResults((prev) =>
            prev.map((item, idx) =>
              idx === currentIndex
                ? { ...item, status: 'sent', sentAt: new Date().toLocaleTimeString() }
                : item
            )
          );
        } catch (err) {
          setResults((prev) =>
            prev.map((item, idx) =>
              idx === currentIndex
                ? {
                    ...item,
                    status: 'failed',
                    error: err instanceof Error ? err.message : 'Unknown error',
                  }
                : item
            )
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);

    setIsSendingBatch(false);
  }

  function handleCancelBatch() {
    isCancelledRef.current = true;
    setIsSendingBatch(false);
    setIsPaused(false);
  }

  async function handleRetryFailed() {
    const failedIndices: number[] = [];
    results.forEach((r, idx) => {
      if (r.status === 'failed') failedIndices.push(idx);
    });

    if (failedIndices.length === 0) return;

    setIsSendingBatch(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    let nextFailPtr = 0;

    async function retryWorker() {
      while (nextFailPtr < failedIndices.length && !isCancelledRef.current) {
        while (isPausedRef.current && !isCancelledRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        if (isCancelledRef.current) break;

        const targetIdx = failedIndices[nextFailPtr++];
        const row = rows[targetIdx];
        const recipientEmail = String(row[emailColumn] ?? '').trim();

        setResults((prev) =>
          prev.map((item, idx) => (idx === targetIdx ? { ...item, status: 'sending', error: undefined } : item))
        );

        const rowSubject = resolveTemplate(subject, row);
        const rowBody = resolveTemplate(body, row);

        try {
          await sendTestEmail({
            to: recipientEmail,
            subject: rowSubject,
            html: rowBody,
          });
          setResults((prev) =>
            prev.map((item, idx) =>
              idx === targetIdx
                ? { ...item, status: 'sent', sentAt: new Date().toLocaleTimeString() }
                : item
            )
          );
        } catch (err) {
          setResults((prev) =>
            prev.map((item, idx) =>
              idx === targetIdx
                ? { ...item, status: 'failed', error: err instanceof Error ? err.message : 'Retry failed' }
                : item
            )
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    const workers = Array.from({ length: 2 }, () => retryWorker());
    await Promise.all(workers);

    setIsSendingBatch(false);
  }

  function exportResultsSpreadsheet() {
    if (results.length === 0) return;
    const exportRows = rows.map((r, idx) => {
      const res = results[idx];
      return {
        ...r,
        Send_Status: res?.status || 'unprocessed',
        Sent_At: res?.sentAt || '',
        Error_Message: res?.error || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Send_Results');
    XLSX.writeFile(workbook, `Custom_Email_Send_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // Options for Header Row dropdown
  const headerRowOptions = useMemo(() => {
    if (!workbookData || !selectedSheet) return [];
    const rawSheet = workbookData.sheets[selectedSheet] || [];
    const maxRows = Math.min(rawSheet.length, 12);
    const options: { index: number; label: string }[] = [];

    for (let i = 0; i < maxRows; i++) {
      const row = rawSheet[i];
      if (!Array.isArray(row)) continue;
      const nonEmpties = row
        .map((c) => String(c ?? '').trim())
        .filter((c) => c.length > 0 && !c.startsWith('__EMPTY'));
      const previewText = nonEmpties.slice(0, 4).join(', ');
      options.push({
        index: i,
        label: `Row ${i + 1}: ${nonEmpties.length} columns ${previewText ? `(${previewText}${nonEmpties.length > 4 ? '…' : ''})` : '(empty)'}`,
      });
    }

    return options;
  }, [workbookData, selectedSheet]);

  const sentCount = results.filter((r) => r.status === 'sent').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;
  const pendingCount = results.filter((r) => r.status === 'pending' || r.status === 'sending').length;
  const totalCount = rows.length;
  const progressPercent = totalCount > 0 ? Math.round(((sentCount + failedCount) / totalCount) * 100) : 0;

  return (
    <div className="custom-email">
      {/* Header */}
      <div className="custom-email__header">
        <div className="custom-email__header-text">
          <h1>Custom Email Merge</h1>
          <p>Upload any Excel or CSV file to send personalized emails with dynamic column variables and live preview.</p>
        </div>
      </div>

      <div className="grid grid--2">
        {/* Left Column: Excel Upload & Variable Picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Step 1: File Upload */}
          <Card>
            <span className="custom-email__step-badge">Step 1: Upload Excel / CSV</span>
            <div
              className={`custom-email__dropzone ${isDragOver ? 'custom-email__dropzone--active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
              />
              <div className="custom-email__dropzone-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="custom-email__dropzone-text">
                {isParsing ? 'Processing spreadsheet…' : 'Drop your Excel (.xlsx, .xls) or CSV here'}
              </p>
              <span className="custom-email__dropzone-hint">or click to browse your files</span>
            </div>

            {parseError && (
              <div style={{ marginTop: 12, padding: 10, background: 'var(--alert-dim)', color: 'var(--alert)', borderRadius: 4, fontSize: 13 }}>
                {parseError}
              </div>
            )}

            {fileName && rows.length > 0 && (
              <>
                <div className="custom-email__file-info">
                  <div className="custom-email__file-details">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--verified)" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="custom-email__file-meta">
                      <span className="custom-email__file-name">{fileName}</span>
                      <span className="custom-email__file-stats">{rows.length} recipients loaded · {columns.length} columns detected</span>
                    </div>
                  </div>
                  <button className="btn" type="button" onClick={() => fileInputRef.current?.click()} style={{ fontSize: 12 }}>
                    Change File
                  </button>
                </div>

                {/* Header Row and Sheet Options */}
                <div className="custom-email__options-grid">
                  {workbookData && workbookData.sheetNames.length > 1 && (
                    <div className="custom-email__option-field">
                      <label htmlFor="sheet-select">Select Sheet:</label>
                      <select
                        id="sheet-select"
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                      >
                        {workbookData.sheetNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="custom-email__option-field">
                    <label htmlFor="header-row-select">Column Header Row:</label>
                    <select
                      id="header-row-select"
                      value={headerRowIndex}
                      onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                    >
                      {headerRowOptions.map((opt) => (
                        <option key={opt.index} value={opt.index}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="custom-email__option-field">
                    <label htmlFor="email-col">Recipient Email Column:</label>
                    <select
                      id="email-col"
                      value={emailColumn}
                      onChange={(e) => setEmailColumn(e.target.value)}
                    >
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table Data Preview Toggle */}
                <div className="custom-email__table-preview-box">
                  <div className="custom-email__table-preview-header">
                    <span>Spreadsheet Preview (First {Math.min(rows.length, 3)} rows)</span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowTablePreview((p) => !p)}
                      style={{ fontSize: 11, padding: '2px 8px' }}
                    >
                      {showTablePreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                  </div>

                  {showTablePreview && (
                    <div className="custom-email__preview-table-scroll">
                      <table className="custom-email__sheet-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            {columns.map((c) => (
                              <th key={c}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 3).map((r) => (
                            <tr key={r.__id}>
                              <td>{r.__id}</td>
                              {columns.map((c) => (
                                <td key={c}>{String(r[c] ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Variable Chips */}
                <div className="custom-email__variables-section">
                  <span className="custom-email__variables-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 8l-4 4 4 4" />
                      <path d="M17 8l4 4-4 4" />
                      <line x1="14" y1="4" x2="10" y2="20" />
                    </svg>
                    Click to insert variable into {activeInput === 'subject' ? 'Subject' : 'Email Body'}:
                  </span>
                  <div className="custom-email__chips">
                    {columns.map((col) => (
                      <button
                        key={col}
                        type="button"
                        className="custom-email__chip"
                        onClick={() => insertVariable(col)}
                        title={`Insert {{${col}}}`}
                      >
                        + {`{{${col}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Step 2: Compose Email */}
          <Card>
            <span className="custom-email__step-badge">Step 2: Compose Email</span>

            <div className="custom-email__form">
              <div className="custom-email__input-group">
                <label htmlFor="custom-subject">Subject Line</label>
                <input
                  id="custom-subject"
                  ref={subjectInputRef}
                  value={subject}
                  onFocus={() => setActiveInput('subject')}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Notice regarding your loan balance of {{Loan_Balance}}"
                />
              </div>

              <div className="custom-email__input-group">
                <label htmlFor="custom-body">
                  Email Body (supports HTML or plain text + variables)
                </label>
                <textarea
                  id="custom-body"
                  ref={bodyTextareaRef}
                  rows={14}
                  value={body}
                  onFocus={() => setActiveInput('body')}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`Dear {{Staff Name}},\n\nPlease note your allocated department is {{Department}}.\n\nThank you,\nNational Construction Authority`}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Recipient Preview & Batch Sending */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Step 3: Interactive Live Preview */}
          <Card>
            <span className="custom-email__step-badge">Step 3: Live Recipient Preview</span>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, marginBottom: 12 }}>
              Inspect how the email looks for each person in your Excel sheet before blasting.
            </p>

            {rows.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--line)', borderRadius: 6 }}>
                Upload an Excel file in Step 1 to preview your recipients here.
              </div>
            ) : (
              <div className="custom-email__preview-box">
                {/* Stepper Navigation */}
                <div className="custom-email__preview-nav">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn"
                      type="button"
                      disabled={previewIndex <= 0}
                      onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                      style={{ padding: '4px 10px', fontSize: 13 }}
                    >
                      ◀ Previous
                    </button>
                    <span className="custom-email__preview-counter">
                      Row {previewIndex + 1} of {rows.length}
                    </span>
                    <button
                      className="btn"
                      type="button"
                      disabled={previewIndex >= rows.length - 1}
                      onClick={() => setPreviewIndex((prev) => Math.min(rows.length - 1, prev + 1))}
                      style={{ padding: '4px 10px', fontSize: 13 }}
                    >
                      Next ▶
                    </button>
                  </div>

                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Recipient #{currentRow?.__id}
                  </span>
                </div>

                {/* Live Preview Meta */}
                <div className="custom-email__preview-meta">
                  <div>
                    <strong>To: </strong>
                    <span style={{ color: currentEmail ? 'var(--ink)' : 'var(--alert)' }}>
                      {currentEmail || '(No email address in this row)'}
                    </span>
                  </div>
                  <div>
                    <strong>Subject: </strong>
                    <span>{previewSubject || '(No subject)'}</span>
                  </div>
                </div>

                {/* Live Preview Body */}
                <div className="custom-email__preview-body">
                  {previewBody || <span style={{ color: 'var(--muted)' }}>(No content yet)</span>}
                </div>

                {/* Single Test Email Row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder={currentEmail ? `Or test with ${currentEmail}` : 'Enter test email'}
                    style={{ flex: 1, minWidth: 200, padding: '7px 10px', fontSize: 13, border: '1px solid var(--line-strong)', borderRadius: 3 }}
                  />
                  <button
                    className="btn"
                    type="button"
                    onClick={handleSendSingleTest}
                    disabled={isSendingSingleTest}
                    style={{ fontSize: 13 }}
                  >
                    {isSendingSingleTest ? 'Sending Test…' : 'Send Preview as Test'}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Step 4: Batch Dispatch */}
          <Card>
            <span className="custom-email__step-badge">Step 4: Dispatch to Recipients</span>

            {!isSendingBatch && results.length === 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 16 }}>
                  Ready to send to all <strong>{rows.length}</strong> recipients from your Excel sheet?
                </p>
                <button
                  className="btn btn--primary"
                  type="button"
                  disabled={rows.length === 0 || !emailColumn || !subject.trim() || !body.trim()}
                  onClick={() => setConfirmSendOpen(true)}
                  style={{ width: '100%', padding: '12px', fontSize: 15, fontWeight: 600 }}
                >
                  Send to All {rows.length} Recipients
                </button>
              </div>
            )}

            {/* In-Progress or Completed Batch Card */}
            {(isSendingBatch || results.length > 0) && (
              <div className="custom-email__progress-card">
                <div className="custom-email__progress-header">
                  <h3 style={{ fontSize: 16, margin: 0 }}>
                    {isSendingBatch ? (isPaused ? 'Sending Paused' : 'Sending in Progress…') : 'Batch Dispatch Complete'}
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isSendingBatch && (
                      <>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => setIsPaused((prev) => !prev)}
                          style={{ fontSize: 12 }}
                        >
                          {isPaused ? 'Resume' : 'Pause'}
                        </button>
                        <button
                          className="btn"
                          type="button"
                          onClick={handleCancelBatch}
                          style={{ fontSize: 12, color: 'var(--alert)' }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {!isSendingBatch && failedCount > 0 && (
                      <button
                        className="btn"
                        type="button"
                        onClick={handleRetryFailed}
                        style={{ fontSize: 12, color: 'var(--amber)' }}
                      >
                        Retry {failedCount} Failed
                      </button>
                    )}
                    <button
                      className="btn"
                      type="button"
                      onClick={exportResultsSpreadsheet}
                      style={{ fontSize: 12 }}
                    >
                      Export Results (.xlsx)
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="custom-email__progress-bar-bg">
                  <div
                    className="custom-email__progress-bar-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="custom-email__progress-stats">
                  <div className="custom-email__stat-pill custom-email__stat-pill--total">
                    <strong>{totalCount}</strong>
                    <span>Total</span>
                  </div>
                  <div className="custom-email__stat-pill custom-email__stat-pill--sent">
                    <strong>{sentCount}</strong>
                    <span>Sent</span>
                  </div>
                  <div className="custom-email__stat-pill custom-email__stat-pill--failed">
                    <strong>{failedCount}</strong>
                    <span>Failed</span>
                  </div>
                  <div className="custom-email__stat-pill custom-email__stat-pill--remaining">
                    <strong>{pendingCount}</strong>
                    <span>Remaining</span>
                  </div>
                </div>

                {/* Live log table */}
                <div className="custom-email__log-wrap">
                  <table className="custom-email__log-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Info</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(0, 50).map((item) => (
                        <tr key={item.rowId}>
                          <td>{item.rowId}</td>
                          <td>{item.email}</td>
                          <td>
                            <span
                              style={{
                                color:
                                  item.status === 'sent'
                                    ? 'var(--verified)'
                                    : item.status === 'failed'
                                    ? 'var(--alert)'
                                    : item.status === 'sending'
                                    ? 'var(--blueprint)'
                                    : 'var(--muted)',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: item.error ? 'var(--alert)' : 'var(--muted)' }}>
                            {item.error || item.sentAt || '—'}
                          </td>
                        </tr>
                      ))}
                      {results.length > 50 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 8 }}>
                            Showing first 50 results (Total {results.length}). Export spreadsheet to see all.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!isSendingBatch && (
                  <button
                    className="btn btn--primary"
                    type="button"
                    onClick={() => {
                      setResults([]);
                    }}
                    style={{ marginTop: 14, width: '100%' }}
                  >
                    Start Another Custom Send
                  </button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmSendOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              maxWidth: 480,
              width: '90%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Confirm Custom Email Blast</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
              You are about to send personalized emails to <strong>{rows.length}</strong> recipients from{' '}
              <code>{fileName}</code>.
            </p>
            <div style={{ background: 'var(--paper)', padding: 12, borderRadius: 4, marginBottom: 18, fontSize: 13 }}>
              <div><strong>Subject:</strong> {subject}</div>
              <div><strong>Recipient Column:</strong> {emailColumn}</div>
              <div><strong>Dynamic Variables:</strong> {columns.join(', ')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn" type="button" onClick={() => setConfirmSendOpen(false)}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={startBatchSending}>
                Yes, Start Sending
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
