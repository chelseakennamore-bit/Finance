import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../store/financeStore';
import type { FilingStatus, TabKey } from '../lib/types';
import { parseClampedNumber } from '../lib/validate';
import { BackupControls } from './BackupControls';

const NAV_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'income', label: 'Income & Pay' },
  { key: 'budget', label: 'Budget & Expenses' },
  { key: 'debt', label: 'Debt' },
  { key: 'networth', label: 'Net Worth' },
  { key: 'investments', label: 'Investments' },
  { key: 'taxes', label: 'Taxes' },
  { key: 'scenario', label: 'Scenario Planner' },
  { key: 'goals', label: 'Goals' },
];

export function Sidebar() {
  const activeTab = useFinanceStore((s) => s.activeTab);
  const setTab = useFinanceStore((s) => s.setTab);
  const filingStatus = useFinanceStore((s) => s.filingStatus);
  const setFilingStatus = useFinanceStore((s) => s.setFilingStatus);
  const stateTaxRate = useFinanceStore((s) => s.stateTaxRate);
  const setStateTaxRate = useFinanceStore((s) => s.setStateTaxRate);

  return (
    <div className="w-[230px] shrink-0 bg-sidebar px-3.5 py-6.5 flex flex-col gap-[3px] overflow-y-auto">
      <div className="text-[15px] font-bold text-sidebar-title px-3 pb-[22px] tracking-wide">Household Finance</div>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeTab;
        return (
          <div
            key={item.key}
            onClick={() => setTab(item.key)}
            className="flex items-center px-3 py-2.5 rounded-lg cursor-pointer text-sm"
            style={{
              background: isActive ? 'oklch(32% 0.03 45)' : 'transparent',
              color: isActive ? 'oklch(97% 0.01 75)' : 'oklch(78% 0.012 75)',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {item.label}
          </div>
        );
      })}
      <div className="mt-5 pt-3.5 px-3 text-[11px] text-sidebar-muted border-t border-sidebar-border">
        Household filing status
        <select
          value={filingStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilingStatus(e.target.value as FilingStatus)}
          className="w-full mt-2 px-2 py-1.5 rounded-md text-[13px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title"
        >
          <option value="mfj">Married filing jointly</option>
          <option value="single">Single</option>
          <option value="hoh">Head of household</option>
        </select>
        <div className="mt-3">State tax rate (flat %)</div>
        <input
          type="number"
          step={0.1}
          value={stateTaxRate}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setStateTaxRate(parseClampedNumber(e.target.value))}
          className="w-full mt-1.5 px-2 py-1.5 rounded-md text-[13px] font-mono bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title"
        />
      </div>
      <BackupControls />
    </div>
  );
}
