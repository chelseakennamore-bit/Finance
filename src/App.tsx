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
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex h-screen bg-cream font-sans text-body">
      <Sidebar />
      <div className="flex-1 overflow-y-auto px-12 py-10">
        <div className="max-w-[1180px] mx-auto flex flex-col gap-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
