import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { useFinanceStore } from './store/financeStore';
import { Overview } from './components/tabs/Overview';
import { IncomePay } from './components/tabs/IncomePay';
import { BudgetExpenses } from './components/tabs/BudgetExpenses';
import { Debt } from './components/tabs/Debt';
import { NetWorth } from './components/tabs/NetWorth';
import { Investments } from './components/tabs/Investments';
import { Taxes } from './components/tabs/Taxes';
import { ScenarioPlanner } from './components/tabs/ScenarioPlanner';
import { Goals } from './components/tabs/Goals';

const TAB_COMPONENTS = {
  overview: Overview,
  income: IncomePay,
  budget: BudgetExpenses,
  debt: Debt,
  networth: NetWorth,
  investments: Investments,
  taxes: Taxes,
  scenario: ScenarioPlanner,
  goals: Goals,
};

export default function App() {
  const activeTab = useFinanceStore((s) => s.activeTab);
  const hydrated = useFinanceStore((s) => s.hydrated);
  const hydrate = useFinanceStore((s) => s.hydrate);
  const refetchFromCloud = useFinanceStore((s) => s.refetchFromCloud);
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  useEffect(() => {
    hydrate();
    const onFocus = () => refetchFromCloud();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [hydrate, refetchFromCloud]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream font-sans text-body">
        <div className="text-sm text-muted">Loading household data…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-cream font-sans text-body">
      <Sidebar />
      <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 md:py-10">
        <div className="max-w-[1180px] mx-auto flex flex-col gap-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
