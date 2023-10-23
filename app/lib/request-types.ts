import { stripIndent } from 'common-tags';
import * as z from 'zod';

import { head } from '@/lib/util';
import { businessModelTypes } from './business-models';
import { balanceSheetTypes } from './consolidated-balance-sheet';

import type { RequestGroup } from '@/types';
import type { ZodTypeAny } from 'zod';

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

export interface FormFieldMonth extends _FormFieldBase {
  input: 'month';
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
  defaultValue: null;
  aiClassificationType: string;
  aiClassificationHint?: string;
  aiQuestions?: Record<string, AIQuestion>;
}

export type FormField =
  | FormFieldText
  | FormFieldBoolean
  | FormFieldDate
  | FormFieldYear
  | FormFieldMonth
  | FormFieldCheckbox
  | FormFieldFile;

function generateFormField(config: Partial<FormField>) {
  let schema;
  let validationSchema;
  switch (config.input) {
    case 'text':
      config.defaultValue ??= '';
      schema = z.string().max(512);
      validationSchema = z.string().min(1);

    case 'textarea':
      config.defaultValue ??= '';
      schema = z.string().max(10 * 1024);
      validationSchema = z.string().min(1);

      break;
    case 'boolean':
      config.defaultValue ??= false;
      schema = z.coerce.boolean();
      validationSchema = z.coerce.boolean();

      break;

    case 'date':
    case 'year':
    case 'month':
      config.defaultValue ??= '';
      schema = z.string().max(96);
      validationSchema = z.string().min(1);

      break;
    case 'checkbox':
      if (!config.items) {
        throw new Error(`Checkbox 'items' must be provided.`);
      }
      config.defaultValue ??= [];
      schema = z.string().array();
      validationSchema = z.string().array().nonempty();
      break;
    case 'fileupload':
      config.defaultValue = null;
      if (!config.aiClassificationType) {
        throw new Error(`Fileupload 'aiClassificationType' must be provided.`);
      }
      config.maxFilesizeMB = 10;
      config.extensions ??= ['PDF', 'DOC', 'DOCX', 'XLSX', 'XLS', 'CSV'];
      schema = z.string().max(256).nullable();
      validationSchema = z.string().min(1);
      break;
    case undefined:
      throw new Error(`'input' must be provided.`);
  }

  let formField;
  switch (config.input) {
    case 'text':
    case 'textarea':
      formField = { ...config } as FormFieldText;
      break;
    case 'boolean':
      formField = { ...config } as FormFieldBoolean;
      break;
    case 'date':
      formField = { ...config } as FormFieldDate;
      break;
    case 'year':
      formField = { ...config } as FormFieldYear;
      break;
    case 'month':
      formField = { ...config } as FormFieldMonth;
      break;
    case 'checkbox':
      formField = { ...config } as FormFieldCheckbox;
      break;
    case 'fileupload':
      formField = { ...config } as FormFieldFile;
      break;
  }
  return {
    formField,
    schema,
    validationSchema,
  } as const;
}

export function getAllDefaultValues() {
  const ret: Record<string, Record<string, FormField['defaultValue']>> = {};

  for (const rt of requestTypes) {
    ret[rt.id] = getDefaultValues(rt);
  }

  return ret;
}

export function getDefaultValues(
  rt: Pick<RequestType, 'form'>,
): Record<string, FormField['defaultValue']> {
  const ret: Record<string, FormField['defaultValue']> = {};
  for (const field of Object.keys(rt.form)) {
    ret[field] = rt.form[field].defaultValue;
  }
  return ret;
}

export function getRequestTypeForId(id: string) {
  const rt = requestTypes.find((rt) => rt.id === id);
  if (!rt) {
    throw new Error(`Invalid request type: ${id}`);
  }
  return rt;
}

type RequestStatus = 'todo' | 'started' | 'complete' | 'overdue';

export type RequestTypeStatus = {
  status: RequestStatus;
  totalTasks: number;
  completedTasks: number;
};
export function getStatusForRequestType(
  rt: string,
  requestData: { data: Record<string, unknown>; uninitializedFields: string[] },
): RequestTypeStatus {
  let status: RequestStatus;
  const totalTasks = Object.keys(requestData.data).length;
  let completedTasks;

  if (requestData.uninitializedFields.length > 0) {
    status = 'todo';
    completedTasks = 0;
  } else {
    const validationSchema = getValidationSchemaForId(rt);
    const res = validationSchema.safeParse(requestData.data);
    let numIssues = 0;
    if (!res.success) {
      numIssues = res.error.issues.length;
      // if (rt === 'asc-606-analysis') {
      //   console.log(res.error.issues);
      // }
    }
    completedTasks = totalTasks - numIssues;
    if (numIssues === 0) {
      status = 'complete';
    } else if (completedTasks > 0) {
      status = 'started';
    } else {
      status = 'todo';
    }
  }

  return {
    status,
    completedTasks,
    totalTasks,
  };
}

