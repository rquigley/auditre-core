import { stripIndent } from 'common-tags';
import * as z from 'zod';

import { head } from '@/lib/util';
import { balanceSheetTypes } from './consolidated-balance-sheet';

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

type InputType =
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'year'
  | 'boolean'
  | 'date'
  | 'fileupload';

type ExtractionQuestion = {
  question: string;
  identifier: string;
  model?: string;
  preProcess?: (val: string) => string;
  validate?: (val: string) => boolean;
};

export interface _FormField {
  label?: string;
  description?: string;
  extractionQuestions?: ExtractionQuestion[];
  dependsOn?: string;
}

export interface FormFieldText extends _FormField {
  input: 'text' | 'textarea';
  defaultValue: string;
}

export interface FormFieldBoolean extends _FormField {
  input: 'boolean';
  defaultValue: boolean;
}

export interface FormFieldDate extends _FormField {
  input: 'date';
  defaultValue: string;
}

export interface FormFieldYear extends _FormField {
  input: 'year';
  defaultValue: string;
}

export interface FormFieldCheckbox extends _FormField {
  input: 'checkbox';
  defaultValue: Array<string>;
  items: {
    [key: string]: { name: string; description: string };
  };
}

export interface FormFieldFile extends _FormField {
  input: 'fileupload';
  extensions: string[];
  maxFilesizeMB: number;
  defaultValue: string;
}

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
    name: 'Upload the Articles of Incorporation',
    description: '',
    form: {
      documentId: {
        extensions: ['PDF'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',

        // qualifyingQuestion:
        //   'Does this look like the Articles of Incorporation for an organization? Answer only with "yes" or "no"',
        extractionQuestions: [
          {
            identifier: 'INCORPORATION_DATE',
            question: `What date was the company incorporated? Return only the date in the format of YYYY-MM-DD. If you don't find this date, return "-"`,
            // model: 'gpt-4',
          },
          {
            identifier: 'NUMBER_OF_SHARES',
            question:
              'How many shares does the company have the ability to offer? Return only the number without commas. If there are no numbers in your answer, return "-"',
            // model: 'gpt-4',
          },
          {
            identifier: 'PAR_VALUE_PER_SHARE',
            question:
              'What is the par value per share? Return only the number without commas. If there are no numbers in your answer, return "-"',
            // process: (val: string) => val,
            // validate: (val: string) => true,
            //model: 'gpt-4',
          },
          {
            identifier: 'INCORPORATION_JURISDICTION',
            question:
              'What is the jurisdiction of incorporation? Answer only with the jurisdiction',
            //model: 'gpt-4',
          },
          // {
          //   identifier: 'TEST_QUESTION',
          //   question: stripIndent`Answer the following questions. The questions are in the format "[IDENTIFIER]: [QUESTION]" with each one on a new line.
          //     Respond in the format "[IDENTIFIER]: [ANSWER]" with each one on a new line. Only answer with the information requested.
          //     INCORPORATION_DATE: What date was the company incorporated? Answer only with the date in the format of YYYY-MM-DD
          //     NUMBER_OF_SHARES: How many shares does the company have the ability to offer? Answer only with the number
          //     PAR_VALUE_PER_SHARE: What is the par value per share? Answer only with the number without commas
          //     INCORPORATION_JURISDICTION: What is the jurisdiction of incorporation? Answer only with the jurisdiction
          //     `,
          //   model: 'gpt-4',
          // },
        ],
      },
    },
    completeOnSet: true,
    schema: z.object({
      documentId: z.string(),
    }),
  },
  TRIAL_BALANCE: {
    name: 'Upload the Trial Balance',
    description: '',
    form: {
      documentId: {
        extensions: ['XLS', 'XLSX', 'CSV'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        extractionQuestions: [],
      },
    },
    completeOnSet: true,
    schema: z.object({
      documentId: z.string(),
    }),
  },
  CHART_OF_ACCOUNTS: {
    name: 'Upload the Chart of Accounts',
    description: '',
    form: {
      documentId: {
        extensions: ['XLS', 'XLSX', 'CSV'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        extractionQuestions: [
          {
            identifier: 'ACCOUNT_NAME_COLUMN',
            preProcess: (val: string) => head(val, 10),
            question: stripIndent`
              In this CSV content which column number contains account names? Think carefully before answering.
              We don't want account types or any other. Return JSON with "columnName" and "columnNum".
              If you are unsure return "-" for values
              `,
            //model: 'gpt-4',
          },
          {
            identifier: 'ACCOUNT_MAPPING',
            question: stripIndent`
              You are an auditor and CPA. Classify Chart of Accounts accounts (in CSV format) into one of the following account types:
              ${balanceSheetTypeKeys.join('\n')}

              1. Extract the account names
              2. Looking at the name of the account and any additional data in the row, attempt to classify it as one of the account types. If you can't classify the account, leave the type blank
              3. Generate a comprehensive list of all account names and types as JSON using the format "[{name: [ACCOUNT_NAME 1], type: [ACCOUNT_TYPE 1]}, etc...]"
              `,
            model: 'gpt-3.5-turbo-16k',
          },
        ],
      },
    },
    completeOnSet: true,
    schema: z.object({
      documentId: z.string(),
    }),
  },
  LEASES: {
    name: 'Leases',
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
    description: '',
    form: {
      capTableDetailDocumentId: {
        label: 'Cap Table Detail',
        extensions: ['PDF', 'DOC', 'DOCX'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
      },
      certificateTransactionDocumentId: {
        label: 'Certificate Transaction',
        extensions: ['PDF', 'DOC', 'DOCX'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
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
      },
    },
    completeOnSet: true,
    schema: z.object({
      capTableDetailDocumentId: z.coerce.boolean(),
      certificateTransactionDocumentId: z.string(),
      hasEmployeeStockPlan: z.coerce.boolean(),
      employeeStockPlanDocumentId: z.string(),
    }),
  },
  MATERIAL_CHANGES_POST_AUDIT: {
    name: 'Post-audit changes',
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
        label: 'What are outstanding material legal matters?',
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
    description: '',
    form: {
      documentId: {
        extensions: ['XLS', 'XLSX', 'CSV'],
        maxFilesizeMB: 10,
        input: 'fileupload',
        defaultValue: '',
        extractionQuestions: [],
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
};

export type RequestTypeKey = keyof typeof requestTypes;
