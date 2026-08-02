export interface CsvColumn<T> {
  key: keyof T;
  label: string;
  numeric?: boolean;
}

export function exportCSV<T extends object>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((r) => columns.map((c) => String(r[c.key]).replace(/,/g, '')).join(','));
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importCSV<T extends object>(
  file: File,
  columns: CsvColumn<T>[],
  onRows: (rows: T[]) => void
): void {
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result)
      .split(/\r?\n/)
      .filter((l) => l.trim().length);
    lines.shift();
    const rows = lines.map((line, i) => {
      const cells = line.split(',');
      const obj: Record<string, unknown> = { id: Date.now() + i };
      columns.forEach((c, idx) => {
        obj[c.key as string] = c.numeric ? parseFloat(cells[idx]) || 0 : cells[idx] || '';
      });
      return obj as T;
    });
    onRows(rows);
  };
  reader.readAsText(file);
}
