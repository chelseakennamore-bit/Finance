import { create } from 'zustand';
import type {
  Assets,
  BackupData,
  Debt,
  DebtStrategy,
  Expense,
  FilingStatus,
  Goal,
  Investment,
  MonthlyActual,
  MonthlyActualEntry,
  NetWorthSnapshot,
  Person,
  SavedScenario,
  Scenario,
  TabKey,
} from '../lib/types';
import { fetchCloudData, saveCloudData } from '../lib/cloudSync';
import { isValidBackup } from '../lib/backup';

const LEGACY_LOCAL_STORAGE_KEY = 'household-finance';

/** Normalizes older stored shapes (a single `goal` object, pre-dating the goals list) into
 * the current `goals` array so existing cloud/localStorage data keeps working after upgrade. */
function migrateGoals(data: any): Goal[] {
  if (Array.isArray(data?.goals) && data.goals.length > 0) return data.goals;
  if (data?.goal) {
    return [{ id: 1, label: 'Primary goal', targetAmount: data.goal.targetAmount, assumedReturnPct: data.goal.assumedReturnPct }];
  }
  return [{ id: 1, label: 'Primary goal', targetAmount: 50000, assumedReturnPct: 6 }];
}

/** Older stored shapes pre-date the monthly-actuals feature entirely. */
function migrateMonthlyActuals(data: any): MonthlyActual[] {
  return Array.isArray(data?.monthlyActuals) ? data.monthlyActuals : [];
}

/** Older stored shapes pre-date the editable emergency fund target. */
function migrateEmergencyFundTargetMonths(data: any): number {
  return typeof data?.emergencyFundTargetMonths === 'number' ? data.emergencyFundTargetMonths : 6;
}

interface FinanceState {
  hydrated: boolean;
  activeTab: TabKey;
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
  emergencyFundTargetMonths: number;
  debtStrategy: DebtStrategy;
  debtExtraPayment: number;
  consolidationApr: number;
  consolidationTermMonths: number;
  goals: Goal[];
  nextId: number;

  hydrate: () => Promise<void>;
  refetchFromCloud: () => Promise<void>;

  setTab: (tab: TabKey) => void;
  setFilingStatus: (status: FilingStatus) => void;
  setStateTaxRate: (rate: number) => void;

  updatePerson: <K extends keyof Person>(id: number, field: K, value: Person[K]) => void;

  updateExpense: <K extends keyof Expense>(id: number, field: K, value: Expense[K]) => void;
  addExpense: () => void;
  removeExpense: (id: number) => void;
  setExpenses: (rows: Expense[]) => void;

  updateDebt: <K extends keyof Debt>(id: number, field: K, value: Debt[K]) => void;
  addDebt: () => void;
  removeDebt: (id: number) => void;
  setDebts: (rows: Debt[]) => void;
  setDebtStrategy: (strategy: DebtStrategy) => void;
  setDebtExtraPayment: (amount: number) => void;
  /** Rolling a debt into consolidation also takes it out of the individual payoff plan
   * (it's being replaced by the new loan), and un-rolling restores it. */
  setDebtConsolidation: (id: number, included: boolean) => void;
  setConsolidationApr: (apr: number) => void;
  setConsolidationTermMonths: (months: number) => void;

  updateInvestment: <K extends keyof Investment>(id: number, field: K, value: Investment[K]) => void;
  addInvestment: () => void;
  removeInvestment: (id: number) => void;
  setInvestments: (rows: Investment[]) => void;

  updateAsset: <K extends keyof Assets>(field: K, value: Assets[K]) => void;

  updateScenario: <K extends keyof Scenario>(field: K, value: Scenario[K]) => void;
  resetScenario: () => void;
  saveScenarioSnapshot: () => void;
  updateSavedScenarioLabel: (id: number, label: string) => void;
  removeSavedScenario: (id: number) => void;

  saveNetWorthSnapshot: (assets: number, liabilities: number, netWorth: number) => void;
  removeSnapshot: (id: number) => void;

  /** Upserts by month — saving the same month again replaces its entries rather than duplicating. */
  saveMonthlyActual: (month: string, entries: MonthlyActualEntry[]) => void;
  removeMonthlyActual: (id: number) => void;

  addGoal: () => void;
  removeGoal: (id: number) => void;
  updateGoal: <K extends keyof Goal>(id: number, field: K, value: Goal[K]) => void;
  setGoalInvestmentIncluded: (goalId: number, investmentId: number, included: boolean) => void;

