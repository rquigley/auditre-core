import dedent from 'dedent';
import * as z from 'zod';

// import { extractChartOfAccountsMapping } from '@/controllers/account-mapping';
import { head } from '@/lib/util';

import type { DocumentClassificationType } from '@/controllers/document-query';
import type { Document } from '@/types';

// import { balanceSheetTypes } from './consolidated-balance-sheet';

export interface AIQuestionBasic {
  label?: string;
  question: string;
  model?: string;
  preProcess?: (val: string) => string;
  validate?: z.ZodType<any>;
  respondInJSON?: boolean;
}
export interface AIQuestionCustom {
  label?: string;
  fn: (document: Document) => Promise<void>;
}

export type AIQuestion = AIQuestionBasic | AIQuestionCustom;

export const documentAiQuestions: {
  [K in DocumentClassificationType]?: Record<string, AIQuestion>;
} = {
  ARTICLES_OF_INCORPORATION: {
    incorporationDate: {
      label: 'Date of incorporation',
      question: `What date was the company incorporated? Return only the date in the format of YYYY-MM-DD. If you don't find this date, return "-"`,
    },
    numberOfShares: {
      label: 'Number of shares',
      question:
        'How many shares does the company have the ability to offer? Return only the number without commas. If there are no numbers in your answer, return "-"',
    },
    parValuePerShare: {
      label: 'Par value per share',
      question:
        'What is the par value per share? Return only the number without commas. If there are no numbers in your answer, return "-"',
    },
    incorporationJurisdiction: {
      label: 'Jurisdiction of incorporation',
      question:
        'What is the jurisdiction of incorporation? Answer only with the jurisdiction',
    },
  },
  CHART_OF_ACCOUNTS: {
    columnMappings: {
      preProcess: (val: string) => head(val, 10),
      question: dedent`
            In this CSV content extract the following column properties:

            1. accountIdColumnIdx
            Which column contains the account IDs? The columns are often named 'ID', 'Account No.' or 'Code'. It is usually the first or second column and values for rows likely contain numbers.
            If you can't find an account ID column, set accountIdColumnIdx to -1

            2. accountNameColumnIdx
            Which column contains the account names? The columns are often  labeled 'Account', 'Account Name', 'Name'. It is usually the first or second column and values for rows likely contain letters.
            If you can't find an account name column, set accountNameColumnIdx to -1

            3. otherColIdxs
            Which column ids contain other information? Don't include the columns you already identified in 1 and 2. If you can't find any other columns, set otherColIdxs to an empty array.

            Return JSON with these four properties. Examples:
            1. """Input CSV
            *Code,*Name,*Type,*Tax Code,Description,Dashboard,Expense Claims,Enable Payments,Balance\r                                                                                                                                                                                                                                                                                                                                                                                                                  +
            1200,Accounts Receivable,Accounts Receivable,Tax Exempt (0%),Outstanding invoices the company has issued out to the client but has not yet received in cash at balance date.,No,No,No,\r                                                                                                                                                                                                                                                                                                                    +
            1300,Prepayments,Current Asset,Tax Exempt (0%),An expenditure tha...
            """

            """Output JSON
            {
              "accountIdColumnIdx": 0,
              "accountNameColumnIdx": 1,
              "otherColIdxs": [2, 3, 4, 5, 6, 7, 8, 9]
            }
            """

            2. """Input CSV
            Account /Parent Account,Account Number,Account Type,Account Sub Type,Fresbhook Balance
            Cash,1000,Asset,Cash & Bank,$0.00
            Accounts Receivable,1200,Asset,Current Asset,$0.00...
            """

            """Output JSON
            {
              "accountIdColumnIdx": 1,
              "accountNameColumnIdx": 0,
              "otherColIdxs": [2, 3, 4]
            }
            """
            `,
      respondInJSON: true,
      validate: z.object({
        accountIdColumnIdx: z.number().min(-1).max(100),
        accountNameColumnIdx: z.number().min(-1).max(100),
        otherColIdxs: z.array(z.number().min(0).max(100)),
      }),
    },
    // {
    //   id: 'accountMapping',
    //   fn: extractChartOfAccountsMapping,
    // },
  },
  TRIAL_BALANCE: {
    trialBalanceDate: {
      label: 'Date of trial balance export',
      question: `What is the date this trial balance was exported? Return only the date in the format of YYYY-MM-DD. If you don't find this date, return "-"`,
      preProcess: (val: string) => head(val, 10),
    },
    columnMappings: {
      preProcess: (val: string) => head(val, 10),
      question: dedent`
            In this CSV content extract the following column properties:

            1. accountIdColumnIdx
            Which column contains the account IDs? The columns are often named 'ID', 'Account No.' or 'Code'.
            It is usually the first or second column and values for rows likely contain numbers.
            If you can't find an account ID column, set accountIdColumnIdx to -1

            2. accountNameColumnIdx
            Which column contains the account names? The columns are often labeled 'Account', 'Account Name', 'Name'.
            It is usually the first or second column and values for rows likely contain letters as well as numbers.
            If there are few columns in the CSV, the account name column might not have a label.
            If you can't find an account name column, set accountNameColumnIdx to -1

            3. debitColumnIdx
            Which column contains any debit amounts? The columns are often labeled 'Debit', 'Debit - Year to date', 'Debit amount'.
            If you can't find a debit column, set debitColumnIdx to -1

            4. creditColumnIdx
            Which column contains any credit amounts? The columns are often labeled 'Credit', 'Credit - Year to date', 'Credit amount'.
            If you can't find a credit column, set creditColumnIdx to -1

            5. currencyColumnIdx
            Which column contains the used currency for each account? The columns are often labeled 'Currency'.
            If you can't find a currency column, set currencyColumnIdx to -1

            Return JSON with these four properties. Examples:
            1. """Input CSV
            Account Number,Account Sub Type,Parent Account: Sub Account,Debit,Credit,Currency
            1000,Cash & Bank,Asset,0,0,USD
            1200,Current Asset,Asset,0,0,USD
            1204,Current Asset,Asset,0,0,USD...
            """

            """Output JSON
            {
              "accountIdColumnIdx": 0,
              "accountNameColumnIdx": 1,
              "debitColumnIdx": 3,
              "creditColumnIdx": 4,
              "currencyColumnIdx": 5
            }
            """

            2. """Input CSV
            Trial Balance,,,,,
            AuditRe,,,,,
            "As of December 31, 2022",,,,,
            ,,,,,
            Account Code,Account,Account Type,Debit - Year to date,Credit - Year to date,"Dec 31, 2021"
            1200,Accounts Receivable,Accounts Receivable,,4000,
            2500,Suspense,Current Liability,-2500,,...
            """

            """Output JSON
            {
              "accountIdColumnIdx": 0,
              "accountNameColumnIdx": 1,
              "debitColumnIdx": 3,
              "creditColumnIdx": 4,
              "currencyColumnIdx": -1
            }
            """

            3. """Input CSV
            [Company Name],,,,,
            Trial Balance,,,,,
            "As of December 31, 2019",,,,,
            ,,,,,
            ,Debit,Credit,,,
            0032 Foo Money Out Clearing,"120,000.25  ",,,,
            0120 Bar Clearing,,23.23  ,,,...
            """

            """Output JSON
            {
              "accountIdColumnIdx": -1,
              "accountNameColumnIdx": 0,
              "debitColumnIdx": 1,
              "creditColumnIdx": 2,
              "currencyColumnIdx": -1
            }
            """
            `,
      respondInJSON: true,
      validate: z.object({
        accountIdColumnIdx: z.number().min(-1).max(100),
        accountNameColumnIdx: z.number().min(-1).max(100),
        debitColumnIdx: z.number().min(-1).max(100),
        creditColumnIdx: z.number().min(-1).max(100),
        currencyColumnIdx: z.number().min(-1).max(100),
      }),
    },
  },
};