export const getSchemaForId = (id: string) => getRequestTypeForId(id).schema;
export const getValidationSchemaForId = (id: string) =>
  getRequestTypeForId(id).validationSchema;

interface RequestTypeConfig {
  id: string;
  name: string;
  group: RequestGroup;
  description?: string;
}
interface RequestTypeFormConfig {
  [field: string]: Partial<FormField>;
}
export interface RequestType {
  id: string;
  name: string;
  group: RequestGroup;
  description: string;
  form: Record<string, FormField>;
  completeOnSet: boolean;
  schema: ZodTypeAny;
  validationSchema: ZodTypeAny;
}
function generateRequestType(
  config: RequestTypeConfig,
  formConfig: RequestTypeFormConfig,
): RequestType {
  let form: Record<string, FormField> = {};
  let schemas: Record<string, ZodTypeAny> = {};
  let validationSchemas: Record<string, ZodTypeAny> = {};
  for (const [field, val] of Object.entries(formConfig)) {
    if (val === undefined) {
      continue;
    }
    const { formField, schema, validationSchema } = generateFormField(val);
    form[field] = formField;
    schemas[field] = schema;
    validationSchemas[field] = validationSchema;
  }
  return {
    id: config.id,
    name: config.name,
    group: config.group,
    description: config.description || '',
    form,
    completeOnSet: true,
    schema: z.object(schemas),
    validationSchema: z.object(validationSchemas),
  } as const;
}

