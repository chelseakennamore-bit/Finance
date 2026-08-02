import type { FilingStatus, Person, Scenario } from './types';
import { STD_DED, marginalTax, baseFica, addlMedicare } from './taxCalc';

export interface PersonCalc extends Person {
  grossWithBonus: number;
  contribution401kAnnual: number;
  insuranceAnnual: number;
  fedWages: number;
  ficaWages: number;
  ssTax: number;
  medicareTax: number;
  allocTax: number;
  netAnnual: number;
}

export interface HouseholdCalc {
  totalGrossAnnual: number;
  peopleCalc: PersonCalc[];
  stdDeduction: number;
  taxableIncome: number;
  federalTaxAnnual: number;
  stateTaxAnnual: number;
  effectiveRate: number;
  totalFicaAnnual: number;
  addlMed: number;
  totalPretaxDeductions: number;
  netAnnualHousehold: number;
  netMonthlyHousehold: number;
  netBiweeklyHousehold: number;
}

/** Household-level tax + net-pay breakdown. Federal/state tax computed once on combined
 * income, then allocated back to each partner proportionally to their gross pay. */
export function computeHousehold(people: Person[], filingStatus: FilingStatus, stateTaxRate: number): HouseholdCalc {
  const totalGrossAnnual = people.reduce((sum, p) => sum + p.salary + (p.bonus || 0), 0);

  const base = people.map((p) => {
    const grossWithBonus = p.salary + (p.bonus || 0);
    const contribution401kAnnual = (grossWithBonus * (p.contribution401kPct || 0)) / 100;
    const insuranceAnnual = (p.insuranceMonthly || 0) * 12;
    const fedWages = Math.max(0, grossWithBonus - contribution401kAnnual - insuranceAnnual);
    const ficaWages = Math.max(0, grossWithBonus - insuranceAnnual);
    return { ...p, grossWithBonus, contribution401kAnnual, insuranceAnnual, fedWages, ficaWages };
  });

  const totalFedWages = base.reduce((sum, p) => sum + p.fedWages, 0);
  const totalFicaWages = base.reduce((sum, p) => sum + p.ficaWages, 0);
  const stdDeduction = STD_DED[filingStatus];
  const taxableIncome = Math.max(0, totalFedWages - stdDeduction);
  const federalTaxAnnual = marginalTax(taxableIncome, filingStatus);
  const stateTaxAnnual = (taxableIncome * (stateTaxRate || 0)) / 100;
  const effectiveRate = totalGrossAnnual ? (federalTaxAnnual / totalGrossAnnual) * 100 : 0;
  const totalBaseFica = base.reduce((sum, p) => sum + baseFica(p.ficaWages).total, 0);
  const addlMed = addlMedicare(totalFicaWages, filingStatus);
  const totalFicaAnnual = totalBaseFica + addlMed;
  const totalPretaxDeductions = base.reduce((sum, p) => sum + p.contribution401kAnnual + p.insuranceAnnual, 0);
  const netAnnualHousehold = totalGrossAnnual - totalPretaxDeductions - federalTaxAnnual - stateTaxAnnual - totalFicaAnnual;

  const peopleCalc: PersonCalc[] = base.map((p) => {
    const share = totalGrossAnnual ? p.grossWithBonus / totalGrossAnnual : 1 / people.length;
    const fica = baseFica(p.ficaWages);
    const allocTax = (federalTaxAnnual + stateTaxAnnual) * share;
    const allocAddlMed = addlMed * share;
    const netAnnual = p.grossWithBonus - p.contribution401kAnnual - p.insuranceAnnual - fica.total - allocAddlMed - allocTax;
    return { ...p, ssTax: fica.ss, medicareTax: fica.medicare, allocTax, netAnnual };
  });

  return {
    totalGrossAnnual,
    peopleCalc,
    stdDeduction,
    taxableIncome,
    federalTaxAnnual,
    stateTaxAnnual,
    effectiveRate,
    totalFicaAnnual,
    addlMed,
    totalPretaxDeductions,
    netAnnualHousehold,
    netMonthlyHousehold: netAnnualHousehold / 12,
    netBiweeklyHousehold: netAnnualHousehold / 26,
  };
}

