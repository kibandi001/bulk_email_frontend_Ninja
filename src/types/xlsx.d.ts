declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }

  export interface WorkSheet {
    [key: string]: unknown;
  }

  export function read(data: ArrayBuffer | Uint8Array, options?: Record<string, unknown>): WorkBook;
  export function writeFile(workbook: WorkBook, filename: string, options?: Record<string, unknown>): void;

  export namespace utils {
    function sheet_to_json<T = Record<string, unknown>>(
      worksheet: WorkSheet,
      options?: Record<string, unknown>
    ): T[];

    function json_to_sheet<T extends Record<string, unknown>>(
      data: T[],
      options?: Record<string, unknown>
    ): WorkSheet;

    function book_new(): WorkBook;

    function book_append_sheet(
      workbook: WorkBook,
      worksheet: WorkSheet,
      sheetName: string,
      origin?: string | number
    ): void;
  }
}