  setEmergencyFundTargetMonths: (months: number) => void;

  exportBackup: () => BackupData;
  restoreBackup: (data: BackupData) => void;
}

const initialPeople: Person[] = [
  { id: 1, name: 'Partner A', salary: 95000, bonus: 0, contribution401kPct: 6, insuranceMonthly: 150 },
  { id: 2, name: 'Partner B', salary: 72000, bonus: 0, contribution401kPct: 5, insuranceMonthly: 150 },
];

const initialExpenses: Expense[] = [
  { id: 1, category: 'Mortgage / Rent', monthly: 2400 },
  { id: 2, category: 'Utilities', monthly: 280 },
  { id: 3, category: 'Groceries', monthly: 650 },
  { id: 4, category: 'Transportation', monthly: 420 },
  { id: 5, category: 'Insurance', monthly: 310 },
  { id: 6, category: 'Childcare', monthly: 0 },
  { id: 7, category: 'Subscriptions', monthly: 65 },
  { id: 8, category: 'Discretionary', monthly: 400 },
];

const initialDebts: Debt[] = [
  { id: 1, name: 'Mortgage', balance: 385000, apr: 6.25, minPayment: 2400, includeInPayoff: true },
  { id: 2, name: 'Car Loan', balance: 18500, apr: 5.9, minPayment: 365, includeInPayoff: true },
  { id: 3, name: 'Student Loan', balance: 22000, apr: 4.5, minPayment: 230, includeInPayoff: true },
  { id: 4, name: 'Credit Card', balance: 3200, apr: 22.9, minPayment: 120, includeInPayoff: true },
];

const initialInvestments: Investment[] = [
  { id: 1, name: 'Partner A 401(k)', type: '401(k)', balance: 142000, contribution: 950 },
  { id: 2, name: 'Partner B 401(k)', type: '401(k)', balance: 88000, contribution: 600 },
  { id: 3, name: 'Roth IRA', type: 'Roth IRA', balance: 41000, contribution: 400 },
  { id: 4, name: 'Brokerage', type: 'Taxable', balance: 26500, contribution: 200 },
];

const initialAssets: Assets = { cash: 24000, homeValue: 520000, vehicles: 28000, other: 6000 };

const initialScenario: Scenario = {
  salaryA: 95000,
  salaryB: 72000,
  bonusA: 0,
  bonusB: 0,
  mortgage: 2400,
  otherExpenses: 2125,
  filingStatus: 'mfj',
  pretax401kPct: 6,
  insuranceMonthly: 300,
  stateTaxRate: 5,
};

/** True while state was just set from a cloud fetch, so the save-on-change
 * subscriber below doesn't immediately PUT back what it just received. */
