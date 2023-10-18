import { stripIndent } from 'common-tags';
import * as z from 'zod';

import { head } from '@/lib/util';
import { balanceSheetTypes } from './consolidated-balance-sheet';

import type { RequestGroup } from '@/types';
import type { ZodTypeAny } from 'zod';

const balanceSheetTypeKeys = Object.keys(balanceSheetTypes);

export const businessModelTypes = {
  SOFTWARE_AS_A_SERVICE: {
    name: 'Software as a Service',
    description:
      'Businesses that provide software services on a subscription basis, often delivered via the internet.',
  },
  E_COMMERCE: {
    name: 'E-commerce',
    description:
      'Businesses that sell goods or services, either through their own website or through online platforms.',
  },
  RETAIL: {
    name: 'Retail',
    description:
      'Businesses that sell goods or services in a physical retail location.',
  },
  MARKETPLACE: {
    name: 'Marketplace',
    description:
      'Businesses that act as intermediaries, connecting buyers and sellers, and take a commission from each transaction.',
  },
  MANUFACTURING: {
    name: 'Manufacturing',
    description:
      'Businesses that produce goods, which often involve mass production.',
  },
  FINANCIAL_SERVICES: {
    name: 'Financial Services',
    description:
      'Companies that offer various financial products and services, including investment management, insurance, and banking.',
  },
  ENERGY: {
    name: 'Energy',
    description:
      'Businesses that are involved in the production, distribution, and sale of energy resources like electricity, gas, or renewable energy.',
  },
  CONSULTING_SERVICES: {
    name: 'Consulting Services',
    description:
      'Businesses that offer specialized advice and expertise to clients seeking solutions for specific challenges or opportunities.',
  },
  GAMING: {
    name: 'Gaming',
    description:
      'Businesses that engaged in the development, publishing, and distribution of video games.',
  },
  SOCIAL_MEDIA: {
    name: 'Social Media',
    description:
      'Businesses that have online platforms that allow users to create, share, and interact with content, fostering social connections.',
  },
  HEALTHCARE: {
    name: 'Healthcare',
    description:
      'Businesses that provide medical services, products, or equipment to promote health and well-being.',
  },
};

export type AIQuestion = {
  label?: string;
  question: string;
  model?: string;
  preProcess?: (val: string) => string;
  validate?: (val: string) => boolean;
};

interface _FormFieldBase {
  label?: string;
  description?: string;
  dependsOn?: string | { field: string; state: boolean };
}

export interface FormFieldText extends _FormFieldBase {
  input: 'text' | 'textarea';
  defaultValue: string;
}

export interface FormFieldBoolean extends _FormFieldBase {
  input: 'boolean';
  defaultValue: boolean;
}

export interface FormFieldDate extends _FormFieldBase {
  input: 'date';
  defaultValue: string;
}

export interface FormFieldYear extends _FormFieldBase {
  input: 'year';
  defaultValue: string;
}

export interface FormFieldCheckbox extends _FormFieldBase {
  input: 'checkbox';
  defaultValue: readonly string[];
  items: {
    [key: string]: { name: string; description: string };
  };
}

export interface FormFieldFile extends _FormFieldBase {
  input: 'fileupload';
  extensions: readonly string[];
  maxFilesizeMB: number;
  defaultValue: string;
  aiClassificationType: string;
  aiClassificationHint?: string;
  aiQuestions?: Record<string, AIQuestion>;
}

export type FormField =
  | FormFieldText
  | FormFieldBoolean
  | FormFieldDate
  | FormFieldYear
  | FormFieldCheckbox
  | FormFieldFile;

interface BasicInfoForm {
  businessName: FormFieldText;
  description: FormFieldText;
  businessModels: FormFieldCheckbox;
  chiefDecisionMaker: FormFieldText;
}

interface AuditInfoForm {
  year: FormFieldYear;
  fiscalYearEnd: FormFieldDate;
  hasBeenAudited: FormFieldBoolean;
  previousAuditDocumentId: FormFieldFile;
}

interface FileForm {
  documentId: FormFieldFile;
}

interface LeasesForm {
  hasLeases: FormFieldBoolean;
  didPerformASC842Analysis: FormFieldBoolean;
  yearOfASC842Analysis: FormFieldYear;
  asc842DocumentId: FormFieldFile;
}

