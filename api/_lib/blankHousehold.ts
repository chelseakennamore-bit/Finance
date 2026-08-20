/** Seed data for a brand-new household signup — same shape the client expects (matches
 * src/lib/types.ts's BackupData), but blanked out instead of the app's original demo
 * numbers, so a new household edits into their own numbers rather than over fake ones. */
export function blankHouseholdData() {
  return {
    filingStatus: 'mfj',
    stateTaxRate: 5,
    taxState: '',
    people: [
      { id: 1, name: '', salary: 0, bonus: 0, contribution401kPct: 0, insuranceMonthly: 0 },
      { id: 2, name: '', salary: 0, bonus: 0, contribution401kPct: 0, insuranceMonthly: 0 },
    ],
    expenses: [],
    debts: [],
    investments: [],
    assets: { cash: 0, homeValue: 0, vehicles: 0, other: 0 },
    scenario: {
      salaryA: 0,
      salaryB: 0,
      bonusA: 0,
      bonusB: 0,
      mortgage: 0,
      otherExpenses: 0,
      filingStatus: 'mfj',
      pretax401kPct: 0,
      insuranceMonthly: 0,
      stateTaxRate: 5,
    },
    savedScenarios: [],
    netWorthHistory: [],
    monthlyActuals: [],
    emergencyFundTargetMonths: 6,
    emergencyFundIncludedInvestmentIds: [],
    debtStrategy: 'avalanche',
    debtExtraPayment: 0,
    consolidationApr: 9,
    consolidationTermMonths: 60,
    goals: [],
    nextId: 100,
  };
}
