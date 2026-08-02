import type { BackupData } from './types';

export function downloadJSON(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readJSONFile(file: File, onData: (data: unknown) => void, onError: (message: string) => void): void {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      onData(JSON.parse(String(reader.result)));
    } catch {
      onError('That file is not valid JSON.');
    }
  };
  reader.onerror = () => onError('Could not read that file.');
  reader.readAsText(file);
}

/** Structural sanity check — not full runtime validation, just enough to reject an unrelated
 * or corrupted file before it overwrites the household's data. */
export function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.people) &&
    Array.isArray(d.expenses) &&
    Array.isArray(d.debts) &&
    Array.isArray(d.investments) &&
    Array.isArray(d.savedScenarios) &&
    Array.isArray(d.netWorthHistory) &&
    typeof d.assets === 'object' &&
    d.assets !== null &&
    typeof d.scenario === 'object' &&
    d.scenario !== null &&
    typeof d.goal === 'object' &&
    d.goal !== null &&
    typeof d.nextId === 'number'
  );
}