interface ASC606AnalysisForm {
  hasCompletedASC606Analysis: FormFieldBoolean;
  asc606DocumentId: FormFieldFile;
  revenueRecognitionProcess: FormFieldText;
}

interface EquityForm {
  capTableDetailDocumentId: FormFieldFile;
  certificateTransactionDocumentId: FormFieldFile;
  hasEmployeeStockPlan: FormFieldBoolean;
  employeeStockPlanDocumentId: FormFieldFile;
}

interface MaterialChangesPostAuditForm {
  hasPostAuditChanges: FormFieldBoolean;
  postAuditChanges: FormFieldText;
}

interface OutstandingLegalMattersForm {
  hasLegalMatters: FormFieldBoolean;
  legalMatters: FormFieldText;
}

interface RelatedPartyTransactionsForm {
  hasRelatedPartyTransactions: FormFieldBoolean;
  relatedPartyTransactions: FormFieldText;
}

interface Employee401kForm {
  has401K: FormFieldBoolean;
  doesMatch: FormFieldBoolean;
  pctMatch: FormFieldText;
}

interface UserRequestedForm {
  value: FormFieldText;
}
export type ValidField =
  | keyof UserRequestedForm
  | keyof Employee401kForm
  | keyof RelatedPartyTransactionsForm
  | keyof OutstandingLegalMattersForm
  | keyof MaterialChangesPostAuditForm
  | keyof EquityForm
  | keyof ASC606AnalysisForm
  | keyof LeasesForm
  | keyof FileForm
  | keyof AuditInfoForm
  | keyof BasicInfoForm;

type HasDefaultValue = { defaultValue: any };
type RequestDataOnly<Type> = {
  [Property in keyof Type]: Type[Property] extends HasDefaultValue
    ? Type[Property]['defaultValue']
    : never;
};

export type AuditRequestData = {
  AUDIT_INFO: RequestDataOnly<AuditInfoForm>;
  BASIC_INFO: RequestDataOnly<BasicInfoForm>;
  ARTICLES_OF_INCORPORATION: RequestDataOnly<FileForm>;
  TRIAL_BALANCE: RequestDataOnly<FileForm>;
  CHART_OF_ACCOUNTS: RequestDataOnly<FileForm>;
  ASC_606_ANALYSIS: RequestDataOnly<ASC606AnalysisForm>;
  LEASES: RequestDataOnly<LeasesForm>;
  EQUITY: RequestDataOnly<EquityForm>;
  MATERIAL_CHANGES_POST_AUDIT: RequestDataOnly<MaterialChangesPostAuditForm>;
  OUTSTANDING_LEGAL_MATTERS: RequestDataOnly<OutstandingLegalMattersForm>;
  RELATED_PARTY_TRANSACTIONS: RequestDataOnly<RelatedPartyTransactionsForm>;
  EMPLOYEE_401K: RequestDataOnly<Employee401kForm>;
  USER_REQUESTED: RequestDataOnly<UserRequestedForm>;
  AUDIT_YEAR_TAX_PROVISION: RequestDataOnly<FileForm>;
};

interface RequestType<T> {
  name: string;
  group?: RequestGroup;
  description: string;
  form: T;
  completeOnSet: boolean;
  schema: ZodTypeAny;
}