export const requestTypes = [
  generateRequestType(
    {
      id: 'basic-info',
      name: 'Basic information',
      group: 'Background',
    },
    {
      businessName: {
        input: 'text',
        label: 'Legal name of the business',
      },
      description: {
        input: 'textarea',
        label: 'Description of the business',
        description:
          'Provide a high-level overview of the business so anyone who reads the audited financials can easily understand how your business description fits into your financial statements. This can best be summarized as your "elevator pitch" if you were to sell someone about your business for the first time.',
      },
      businessModels: {
        input: 'checkbox',
        label: 'Business model',
        items: businessModelTypes,
      },
      chiefDecisionMaker: {
        input: 'text',
        label: 'Chief decision maker',
      },
    },
  ),

  generateRequestType(
    {
      id: 'audit-info',

      name: 'Audit information',
      group: 'Background',
    },
    {
      year: {
        input: 'year',
        label: 'What year is being audited?',
      },
      fiscalYearMonthEnd: {
        input: 'month',
        label: "What month does the company's fiscal year end?",
        description: 'This is typically December.',
      },
      hasBeenAudited: {
        input: 'boolean',
        label: 'Has the company been audited before?',
      },
      previousAuditDocumentId: {
        label: 'Previous Audit',
        extensions: ['PDF', 'DOC', 'DOCX'],
        input: 'fileupload',
        dependsOn: 'hasBeenAudited',
        aiClassificationType: 'AUDIT',
      },
    },
  ),

  generateRequestType(
    {
      id: 'articles-of-incorporation',
      name: 'Articles of Incorporation',
      group: 'Background',
    },
    {
      documentId: {
        label: 'Upload the Articles of Incorporation',
        extensions: ['PDF'],
        input: 'fileupload',
        aiClassificationType: 'ARTICLES_OF_INCORPORATION',
        aiQuestions: {
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
      },
    },
  ),
  generateRequestType(
    {
      id: 'trial-balance',
      name: 'Trial Balance',
      group: 'Accounting Information',
    },
    {
      documentId: {
        label: 'Upload the Trial Balance',
        extensions: ['XLS', 'XLSX', 'CSV'],
        input: 'fileupload',
        aiClassificationType: 'TRIAL_BALANCE',
      },
    },
  ),

  generateRequestType(
    {
      id: 'chart-of-accounts',
      name: 'Chart of Accounts',
      group: 'Accounting Information',
    },
    {
      documentId: {
        label: "Upload the company's Chart of Accounts",
        extensions: ['XLS', 'XLSX', 'CSV'],
        input: 'fileupload',
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
        },
      },
    },
  ),

  generateRequestType(
    {
      id: 'asc-606-analysis',
      name: ' ASC 606 Analysis',
      group: 'Accounting Information',
    },
    {
      hasCompletedASC606Analysis: {
        input: 'boolean',
        label: 'Has the company completed ASC 606 Analysis?',
      },
      asc606DocumentId: {
        label: 'ASC 606 Analysis Document',
        extensions: ['PDF', 'DOC', 'DOCX'],
        input: 'fileupload',
        dependsOn: 'hasCompletedASC606Analysis',
        aiClassificationType: 'ASC_606_ANALYSIS',
        aiClassificationHint:
          'Asc 606 analysis. This document identifies five different steps – 1. Identify the contract with a customer, 2. Identify the performance obligations of the contract, 3. Determine the transaction price, 4. Allocate the transaction price, and 5. Recognize revenue when the entity satisfies a performance obligations.',
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
  ),

  generateRequestType(
    {
      id: 'leases',
      name: 'Leases',
      group: 'Accounting Information',
    },
    {
      hasLeases: {
        input: 'boolean',
        label: 'Does the company have any leases?',
      },
      didPerformASC842Analysis: {
        input: 'boolean',
        label: 'Did the company perform a ASC 842 analysis?',
        dependsOn: 'hasLeases',
      },
      yearOfASC842Analysis: {
        input: 'year',
        label: 'Which year did the company first perform a ASC 842 analysis?',
        dependsOn: 'didPerformASC842Analysis',
      },
      asc842DocumentId: {
        label: 'ASC 842 Memo',
        extensions: ['PDF', 'DOC', 'DOCX'],
        input: 'fileupload',
        dependsOn: 'didPerformASC842Analysis',
        aiClassificationType: 'ASC_842_MEMO',
        aiClassificationHint:
          'Asc 842 memo. This document identifies leases and states “ASC 842” within the document.',
      },
    },
  ),

  generateRequestType(
    {
      id: 'equity',
      name: 'Equity',
      group: 'Accounting Information',
    },
    {
      capTableDetailDocumentId: {
        label: 'Cap Table Detail',
        extensions: ['PDF', 'DOC', 'DOCX'],
        input: 'fileupload',
        aiClassificationType: 'CAP_TABLE',
        aiClassificationHint:
          'Cap table. The cap table will itemize the number of shares by shareholder. The shares are typically identified as common or preferred shares.',
      },
      certificateTransactionDocumentId: {
        label: 'Certificate Transaction',
        extensions: ['PDF', 'DOC', 'DOCX'],
        input: 'fileupload',
        aiClassificationType: 'CERTIFICATE_TRANSACTION',
        aiClassificationHint:
          'Certificate transaction. The certificate transaction report will itemize the share count, cost, and unique identifier for each shareholder.',
      },
      hasEmployeeStockPlan: {
        input: 'boolean',
        label: 'Does the company issue stock to employees?',
      },
      employeeStockPlanDocumentId: {
        label: 'Stock Option Plan & Amendments',
        extensions: ['PDF', 'DOC', 'DOCX'],
        input: 'fileupload',
        dependsOn: 'hasEmployeeStockPlan',
        aiClassificationType: 'STOCK_PLAN',
        aiClassificationHint:
          'Stock Option Plan & Amendments. This includes the terms and definitions of stated with an equity incentive plan.',
      },
    },
  ),

  generateRequestType(
    {
      id: 'material-changes-post-audit',
      name: 'Post-audit changes',
      group: 'Business Operations',
    },
    {
      hasPostAuditChanges: {
        input: 'boolean',
        label:
          'Have there been any material changes to the operations of the business following the period being audited?',
      },
      postAuditChanges: {
        input: 'textarea',
        label: 'What are those changes?',
        dependsOn: 'hasPostAuditChanges',
      },
    },
  ),

  generateRequestType(
    {
      id: 'outstanding-legal-matters',
      name: 'Outstanding legal matters',
      group: 'Business Operations',
    },
    {
      hasLegalMatters: {
        input: 'boolean',
        label:
          'Does the company know of any outstanding material legal matters?',
      },
      legalMatters: {
        input: 'textarea',
        label: 'Please disclose the outstanding material legal matters',
        dependsOn: 'hasLegalMatters',
      },
    },
  ),

  generateRequestType(
    {
      id: 'relatedPartyTransactions',
      name: 'Related party transactions ',
      group: 'Business Operations',
    },
    {
      hasRelatedPartyTransactions: {
        input: 'boolean',
        label: 'Is the company aware of any related party transactions? ',
      },
      relatedPartyTransactions: {
        input: 'textarea',
        label: 'Please disclose the related party transactions',
        dependsOn: 'hasRelatedPartyTransactions',
      },
    },
  ),

  generateRequestType(
    {
      id: 'employee-401k',
      name: '401k plan',
      group: 'Business Operations',
    },
    {
      has401K: {
        input: 'boolean',
        label: 'Does the company provide a 401k plan to employee?',
      },
      doesMatch: {
        input: 'boolean',
        label: 'Does the company match contributions?',
        dependsOn: 'has401K',
      },
      pctMatch: {
        input: 'text',
        label: 'What % does the company match?',
        dependsOn: 'doesMatch',
      },
    },
  ),

  generateRequestType(
    {
      id: 'audit-year-tax-provision',
      name: 'Audit year tax provision',
      group: 'Accounting Information',
    },
    {
      documentId: {
        label: 'Upload the Audit year tax provision',
        extensions: ['XLS', 'XLSX', 'CSV'],
        input: 'fileupload',
        aiClassificationType: 'AUDIT_YEAR_TAX_PROVISION',
      },
    },
  ),

  // generateRequestType(
  //   {
  //     id: 'user-requested',
  //     name: '???',
  //     group: 'Other',
  //   },
  //   {
  //     value: {
  //       input: 'textarea',
  //     },
  //   },
  // ),
] as const;

//export type RequestTypeKey = keyof typeof requestTypes;
