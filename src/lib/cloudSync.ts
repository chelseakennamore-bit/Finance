import type { BackupData } from './types';

export async function fetchCloudData(): Promise<BackupData | null> {
  const res = await fetch('/api/household');
  if (!res.ok) throw new Error(`Cloud fetch failed: ${res.status}`);
  const body = await res.json();
  return body.data ?? null;
}

export async function saveCloudData(data: BackupData): Promise<void> {
  const res = await fetch('/api/household', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Cloud save failed: ${res.status}`);
}
