import { stripIndent } from 'common-tags';

import { head } from '@/lib/util';
import { balanceSheetTypes } from './consolidated-balance-sheet';

export type AIQuestion = {
  id: string;
  label?: string;
  question: string;
  model?: string;
  preProcess?: (val: string) => string;
  validate?: (val: string) => boolean;
};

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
        id: 'accountNameColumn',
        preProcess: (val: string) => head(val, 10),
        question: stripIndent`
                In this CSV content which column number contains account names? Think carefully before answering.
                We don't want account types or any other. Return JSON with "columnName" and "columnNum".
                If you are unsure return "-" for values
                `,
        //model: 'gpt-4',
      },
      {
        id: 'accountMapping',
        question: stripIndent`
              For each row in the Chart of Accounts CSV, perform the following steps to generate a JSON-formatted output:

              1. Account Name/ID
              Look for the 'Account Name' in columns such as 'Full name,' 'Account Name,' 'Account /Parent Account,' etc.
              If an 'Account ID' exists in columns like 'Account Number,' include it in the JSON object under the key id.

              2. Type of Account
              Use conditional logic to classify the type of account to one of the following ACCOUNT_TYPE:
               ${Object.keys(balanceSheetTypes).join(', ')}

              If unable to classify to one of these types, flag the entry for manual review.

              For example:
                  If 'Account Subtype' or 'Account Sub Type' is 'Cash on hand,' classify as ASSET_CASH.
                  If 'Account Name' contains 'Receivable,' classify as LIABILITY_ACCOUNTS_PAYABLE.
                  If there is a negative balance for the account, it is likely a LIABILITY_* type. If there is a positive balance, it is likely an ASSET_* type.
              Utilize the 'Account Description' and any other info in the row if available for additional context.
              If unable to classify with confidence to an [ACCOUNT_TYPE], set it to '-'

              Output Format:

              Output should be in JSON format using the following structure:

                If 'Account ID' exists:

                json
                  [{ "id": "[ACCOUNT_ID]", "name": "[ACCOUNT_NAME]", "type": "[ACCOUNT_TYPE]"}, ...]

              Otherwise:

                json
                  [{ "name": "[ACCOUNT_NAME]", "type": "[ACCOUNT_TYPE]}", ...]


                `,
        model: 'gpt-3.5-turbo-16k',
      },
    ],
  },
};
