import { useEffect, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { useFinanceStore } from '../store/financeStore';
import type { FilingStatus, TabKey } from '../lib/types';
import { parseClampedNumber } from '../lib/validate';
import { logout, renameHousehold } from '../lib/auth';
import { BackupControls } from './BackupControls';
import { AccountSettings } from './AccountSettings';

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

function HouseholdLabel() {
  const householdName = useFinanceStore((s) => s.householdName);
  const setHouseholdName = useFinanceStore((s) => s.setHouseholdName);
  const [draft, setDraft] = useState(householdName);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(householdName), [householdName]);

  const commit = async (e: FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim();
    if (!trimmed || trimmed === householdName) {
      setDraft(householdName);
      return;
    }
    setSaving(true);
    const result = await renameHousehold(trimmed);
    setSaving(false);
    if (result.ok) {
      setHouseholdName(trimmed);
    } else {
      setDraft(householdName);
    }
  };

  return (
    <input
      value={draft}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
      onBlur={commit}
      disabled={saving}
      className="text-xs text-sidebar-muted bg-transparent border-none w-full focus:outline-none px-3 -mt-1 pb-4 md:pb-[18px]"
    />
  );
}

export function Sidebar() {
  const activeTab = useFinanceStore((s) => s.activeTab);
  const setTab = useFinanceStore((s) => s.setTab);
  const filingStatus = useFinanceStore((s) => s.filingStatus);
  const setFilingStatus = useFinanceStore((s) => s.setFilingStatus);
  const stateTaxRate = useFinanceStore((s) => s.stateTaxRate);
  const setStateTaxRate = useFinanceStore((s) => s.setStateTaxRate);
  const taxState = useFinanceStore((s) => s.taxState);
  const setTaxState = useFinanceStore((s) => s.setTaxState);

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div className="w-full md:w-[230px] md:shrink-0 bg-sidebar px-3.5 py-4 md:py-6.5 flex flex-col gap-3 md:gap-[3px] md:h-screen md:overflow-y-auto">
      <div className="text-[15px] font-bold text-sidebar-title px-3 tracking-wide">Household Finance</div>
      <HouseholdLabel />
      <div className="flex flex-row md:flex-col gap-1 md:gap-[3px] overflow-x-auto md:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeTab;
          return (
            <div
              key={item.key}
              onClick={() => setTab(item.key)}
              className="flex items-center px-3 py-2.5 rounded-lg cursor-pointer text-sm whitespace-nowrap shrink-0 md:whitespace-normal md:shrink"
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
      </div>
      <div className="mt-1 md:mt-5 pt-3.5 px-3 text-[11px] text-sidebar-muted border-t border-sidebar-border">
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
        <div className="mt-3">State</div>
        <select
          value={taxState}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setTaxState(e.target.value)}
          className="w-full mt-1.5 px-2 py-1.5 rounded-md text-[13px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title"
        >
          <option value="">Other (flat rate)</option>
          <option value="AL">Alabama</option>
        </select>
        {taxState === 'AL' ? (
          <div className="mt-2 text-[11px] text-sidebar-muted">Using Alabama's actual tax brackets.</div>
        ) : (
          <>
            <div className="mt-3">State tax rate (flat %)</div>
            <input
              type="number"
              step={0.1}
              value={stateTaxRate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStateTaxRate(parseClampedNumber(e.target.value))}
              className="w-full mt-1.5 px-2 py-1.5 rounded-md text-[13px] font-mono bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title"
            />
          </>
        )}
      </div>
      <BackupControls />
      <AccountSettings />
      <div className="pt-3.5 px-3 text-[11px] text-sidebar-muted border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full px-2 py-1.5 rounded-md text-[12px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title cursor-pointer"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