let applyingRemote = false;

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  hydrated: false,
  activeTab: 'overview',
  filingStatus: 'mfj',
  stateTaxRate: 5,
  people: initialPeople,
  expenses: initialExpenses,
  debts: initialDebts,
  investments: initialInvestments,
  assets: initialAssets,
  scenario: initialScenario,
  savedScenarios: [],
  netWorthHistory: [],
  monthlyActuals: [],
  emergencyFundTargetMonths: 6,
  debtStrategy: 'avalanche',
  debtExtraPayment: 200,
  consolidationApr: 9,
  consolidationTermMonths: 60,
  goals: [{ id: 1, label: 'Primary goal', targetAmount: 50000, assumedReturnPct: 6 }],
  nextId: 100,

  hydrate: async () => {
    try {
      const cloud = await fetchCloudData();
      if (cloud) {
        if (!isValidBackup(cloud)) {
          console.error('Cloud data failed validation — ignoring it and falling back to defaults', cloud);
          set({ hydrated: true });
          return;
        }
        applyingRemote = true;
        set({
          ...cloud,
          goals: migrateGoals(cloud),
          monthlyActuals: migrateMonthlyActuals(cloud),
          emergencyFundTargetMonths: migrateEmergencyFundTargetMonths(cloud),
          hydrated: true,
        });
        applyingRemote = false;
        return;
      }
    } catch (e) {
      console.error('Failed to load household data from the cloud', e);
    }

    // No cloud data yet — migrate this browser's previously-persisted local copy, if any.
    const legacy = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (legacy) {
      try {
        const state = JSON.parse(legacy).state;
        if (state) {
          applyingRemote = true;
          set({
            ...state,
            goals: migrateGoals(state),
            monthlyActuals: migrateMonthlyActuals(state),
            emergencyFundTargetMonths: migrateEmergencyFundTargetMonths(state),
            hydrated: true,
          });
          applyingRemote = false;
          saveCloudData(get().exportBackup()).catch((e) => console.error('Cloud seed failed', e));
          return;
        }
      } catch (e) {
        console.error('Failed to read legacy local data', e);
      }
    }

    // Nothing anywhere yet — seed the cloud with the built-in defaults.
    set({ hydrated: true });
    saveCloudData(get().exportBackup()).catch((e) => console.error('Cloud seed failed', e));
  },

  refetchFromCloud: async () => {
    try {
      const cloud = await fetchCloudData();
      if (cloud) {
        if (!isValidBackup(cloud)) {
          console.error('Cloud data failed validation on refetch — ignoring it', cloud);
          return;
        }
        applyingRemote = true;
        set({
          ...cloud,
          goals: migrateGoals(cloud),
          monthlyActuals: migrateMonthlyActuals(cloud),
          emergencyFundTargetMonths: migrateEmergencyFundTargetMonths(cloud),
        });
        applyingRemote = false;
      }
    } catch (e) {
      console.error('Failed to refresh household data from the cloud', e);
    }
  },

  setTab: (tab) => set({ activeTab: tab }),
  setFilingStatus: (status) => set({ filingStatus: status }),
  setStateTaxRate: (rate) => set({ stateTaxRate: rate }),

  updatePerson: (id, field, value) =>
    set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, [field]: value } : p)) })),

  updateExpense: (id, field, value) =>
    set((s) => ({ expenses: s.expenses.map((x) => (x.id === id ? { ...x, [field]: value } : x)) })),
  addExpense: () =>
    set((s) => ({
      expenses: [...s.expenses, { id: s.nextId, category: 'New Category', monthly: 0 }],
      nextId: s.nextId + 1,
    })),
  removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),
  setExpenses: (rows) => set((s) => ({ expenses: rows, nextId: s.nextId + rows.length })),

  updateDebt: (id, field, value) =>
    set((s) => ({ debts: s.debts.map((d) => (d.id === id ? { ...d, [field]: value } : d)) })),
  addDebt: () =>
    set((s) => ({
      debts: [...s.debts, { id: s.nextId, name: 'New Debt', balance: 0, apr: 0, minPayment: 0, includeInPayoff: true }],
      nextId: s.nextId + 1,
    })),
  removeDebt: (id) => set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),
  setDebts: (rows) => set((s) => ({ debts: rows, nextId: s.nextId + rows.length })),
  setDebtStrategy: (strategy) => set({ debtStrategy: strategy }),
  setDebtExtraPayment: (amount) => set({ debtExtraPayment: amount }),
  setDebtConsolidation: (id, included) =>
    set((s) => ({
      debts: s.debts.map((d) =>
        d.id === id ? { ...d, includeInConsolidation: included, includeInPayoff: !included } : d
      ),
    })),
  setConsolidationApr: (apr) => set({ consolidationApr: apr }),
  setConsolidationTermMonths: (months) => set({ consolidationTermMonths: months }),

  updateInvestment: (id, field, value) =>
    set((s) => ({ investments: s.investments.map((v) => (v.id === id ? { ...v, [field]: value } : v)) })),
  addInvestment: () =>
    set((s) => ({
      investments: [...s.investments, { id: s.nextId, name: 'New Account', type: 'Taxable', balance: 0, contribution: 0 }],
      nextId: s.nextId + 1,
    })),
  removeInvestment: (id) => set((s) => ({ investments: s.investments.filter((v) => v.id !== id) })),
  setInvestments: (rows) => set((s) => ({ investments: rows, nextId: s.nextId + rows.length })),

  updateAsset: (field, value) => set((s) => ({ assets: { ...s.assets, [field]: value } })),

  updateScenario: (field, value) => set((s) => ({ scenario: { ...s.scenario, [field]: value } })),
  resetScenario: () =>
    set((s) => {
      const mortgageItem = s.expenses.find((x) => /mortgage|rent/i.test(x.category));
      const mortgage = mortgageItem ? mortgageItem.monthly : 0;
      const otherExpenses = s.expenses
        .filter((x) => x !== mortgageItem)
        .reduce((sum, x) => sum + x.monthly, 0);
      const a = s.people[0];
      const b = s.people[1];
      const avgPct = ((a?.contribution401kPct || 0) + (b?.contribution401kPct || 0)) / 2;
      const combinedInsurance = (a?.insuranceMonthly || 0) + (b?.insuranceMonthly || 0);
      return {
        scenario: {
          salaryA: a?.salary || 0,
          salaryB: b?.salary || 0,
          bonusA: a?.bonus || 0,
          bonusB: b?.bonus || 0,
          mortgage,
          otherExpenses,
          filingStatus: s.filingStatus,
          pretax401kPct: avgPct,
          insuranceMonthly: combinedInsurance,
          stateTaxRate: s.stateTaxRate,
        },
      };
    }),
  saveScenarioSnapshot: () =>
    set((s) => ({
      savedScenarios: [
        ...s.savedScenarios,
        { id: s.nextId, label: 'Scenario ' + (s.savedScenarios.length + 1), ...s.scenario },
      ],
      nextId: s.nextId + 1,
    })),
  updateSavedScenarioLabel: (id, label) =>
    set((s) => ({ savedScenarios: s.savedScenarios.map((sc) => (sc.id === id ? { ...sc, label } : sc)) })),
  removeSavedScenario: (id) => set((s) => ({ savedScenarios: s.savedScenarios.filter((sc) => sc.id !== id) })),

  saveNetWorthSnapshot: (assets, liabilities, netWorth) =>
    set((s) => ({
      netWorthHistory: [
        ...s.netWorthHistory,
        { id: s.nextId, date: new Date().toISOString().slice(0, 10), assets, liabilities, netWorth },
      ],
      nextId: s.nextId + 1,
    })),
  removeSnapshot: (id) => set((s) => ({ netWorthHistory: s.netWorthHistory.filter((h) => h.id !== id) })),

  saveMonthlyActual: (month, entries) =>
    set((s) => {
      const existing = s.monthlyActuals.find((m) => m.month === month);
      if (existing) {
        return { monthlyActuals: s.monthlyActuals.map((m) => (m.month === month ? { ...m, entries } : m)) };
      }
      return { monthlyActuals: [...s.monthlyActuals, { id: s.nextId, month, entries }], nextId: s.nextId + 1 };
    }),
  removeMonthlyActual: (id) => set((s) => ({ monthlyActuals: s.monthlyActuals.filter((m) => m.id !== id) })),

  addGoal: () =>
    set((s) => ({
      goals: [...s.goals, { id: s.nextId, label: 'New goal', targetAmount: 10000, assumedReturnPct: 6 }],
      nextId: s.nextId + 1,
    })),
  removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
  updateGoal: (id, field, value) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, [field]: value } : g)) })),
  setGoalInvestmentIncluded: (goalId, investmentId, included) =>
    set((s) => ({
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g;
        const excluded = new Set(g.excludedInvestmentIds || []);
        if (included) excluded.delete(investmentId);
        else excluded.add(investmentId);
        return { ...g, excludedInvestmentIds: Array.from(excluded) };
      }),
    })),

  setEmergencyFundTargetMonths: (months) => set({ emergencyFundTargetMonths: months }),

  exportBackup: () => {
    const s = get();
    return {
      filingStatus: s.filingStatus,
      stateTaxRate: s.stateTaxRate,
      people: s.people,
      expenses: s.expenses,
      debts: s.debts,
      investments: s.investments,
      assets: s.assets,
      scenario: s.scenario,
      savedScenarios: s.savedScenarios,
      netWorthHistory: s.netWorthHistory,
      monthlyActuals: s.monthlyActuals,
      emergencyFundTargetMonths: s.emergencyFundTargetMonths,
      debtStrategy: s.debtStrategy,
      debtExtraPayment: s.debtExtraPayment,
      consolidationApr: s.consolidationApr,
      consolidationTermMonths: s.consolidationTermMonths,
      goals: s.goals,
      nextId: s.nextId,
    };
  },
  restoreBackup: (data) =>
    set(() => ({
      ...data,
      goals: migrateGoals(data),
      monthlyActuals: migrateMonthlyActuals(data),
      emergencyFundTargetMonths: migrateEmergencyFundTargetMonths(data),
    })),
}));

let saveTimer: ReturnType<typeof setTimeout> | null = null;

useFinanceStore.subscribe((state) => {
  if (!state.hydrated || applyingRemote) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveCloudData(state.exportBackup()).catch((e) => console.error('Cloud save failed', e));
  }, 800);
});