export const requestTypes: {
  BASIC_INFO: RequestType<BasicInfoForm>;
  AUDIT_INFO: RequestType<AuditInfoForm>;
  ARTICLES_OF_INCORPORATION: RequestType<FileForm>;
  TRIAL_BALANCE: RequestType<FileForm>;
  CHART_OF_ACCOUNTS: RequestType<FileForm>;
  ASC_606_ANALYSIS: RequestType<ASC606AnalysisForm>;
  LEASES: RequestType<LeasesForm>;
  EQUITY: RequestType<EquityForm>;
  MATERIAL_CHANGES_POST_AUDIT: RequestType<MaterialChangesPostAuditForm>;
  OUTSTANDING_LEGAL_MATTERS: RequestType<OutstandingLegalMattersForm>;
  RELATED_PARTY_TRANSACTIONS: RequestType<RelatedPartyTransactionsForm>;
  EMPLOYEE_401K: RequestType<Employee401kForm>;
  AUDIT_YEAR_TAX_PROVISION: RequestType<FileForm>;
  USER_REQUESTED: RequestType<UserRequestedForm>;
} = {
  BASIC_INFO: {
    name: 'Basic information',
    group: 'Background',
    description: '',
    form: {
      businessName: {
        input: 'text',
        label: 'Legal name of the business',
        defaultValue: '',
      },
      description: {
        input: 'textarea',
        label: 'Description of the business',
        defaultValue: '',
        description:
          'Provide a high-level overview of the business so anyone who reads the audited financials can easily understand how your business description fits into your financial statements. This can best be summarized as your "elevator pitch" if you were to sell someone about your business for the first time.',
      },
      businessModels: {
        input: 'checkbox',
        label: 'Business model',
        defaultValue: [],
        items: businessModelTypes,
      },
      chiefDecisionMaker: {
        input: 'text',
        label: 'Chief decision maker',
        defaultValue: '',
      },
    },
    completeOnSet: true,
    schema: z.object({
      businessName: z.string().max(128),
      description: z.string().max(10 * 1024),
      chiefDecisionMaker: z.string().max(128),
      businessModels: z.string().array(),
    }),
  },

  AUDIT_INFO: {
    name: 'Audit information',
    group: 'Background',
    description: '',
    form: {
      year: {
        input: 'year',
        label: 'What year is being audited?',
        defaultValue: '',
      },
      fiscalYearEnd: {
        input: 'date',
        label: "When does the company's fiscal year end?",
        defaultValue: '',
      },
      hasBeenAudited: {
        input: 'boolean',
        label: 'Has the company been audited before?',
        defaultValue: false,
      },
      previousAuditDocumentId: {
        label: 'Previous Audit',
        extensions: ['PDF', 'DOC', 'DOCX'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        dependsOn: 'hasBeenAudited',
        aiClassificationType: 'AUDIT',
      },
    },
    completeOnSet: true,
    schema: z.object({
      year: z.string(),
      fiscalYearEnd: z.coerce.date(),
      hasBeenAudited: z.coerce.boolean(),
      previousAuditDocumentId: z.string(),
    }),
  },

  ARTICLES_OF_INCORPORATION: {
    name: 'Articles of Incorporation',
    group: 'Background',
    description: '',
    form: {
      documentId: {
        label: 'Upload the Articles of Incorporation',
        extensions: ['PDF'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        aiClassificationType: 'ARTICLES_OF_INCORPORATION',
        aiQuestions: {
          incorporationDate: {
            label: 'Date of incorporation',
            question: `What date was the company incorporated? Return only the date in the format of YYYY-MM-DD. If you don't find this date, return "-"`,
            // model: 'gpt-4',
          },
          numberOfShares: {
            label: 'Number of shares',
            question:
              'How many shares does the company have the ability to offer? Return only the number without commas. If there are no numbers in your answer, return "-"',
            // model: 'gpt-4',
          },
          parValuePerShare: {
            label: 'Par value per share',
            question:
              'What is the par value per share? Return only the number without commas. If there are no numbers in your answer, return "-"',
            // process: (val: string) => val,
            // validate: (val: string) => true,
            //model: 'gpt-4',
          },
          incorporationJurisdiction: {
            label: 'Jurisdiction of incorporation',
            question:
              'What is the jurisdiction of incorporation? Answer only with the jurisdiction',
            //model: 'gpt-4',
          },
        },
      },
    },
    completeOnSet: true,
    schema: z.object({
      documentId: z.string(),
    }),
  },

  TRIAL_BALANCE: {
    name: 'Trial Balance',
    group: 'Accounting Information',
    description: '',
    form: {
      documentId: {
        label: 'Upload the Trial Balance',
        extensions: ['XLS', 'XLSX', 'CSV'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        aiClassificationType: 'TRIAL_BALANCE',
      },
    },
    completeOnSet: true,
    schema: z.object({
      documentId: z.string(),
    }),
  },

  CHART_OF_ACCOUNTS: {
    name: 'Chart of Accounts',
    group: 'Accounting Information',
    description: '',
    form: {
      documentId: {
        label: "Upload the company's Chart of Accounts",
        extensions: ['XLS', 'XLSX', 'CSV'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        aiClassificationType: 'CHART_OF_ACCOUNTS',
        aiClassificationHint:
          'Chart of Accounts aka a complete listing, by category, of every account in the general ledger of a company. It can include an account name, identifier, account type, additional description, and sometimes the total balance for that account.',
        aiQuestions: {
          accountNameColumn: {
            preProcess: (val: string) => head(val, 10),
            question: stripIndent`
              In this CSV content which column number contains account names? Think carefully before answering.
              We don't want account types or any other. Return JSON with "columnName" and "columnNum".
              If you are unsure return "-" for values
              `,
            //model: 'gpt-4',
          },
          accountMapping: {
            question: stripIndent`
            For each row in the Chart of Accounts CSV, perform the following steps to generate a JSON-formatted output:

            1. Account Name/ID
            Look for the 'Account Name' in columns such as 'Full name,' 'Account Name,' 'Account /Parent Account,' etc.
            If an 'Account ID' exists in columns like 'Account Number,' include it in the JSON object under the key id.

            2. Type of Account
            Use conditional logic to classify the type of account to one of the following ACCOUNT_TYPE:
             ${balanceSheetTypeKeys.join(', ')}

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
        },
      },
    },
    completeOnSet: true,
    schema: z.object({
      documentId: z.string(),
    }),
  },

  ASC_606_ANALYSIS: {
    name: ' ASC 606 Analysis',
    group: 'Accounting Information',
    description: '',
    form: {
      hasCompletedASC606Analysis: {
        input: 'boolean',
        label: 'Has the company completed ASC 606 Analysis?',
        defaultValue: false,
      },
      asc606DocumentId: {
        label: 'ASC 606 Analysis Document',
        extensions: ['PDF', 'DOC', 'DOCX'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        dependsOn: 'hasCompletedASC606Analysis',
        aiClassificationType: 'ASC_606_ANALYSIS',
      },
      revenueRecognitionProcess: {
        input: 'textarea',
        label: 'Please describe the company’s revenue recognition process',
        description:
          'This is a summary of how your company determines whether or not to recognize revenue and the associated COGS. For example, the company’s revenue is direct from the sale of product/service. The company recognizes revenue when the product/service has been shipped/executed to the customer.',
        defaultValue: '',
        dependsOn: { field: 'hasCompletedASC606Analysis', state: false },
      },
    },
    completeOnSet: true,
    schema: z.object({
      hasCompletedASC606Analysis: z.coerce.boolean(),
      asc606DocumentId: z.string(),
    }),
  },

  LEASES: {
    name: 'Leases',
    group: 'Accounting Information',
    description: '',
    form: {
      hasLeases: {
        input: 'boolean',
        label: 'Does the company have any leases?',
        defaultValue: false,
      },
      didPerformASC842Analysis: {
        input: 'boolean',
        label: 'Did the company perform a ASC 842 analysis?',
        defaultValue: false,
        dependsOn: 'hasLeases',
      },
      yearOfASC842Analysis: {
        input: 'year',
        label: 'Which year did the company first perform a ASC 842 analysis?',
        defaultValue: '',
        dependsOn: 'didPerformASC842Analysis',
      },
      asc842DocumentId: {
        label: 'ASC 842 Memo',
        extensions: ['PDF', 'DOC', 'DOCX'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        dependsOn: 'didPerformASC842Analysis',
        aiClassificationType: 'ASC_842_MEMO',
      },
    },
    completeOnSet: true,
    schema: z.object({
      hasLeases: z.coerce.boolean(),
      didPerformASC842Analysis: z.coerce.boolean(),
      yearOfASC842Analysis: z.string(),
      asc842DocumentId: z.string(),
    }),
  },

  EQUITY: {
    name: 'Equity',
    group: 'Accounting Information',
    description: '',
    form: {
      capTableDetailDocumentId: {
        label: 'Cap Table Detail',
        extensions: ['PDF', 'DOC', 'DOCX'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        aiClassificationType: 'CAP_TABLE',
      },
      certificateTransactionDocumentId: {
        label: 'Certificate Transaction',
        extensions: ['PDF', 'DOC', 'DOCX'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        aiClassificationType: 'CERTIFICATE_TRANSACTION',
      },
      hasEmployeeStockPlan: {
        input: 'boolean',
        label: 'Does the company issue stock to employees?',
        defaultValue: false,
      },
      employeeStockPlanDocumentId: {
        label: 'Stock Option Plan & Amendments',
        extensions: ['PDF', 'DOC', 'DOCX'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        dependsOn: 'hasEmployeeStockPlan',
        aiClassificationType: 'STOCK_PLAN',
        aiClassificationHint:
          'Stock Option Plan & Amendments. This might include the issuance of stock to founders, employees, or investors.',
      },
    },
    completeOnSet: true,
    schema: z.object({
      capTableDetailDocumentId: z.string(),
      certificateTransactionDocumentId: z.string(),
      hasEmployeeStockPlan: z.coerce.boolean(),
      employeeStockPlanDocumentId: z.string(),
    }),
  },

  MATERIAL_CHANGES_POST_AUDIT: {
    name: 'Post-audit changes',
    group: 'Business Operations',
    description: '',
    form: {
      hasPostAuditChanges: {
        input: 'boolean',
        label:
          'Have there been any material changes to the operations of the business following the period being audited?',
        defaultValue: false,
      },
      postAuditChanges: {
        input: 'textarea',
        label: 'What are those changes?',
        defaultValue: '',
        dependsOn: 'hasPostAuditChanges',
      },
    },
    completeOnSet: true,
    schema: z.object({
      hasPostAuditChanges: z.coerce.boolean(),
      postAuditChanges: z.string(),
    }),
  },

  OUTSTANDING_LEGAL_MATTERS: {
    name: 'Outstanding legal matters',
    group: 'Business Operations',
    description: '',
    form: {
      hasLegalMatters: {
        input: 'boolean',
        label:
          'Does the company know of any outstanding material legal matters?',
        defaultValue: false,
      },
      legalMatters: {
        input: 'textarea',
        label: 'Please disclose the outstanding material legal matters',
        defaultValue: '',
        dependsOn: 'hasLegalMatters',
      },
    },
    completeOnSet: true,
    schema: z.object({
      hasLegalMatters: z.coerce.boolean(),
      legalMatters: z.string(),
    }),
  },

  RELATED_PARTY_TRANSACTIONS: {
    name: 'Related party transactions ',
    group: 'Business Operations',
    description: '',
    form: {
      hasRelatedPartyTransactions: {
        input: 'boolean',
        label: 'Is the company aware of any related party transactions? ',
        defaultValue: false,
      },
      relatedPartyTransactions: {
        input: 'textarea',
        label: 'Please disclose the related party transactions',
        defaultValue: '',
        dependsOn: 'hasRelatedPartyTransactions',
      },
    },
    completeOnSet: true,
    schema: z.object({
      hasRelatedPartyTransactions: z.coerce.boolean(),
      relatedPartyTransactions: z.string(),
    }),
  },

  EMPLOYEE_401K: {
    name: '401k plan',
    group: 'Business Operations',
    description: '',
    form: {
      has401K: {
        input: 'boolean',
        label: 'Does the company provide a 401k plan to employee?',
        defaultValue: false,
      },
      doesMatch: {
        input: 'boolean',
        label: 'Does the company match contributions?',
        defaultValue: false,
        dependsOn: 'has401K',
      },
      pctMatch: {
        input: 'text',
        label: 'What % does the company match?',
        defaultValue: '',
        dependsOn: 'doesMatch',
      },
    },
    completeOnSet: true,
    schema: z.object({
      has401K: z.coerce.boolean(),
      doesMatch: z.coerce.boolean(),
      pctMatch: z.string(),
    }),
  },

  AUDIT_YEAR_TAX_PROVISION: {
    name: 'Audit year tax provision',
    group: 'Accounting Information',
    description: '',
    form: {
      documentId: {
        label: 'Upload the Audit year tax provision',
        extensions: ['XLS', 'XLSX', 'CSV'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        aiClassificationType: 'AUDIT_YEAR_TAX_PROVISION',
      },
    },
    completeOnSet: true,
    schema: z.object({
      documentId: z.string(),
    }),
  },

  USER_REQUESTED: {
    name: '???',
    description: '',
    form: {
      value: {
        input: 'textarea',
        defaultValue: '',
      },
    },
    completeOnSet: false,
    schema: z.object({
      value: z.string(),
    }),
  },
} as const;

export type RequestTypeKey = keyof typeof requestTypes;
