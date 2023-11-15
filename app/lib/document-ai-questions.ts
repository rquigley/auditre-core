import dedent from 'dedent';

import { extractChartOfAccountsMapping } from '@/controllers/account-mapping';
import { head } from '@/lib/util';

import type { Document } from '@/types';

// import { balanceSheetTypes } from './consolidated-balance-sheet';

export interface AIQuestionBasic {
  id: string;
  label?: string;
  question: string;
  model?: string;
  preProcess?: (val: string) => string;
  validate?: (val: string) => boolean;
  respondInJSON?: boolean;
}
export interface AIQuestionCustom {
  id: string;
  label?: string;
  fn: (document: Document) => Promise<void>;
}

export type AIQuestion = AIQuestionBasic | AIQuestionCustom;

export const documentAiQuestions: Record<
  string,
  {
    questions: AIQuestion[];
  }
> = {
  ARTICLES_OF_INCORPORATION: {
    questions: [
      {
        id: 'incorporationDate',
        label: 'Date of incorporation',
        question: `What date was the company incorporated? Return only the date in the format of YYYY-MM-DD. If you don't find this date, return "-"`,
      },
      {
        id: 'numberOfShares',
        label: 'Number of shares',
        question:
          'How many shares does the company have the ability to offer? Return only the number without commas. If there are no numbers in your answer, return "-"',
      },
      {
        id: 'parValuePerShare',
        label: 'Par value per share',
        question:
          'What is the par value per share? Return only the number without commas. If there are no numbers in your answer, return "-"',
      },
      {
        id: 'incorporationJurisdiction',
        label: 'Jurisdiction of incorporation',
        question:
          'What is the jurisdiction of incorporation? Answer only with the jurisdiction',
      },
    ],
  },
  CHART_OF_ACCOUNTS: {
    questions: [
      {
        id: 'columnMappings',
        preProcess: (val: string) => head(val, 6),
        question: dedent`
            In this CSV content extract the following column properties:

            1. accountIdLabel and accountIdColumnIdx
            Which column contains the account IDs? What is it called? The columns are often named 'ID', 'Account No.' or 'Code'. It is usually the first or second column and values for rows likely contain numbers.
            If you can't find an account ID column, set accountIdLabel to '' and accountIdColumnIdx to -1

            2. accountNameLabel and accountNameColumnIdx
            Which column contains the account names? What is it called? The columns are often  labeled 'Account', 'Account Name', 'Name'. It is usually the first or second column and values for rows likely contain letters.
            If you can't find an account name column, set accountNameLabel to '' and accountNameColumnIdx to -1

            Return JSON with these four properties. Example:
            """Input CSV
            *Code,*Name,*Type,*Tax Code,Description,Dashboard,Expense Claims,Enable Payments,Balance\r                                                                                                                                                                                                                                                                                                                                                                                                                  +
            1200,Accounts Receivable,Accounts Receivable,Tax Exempt (0%),Outstanding invoices the company has issued out to the client but has not yet received in cash at balance date.,No,No,No,\r                                                                                                                                                                                                                                                                                                                    +
            1300,Prepayments,Current Asset,Tax Exempt (0%),An expenditure tha...
            """

            """Output JSON
            {
              "accountIdLabel": "*Code",
              "accountIdColumnIdx": 0,
              "accountNameLabel": "*Name",
              "accountNameColumnIdx": 1
            }
            """
            `,
        respondInJSON: true,
        //model: 'gpt-4',
      },
      // {
      //   id: 'accountMapping',
      //   fn: extractChartOfAccountsMapping,
      // },
    ],
  },
};
