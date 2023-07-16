import { db } from '@/lib/db';
import { delay } from '@/lib/util';
import { RequestUpdate, Request, NewRequest } from '@/types';
import { nanoid } from 'nanoid';

export function create(request: NewRequest): Promise<Request> {
  if (!request.externalId) {
    request.externalId = nanoid();
  }
  return db
    .insertInto('request')
    .values(request)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function getById(id: number): Promise<Request> {
  return db
    .selectFrom('request')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function getAllByOrgId(orgId: number): Promise<Request[]> {
  return db
    .selectFrom('request')
    .where('orgId', '=', orgId)
    .selectAll()
    .execute();
}

export async function update(id: number, updateWith: RequestUpdate) {
  return db
    .updateTable('request')
    .set(updateWith)
    .where('id', '=', id)
    .execute();
}

export interface DummyRequest {
  id: number;
  slug: string;
  name: string;
  description: string;
  dueDate: Date;
  requestee: string;
  owners: string[];
  status: 'requested' | 'complete' | 'overdue';
}

function getTestRequests(n: number): DummyRequest[] {
  const taskNames = [
    'Quarterly Budget Review',
    'Annual Tax Preparation',
    'Investment Risk Analysis',
    'Audit of Operations',
    'Financial Forecasting',
    'Debt Restructuring Plan',
    'Capital Budgeting',
    'Cash Flow Analysis',
    'Expense Report Audit',
    'Profit and Loss Statement',
    'Corporate Tax Filing',
    'Sales Forecast',
    'Cost Management Plan',
    'Risk Management Plan',
    'Annual Revenue Report',
    'Accounts Receivable Analysis',
    'Accounts Payable Analysis',
    'Investment Portfolio Review',
    'Strategic Financial Planning',
    'Employee Compensation Plan',
    'Credit Management Plan',
    'Pension Fund Management',
    'Insurance Premium Review',
    'Stock Market Investment Strategy',
    'Private Equity Investment Analysis',
    'Venture Capital Investment Analysis',
    'Mergers and Acquisitions Planning',
    'Asset Depreciation Report',
    'Real Estate Investment Analysis',
    'Payroll Processing',
    'Internal Control System Review',
    'Equity Financing Plan',
    'Debt Financing Plan',
    'Working Capital Analysis',
    'Fixed Assets Management',
    'Inventory Cost Analysis',
    'Overhead Costs Analysis',
    'Currency Exchange Risk Analysis',
    'Supply Chain Finance Management',
    'Treasury Stock Management',
    'Revenue Recognition Review',
    'Lease Accounting',
    'Impairment Loss Analysis',
    'Deferred Tax Calculation',
    'Business Valuation',
    'Due Diligence for Acquisition',
    'Cost of Capital Calculation',
    'Interest Rate Swap Analysis',
    'Bond Portfolio Management',
    'Preparation of Financial Statements',
  ];

  const descriptions = [
    'Review and adjust the Q3 budget based on Q2 results',
    'Prepare all necessary documents for annual tax filing',
    'Analyze potential risks for upcoming investment',
    'Conduct internal audit of financial operations',
    'Create a financial forecast for next fiscal year',
    "Create a plan for restructuring the company's debt",
    "Plan and analyze company's large, long-term investments",
    "Perform analysis on the company's inflow and outflow of cash",
    'Audit employee expense reports for compliance',
    "Create a statement showing the company's profits and losses",
    "Prepare and file the company's corporate taxes",
    'Create a sales forecast for the next quarter',
    "Develop a plan for managing the company's costs",
    'Create a plan for managing financial risk',
    "Prepare a report on the company's annual revenue",
    'Analyze accounts receivable to optimize collection',
    'Analyze accounts payable to optimize cash flow',
    "Review the company's investment portfolio for performance",
    "Plan the company's financial strategy for the next five years",
    'Create a plan for employee compensation including salaries and benefits',
    "Develop a plan for managing the company's credit",
    "Plan the management of the company's pension fund",
    "Review the company's insurance premiums for potential savings",
    'Develop a strategy for investing in the stock market',
    'Analyze potential private equity investments',
    'Analyze potential venture capital investments',
    'Plan potential company mergers and acquisitions',
    "Prepare a report on the depreciation of the company's assets",
    'Analyze potential real estate investments',
    "Process the company's payroll for the month",
    "Review the company's internal control systems",
    'Plan for raising money through equity financing',
    'Plan for raising money through debt financing',
    "Analyze the company's working capital",
    "Manage the company's fixed assets",
    'Analyze the cost of inventory',
    "Analyze the company's overhead costs",
    'Analyze potential risks from currency exchange rates',
    'Manage finances in the supply chain',
    "Manage the company's treasury stock",
    "Review the company's revenue recognition practices",
    "Account for the company's leases",
    'Analyze potential impairment losses',
    "Calculate the company's deferred tax liabilities",
    'Perform a valuation of the business',
    'Perform due diligence for potential acquisition',
    "Calculate the company's cost of capital",
    'Analyze potential interest rate swaps',
    "Manage the company's bond portfolio",
    "Prepare the company's financial statements",
  ];

  const requestees = [
    'John Doe',
    'Alice Williams',
    'Bob Johnson',
    'Jane Smith',
  ];
  const ownersList = [
    ['Jane Smith', 'Bob Johnson'],
    ['John Doe'],
    ['Alice Williams', 'John Doe'],
    ['Alice Williams'],
  ];
  const statuses = ['requested', 'complete', 'overdue'] as const;

  let items = [];

  for (let i = 0; i < n; i++) {
    const dueDate = new Date(
      `2023-${(Math.floor(Math.random() * 12) + 1)
        .toString()
        .padStart(2, '0')}-${(Math.floor(Math.random() * 12) + 1)
        .toString()
        .padStart(2, '0')}T00:00:00Z`,
    );

    dueDate.setDate(dueDate.getDate() + i);
    const item = {
      id: i + 1,
      slug: (i + 1).toString(),
      name: taskNames[i % taskNames.length],
      description: descriptions[i % descriptions.length],
      dueDate: dueDate,
      requestee: requestees[i % requestees.length],
      owners: ownersList[i % ownersList.length],
      status: statuses[i % statuses.length],
    };
    items.push(item);
  }

  return items;
}

export async function getAll() {
  const defaultRequests = [
    {
      id: 'def-1',
      slug: 'def-1',
      name: 'Legal name of business',
      description: '',
      dueDate: null,
      requestee: null,
      owners: [],
      status: 'requested',
    },
  ];
  // TODO: Temporarily delay the response to simulate slower network
  //await delay(1000);
  //return [...defaultRequests, ...getTestRequests(50)];
  return defaultRequests;
}
