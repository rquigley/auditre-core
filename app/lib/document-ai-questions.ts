import dedent from 'dedent';
import * as z from 'zod';

import { extractLinesContaining, head } from '@/lib/util';

import type { DocumentClassificationType } from '@/controllers/document';
import type { Document } from '@/types';

const yesNoSchema = z
  .string()
  .transform((val) => val.toLowerCase())
  .refine((val) => ['yes', 'no', '-'].includes(val));

const dateRegex = /\d{4}-\d{2}-\d{2}/;
const extractDateString = (input: string) => {
  const match = input.match(dateRegex);
  return match ? match[0] : null;
};
const dateSchema = z.string().refine(
  (data) => {
    const dateString = extractDateString(data);
    if (!dateString) return false;

    const date = new Date(dateString);
    return !isNaN(date.getTime());
  },
  {
    message: 'Invalid date format or value.',
  },
);

const numberSchema = z.string().transform((val) => val.replace(/[^\d\.]/g, ''));

const questionYesNo =
  'If so, answer "yes". If not, answer "no". If you cannot determine, answer "-"';
const questionDate = `Return _only_ the date in the format of YYYY-MM-DD. Do not add any other information other than the date. If you don't find this date, return "-"`;

export interface AIQuestionBasic {
  label?: string;
  question: string;
  model?: string;
  preProcess?: (val: string) => string;
  validate: z.ZodTypeAny;
}
export interface AIQuestionJSON {
  label?: string;
  question: string;
  model?: string;
  preProcess?: (val: string) => string;
  respondInJSON: boolean;
  // Always validate JSON repsonses
  validate: z.ZodTypeAny;
}
export interface AIQuestionCustom {
  label?: string;
  fn: (document: Document) => Promise<void>;
}

export type AIQuestion = AIQuestionBasic | AIQuestionJSON | AIQuestionCustom;

export function isAIQuestionJSON(
  question: AIQuestion,
): question is AIQuestionJSON {
  return (question as AIQuestionJSON).respondInJSON !== undefined;
}

export const documentAiQuestions: Partial<
  Record<
    DocumentClassificationType,
    {
      [identifier: string]: AIQuestion;
    }
  >
