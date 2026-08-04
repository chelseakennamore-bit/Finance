export type FilingStatus = 'mfj' | 'single' | 'hoh';
export type DebtStrategy = 'avalanche' | 'snowball';
export type TabKey =
  | 'overview'
  | 'income'
  | 'budget'
  | 'debt'
  | 'networth'
  | 'investments'
  | 'taxes'
  | 'scenario'
  | 'goals';

export interface Person {
  id: number;
  name: string;
  salary: number;
  bonus: number;
  contribution401kPct: number;
  insuranceMonthly: number;
}

export interface Expense {
  id: number;
  category: string;
  monthly: number;
}

export interface Debt {
  id: number;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
  /** Whether this debt is worked by the avalanche/snowball payoff planner. Undefined means true. */
  includeInPayoff?: boolean;
  /** Whether this debt is rolled into the hypothetical consolidation loan. Undefined means false. */
  includeInConsolidation?: boolean;
}

export interface Investment {
  id: number;
  name: string;
  type: string;
  balance: number;
  contribution: number;
}

export interface Assets {
  cash: number;
  homeValue: number;
  vehicles: number;
  other: number;
}

export interface Scenario {
  salaryA: number;
  salaryB: number;
  bonusA: number;
  bonusB: number;
  mortgage: number;
  otherExpenses: number;
  filingStatus: FilingStatus;
  pretax401kPct: number;
  insuranceMonthly: number;
  stateTaxRate: number;
}

export interface SavedScenario extends Scenario {
  id: number;
  label: string;
}

export interface NetWorthSnapshot {
  id: number;
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface Goal {
  id: number;
  label: string;
  targetAmount: number;
  assumedReturnPct: number;
}

export interface MonthlyActualEntry {
  category: string;
  amount: number;
}

export interface MonthlyActual {
  id: number;
  /** YYYY-MM */
  month: string;
  entries: MonthlyActualEntry[];
}

export interface BackupData {
  filingStatus: FilingStatus;
  stateTaxRate: number;
  people: Person[];
  expenses: Expense[];
  debts: Debt[];
  investments: Investment[];
  assets: Assets;
  scenario: Scenario;
  savedScenarios: SavedScenario[];
  netWorthHistory: NetWorthSnapshot[];
  monthlyActuals: MonthlyActual[];
  debtStrategy: DebtStrategy;
  debtExtraPayment: number;
  consolidationApr: number;
  consolidationTermMonths: number;
  goals: Goal[];
  nextId: number;
}
