import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { downloadJSON, isValidBackup, readJSONFile } from '../lib/backup';

export function BackupControls() {
  const exportBackup = useFinanceStore((s) => s.exportBackup);
  const restoreBackup = useFinanceStore((s) => s.restoreBackup);

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadJSON(`household-finance-backup-${date}.json`, exportBackup());
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readJSONFile(
      file,
      (data) => {
        if (!isValidBackup(data)) {
          alert("That file doesn't look like a Household Finance backup.");
          return;
        }
        if (confirm('Restoring this backup will replace all current data. Continue?')) {
          restoreBackup(data);
        }
      },
      (message) => alert(message)
    );
    e.target.value = '';
  };

  return (
    <div className="mt-5 pt-3.5 px-3 text-[11px] text-sidebar-muted border-t border-sidebar-border">
      Backup
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleExport}
          className="flex-1 px-2 py-1.5 rounded-md text-[12px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title cursor-pointer"
        >
          Export
        </button>
        <label className="flex-1 px-2 py-1.5 rounded-md text-[12px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title cursor-pointer text-center">
          Import
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </div>
    </div>
  );
}