export interface ScenarioCalc {
  grossTotal: number;
  fedTax: number;
  stateTax: number;
  totalFica: number;
  pretaxTotal: number;
  netAnnual: number;
  netMonthly: number;
  netBiweekly: number;
  expensesMonthly: number;
  expensesAnnual: number;
  expensesBiweekly: number;
  cashFlowMonthly: number;
  cashFlowAnnual: number;
  cashFlowBiweekly: number;
}

export function computeScenario(sc: Scenario): ScenarioCalc {
  const grossTotal = sc.salaryA + sc.salaryB + (sc.bonusA || 0) + (sc.bonusB || 0);
  const insuranceAnnualEach = ((sc.insuranceMonthly || 0) * 12) / 2;
  const pct = sc.pretax401kPct || 0;
  const c401kA = ((sc.salaryA + (sc.bonusA || 0)) * pct) / 100;
  const c401kB = ((sc.salaryB + (sc.bonusB || 0)) * pct) / 100;
  const ficaWagesA = Math.max(0, sc.salaryA + (sc.bonusA || 0) - insuranceAnnualEach);
  const ficaWagesB = Math.max(0, sc.salaryB + (sc.bonusB || 0) - insuranceAnnualEach);
  const fedWagesTotal = Math.max(0, grossTotal - c401kA - c401kB - insuranceAnnualEach * 2);
  const stdDed = STD_DED[sc.filingStatus] || STD_DED.mfj;
  const taxable = Math.max(0, fedWagesTotal - stdDed);
  const fedTax = marginalTax(taxable, sc.filingStatus || 'mfj');
  const stateTax = (taxable * (sc.stateTaxRate || 0)) / 100;
  const ficaA = baseFica(ficaWagesA);
  const ficaB = baseFica(ficaWagesB);
  const addlMed = addlMedicare(ficaWagesA + ficaWagesB, sc.filingStatus || 'mfj');
  const totalFica = ficaA.total + ficaB.total + addlMed;
  const pretaxTotal = c401kA + c401kB + insuranceAnnualEach * 2;
  const netAnnual = grossTotal - pretaxTotal - fedTax - stateTax - totalFica;
  const expensesMonthly = (sc.mortgage || 0) + (sc.otherExpenses || 0);
  const cashFlowMonthly = netAnnual / 12 - expensesMonthly;

  return {
    grossTotal,
    fedTax,
    stateTax,
    totalFica,
    pretaxTotal,
    netAnnual,
    netMonthly: netAnnual / 12,
    netBiweekly: netAnnual / 26,
    expensesMonthly,
    expensesAnnual: expensesMonthly * 12,
    expensesBiweekly: (expensesMonthly * 12) / 26,
    cashFlowMonthly,
    cashFlowAnnual: netAnnual - expensesMonthly * 12,
    cashFlowBiweekly: netAnnual / 26 - (expensesMonthly * 12) / 26,
  };
}

export interface GoalProjection {
  months: number;
  alreadyMet: boolean;
  reached: boolean;
}

/** Projects months to reach a savings target given a current balance, monthly contribution,
 * and assumed annual return (compounded monthly). Caps the search at 600 months (50 years). */
export function projectGoal(
  currentBalance: number,
  monthlyContribution: number,
  targetAmount: number,
  assumedReturnPct: number
): GoalProjection {
  let months = 0;
  let bal = currentBalance;
  const r = (assumedReturnPct || 0) / 100 / 12;
  const alreadyMet = bal >= targetAmount;
  while (bal < targetAmount && months < 600) {
    bal = bal * (1 + r) + monthlyContribution;
    months++;
  }
  return { months, alreadyMet, reached: bal >= targetAmount };
}