> = {
  // export const documentAiQuestions: {

  //   ARTICLES_OF_INCORPORATION: {
  //     [identifier: string]: AIQuestion;
  //   };
  //   CHART_OF_ACCOUNTS: {
  //     [identifier: string]: AIQuestion;
  //   };
  //   TRIAL_BALANCE: {
  //     [identifier: string]: AIQuestion;
  //   };
  // } = {
  ARTICLES_OF_INCORPORATION: {
    incorporationDate: {
      label: 'Date of incorporation',
      question: `What date was the company incorporated? ${questionDate}`,
      validate: dateSchema,
    },
    numberOfShares: {
      label: 'Number of shares',
      question:
        'How many shares does the company have the ability to offer? Return only the number without commas. If there are no numbers in your answer, return "-"',
      validate: numberSchema,
    },
    parValuePerShare: {
      label: 'Par value per share',
      question:
        'What is the par value per share? Return only the number without commas. If there are no numbers in your answer, return "-"',
      validate: numberSchema,
    },
    incorporationJurisdiction: {
      label: 'Jurisdiction of incorporation',
      question:
        'What is the jurisdiction of incorporation? Answer only with the jurisdiction',
      validate: z.string(),
    },
  },
  TRIAL_BALANCE: {
    trialBalanceDate: {
      label: 'Date of trial balance export',
      question: `What is the date this trial balance was exported? ${questionDate}. If the day is not available, but the month and year are, return the last day of the month for the date, e.g. "Dec 2022" returns "2022-12-31"`,
      preProcess: (val: string) => head(val, 10),
      validate: dateSchema,
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
        accountIdColumnIdx: z.number().min(-1).max(10),
        accountNameColumnIdx: z.number().min(-1).max(10),
        debitColumnIdx: z.number().min(-1).max(10),
        creditColumnIdx: z.number().min(-1).max(10),
        currencyColumnIdx: z.number().min(-1).max(10),
      }),
    },
    // hasResearchAndDevelopment: {
    //   label: 'Has research and development accounts',
    //   question:
    //     `Does this data mention research and development? ${questionYesNo}`,
    //   preProcess: (val: string) =>
    //     extractLinesContaining(val, ['research', 'development']).join('\n'),
    //   validate: yesNoSchema,
    // },
    // hasAdvertisingMarketing: {
    //   label: 'Has advertising and/or marketing accounts',
    //   question:
    //     `Does this data mention a marketing and/or advertising costs? ${questionYesNo}`,
    //   preProcess: (val: string) =>
    //     extractLinesContaining(val, ['advertising', 'marketing']).join('\n'),
    //   validate: yesNoSchema,
    // },
    hasIntangibleAssets: {
      label: 'Has intangible assets',
      question: `Does this data mention intangible assets? ${questionYesNo}`,
      preProcess: (val: string) =>
        extractLinesContaining(val, ['intangible', 'asset']).join('\n'),
      validate: yesNoSchema,
    },
    hasfixedAssets: {
      label: 'Has fixed assets',
      question: `Does this data mention fixed assets? ${questionYesNo}`,
      preProcess: (val: string) =>
        extractLinesContaining(val, ['asset']).join('\n'),
      validate: yesNoSchema,
    },
    fixedAssetCategories: {
      label: 'Fixed asset categories',
      question: `If there are "fixed asset" accounts in this trial balance data, provide the categories that would be used in a "Property and equipment, net" section of a financial statement.


      For example, if there are "Land", "Buildings", "Equipment", and "Furniture and fixtures" accounts, return the following JSON:
      {
        "categories": ["Land", "Buildings", "Equipment", "Furniture and fixtures"]
      }

      If you find categories that are more specific variations on a category you have already selected, ignore those. For example, you find accounts named "142 Fixed Assets:Buildings" and "1532 Fixed Assets:Buildings:IT Infrastructure" only provide "Buildings" as a category. You can ignore "IT Infrastructure" as a unique category

      If no fixed asset accounts are found, return the following JSON:
      {
        "categories": []
      }
      `,
      preProcess: (val: string) =>
        extractLinesContaining(val, ['asset']).join('\n'),
      respondInJSON: true,
      validate: z.object({
        categories: z.array(z.string()),
      }),
    },
    hasConvertibleNote: {
      label: 'Has a convertible note account',
      question: `Does this data mention a "convertible note?" ${questionYesNo}`,
      preProcess: (val: string) =>
        extractLinesContaining(val, ['convertible']).join('\n'),
      validate: yesNoSchema,
    },
  },
  ASC_842_MEMO: {
    asc842MemoDate: {
      label: 'Date of the memo',
      question: `What is the date this memo was written? ${questionDate}`,
      preProcess: (val: string) => head(val, 500),
      validate: dateSchema,
    },
    asc842MemoSummary: {
      label: 'Summary of the memo',
      question: dedent`You are an auditor. You will be provided an ASC 842 Memo.

      1. Summarize the memo in 500 words or less. Use the following template:

      TEMPLATE:
      The Company determines if an arrangement is a lease at inception and if so, determines whether the lease qualifies as operating or finance. Operating leases are included in operating lease right-of-use (“ROU”) assets and operating lease liabilities in the consolidated balance sheet. The Company [does/does not] not have any finance leases as of [date of memo].

      ROU assets represent the right to use an underlying asset for the lease term and lease liabilities represent the obligation to make lease payments arising from the lease. ROU assets are calculated and recognized at lease commencement date based on the present value of lease payments over the lease term adjusted for any lease payments paid to the lessor at or before the commencement date and initial direct costs incurred by the Company and excludes any lease incentives received from the lessor. When the implicit rate is not readily available, the Company has made an accounting policy election to use to the risk-free rate to determine the present value of lease payments for its property leases. The Company’s lease terms may include options to extend or terminate the lease when it is reasonably certain that it will exercise that option.

      Lease expense for lease payments is recognized on a straight-line basis over the lease term. The Company has elected not to recognize ROU asset and lease obligations for its short-term leases, which are defined as leases with an initial term of 12 months or less. The Company elected to not separate lease and non-lease components for all of its property leases. For leases in which the lease and non-lease components have been combined, the variable lease expense includes expenses such as common area maintenance, utilities, repairs and maintenance and are expensed as incurred.
      END TEMPLATE

      2. Finally, ensure that you haven't included an introduction or conclusion. If included, remove them.
      `,
      validate: z.string().min(200),
    },
  },
  EQUITY_FINANCING: {
    efDateOfDocument: {
      label: 'Date of the document',
      question: `What is the date this document was written? ${questionDate}`,
      preProcess: (val: string) => head(val, 500),
      validate: dateSchema,
    },
    equityFinancingQuickSummary: {
      label: 'Quick summary of the document',
      question: `
        In the view of a CPA preparing notes for audited financial statements, summarize the document into 120 words or less with the highlights of the document.

        - This summary should be in the format acceptable in AICPA audited financial statements.

        - Do not reiterate what we you are going to do. For example, do not say "In this summary," "I will summarize,", "Next I will..." or "Here is...".

        - Do not mention the name of the company in your summary e.g. "Acme Corp". Always refer to it as "The Company".

        - After you have written your summary, review what you have written. Ensure that you have not included any information that is not in the document. If you have, remove it. Ensure that the company name isn't explicitely mentioned. Ensure that the information contains highlights and no generic information. If it is too specific or generalized information, remove it.

        Example:
        In March 2023, the Company issued 20,000,000 shares of Series B-1 convertible preferred stock for proceeds of approximately $100,000,000. In addition, the convertible notes with aggregate outstanding principal of $4,000,000 were converted into 2,000,000 shares of Series B-1 convertible preferred stock. In April 2023, the Company closed a subsequent round of Series B-1 convertible preferred stock for additional proceeds of $2,300,000 and issuance of 1,400,000 Series B-1 convertible preferred shares.
      `,
      validate: z.string().min(100).max(20000),
    },
    equityFinancingSummary: {
      label: 'Summary of the document',
      question: `
        In the view of a CPA Accountant preparing notes for audited financial statements, summarize "Dividends," "Liquidation," "Voting," "Conversion," and "Redemption" from the following document. Each should be 1-3 paragraphs in length, detailing any scenarios or events listed within the document.

        - This summary should be in the format acceptable in AICPA audited financial statements.

        - Do not reiterate what we you are going to do. For example, do not say "In this summary, I will summarize Dividends, Liquidation, Voting, Conversion, and Redemption from the following document." Do not say "Next I will..." or "Here is...". Simply mention the topic and summarize it.

        - Do not mention the specific name of the company in your summary e.g. "Acme Corp". Always refer to it as "The Company".
      `,
      validate: z.string().min(100).max(20000),
    },
    // Don't run if false?
    conversionRatio: {
      label: 'Conversion ratio',
      question: `
        Extract the conversion ratio from preferred to common shares. This is typically included within the conversion section. If the answer is not 1, provide the sentence where the conversion ratio is mentioned.
      `,
      preProcess: (val: string) =>
        extractLinesContaining(val, ['conversion']).join('\n'),
      validate: z.string(),
    },
  },
  CERTIFICATE_TRANSACTION: {
    hasPreferredStock: {
      label: 'Has preferred stock',
      question: `Does this data mention preferred stock?" ${questionYesNo}`,
      preProcess: (val: string) =>
        extractLinesContaining(val, ['preferred']).join('\n'),
      validate: yesNoSchema,
    },
    ctDateOfDocument: {
      label: 'Date of the document',
      question: `What is the date this document was written? ${questionDate}`,
      preProcess: (val: string) => head(val, 500),
      validate: dateSchema,
    },
  },
  STOCK_PLAN: {
    stockPlanDateOfDocument: {
      label: 'Date of the document',
      question: `What is the date this document was written? ${questionDate}`,
      preProcess: (val: string) => head(val, 500),
      validate: dateSchema,
    },
    numAuthorizedShares: {
      label: 'Number of shares authorized',
      question:
        'How many shares does the company have available for inssuance? Return only the number without commas. If there are no numbers in your answer, return "-"',
      validate: numberSchema,
    },
  },
} as const;
