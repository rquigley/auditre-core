import * as z from 'zod';

import { businessModelTypes } from './business-models';

import type { RequestGroup } from '@/types';
import type { ZodTypeAny } from 'zod';

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
    schema: schema.optional(),
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

export function getRequestTypeForId(id: string): RequestType {
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
  const validationSchema = getValidationSchemaForId(rt, requestData.data);
  const parsedRes = validationSchema.safeParse(requestData.data);

  const totalTasks = Object.keys(validationSchema.shape).length;
  let completedTasks;

  if (requestData.uninitializedFields.length > 0) {
    status = 'todo';
    completedTasks = 0;
  } else {
    let numIssues = 0;
    if (!parsedRes.success) {
      numIssues = parsedRes.error.issues.length;
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

export function getFieldDependencies(
  field: string,
  formConfig: Record<string, FormField>,
) {
  let deps = [];

  while (true) {
    let fieldConfig = formConfig[field];
    if (!fieldConfig) {
      throw new Error(`Field "${field}" not found in form config`);
    }

    if (fieldConfig.dependsOn) {
      let dependsOnField;
      if (typeof fieldConfig.dependsOn === 'object') {
        dependsOnField = fieldConfig.dependsOn.field;
      } else {
        dependsOnField = fieldConfig.dependsOn;
      }

      deps.push(dependsOnField);

      field = dependsOnField;
    } else {
      break;
    }
  }
  return deps;
}

export function isFieldEnabled(
  field: string,
  formConfig: Record<string, FormField>,
  data: Record<string, unknown>,
) {
  const deps = getFieldDependencies(field, formConfig);
  if (deps.length === 0) {
    return true;
  }

  let isFieldEnabled = true;

  for (let n = 0, len = deps.length; n < len; n++) {
    const parentField = deps.shift() as string;
    const parentVal = data[parentField];
    if (typeof parentVal !== 'boolean') {
      throw new Error(`Field "${parentField}" must be a boolean`);
    }
    const fieldConfig = formConfig[field];
    if (
      typeof fieldConfig.dependsOn === 'object' &&
      fieldConfig.dependsOn.state === false
    ) {
      isFieldEnabled = !parentVal;
    } else if (parentVal === false) {
      isFieldEnabled = false;
    }
    if (typeof fieldConfig.dependsOn === 'object') {
      field = fieldConfig.dependsOn.field;
    } else if (fieldConfig.dependsOn) {
      field = fieldConfig.dependsOn;
    }
  }
  return isFieldEnabled;
}

export const getSchemaForId = (id: string) => getRequestTypeForId(id).schema;

export function getValidationSchemaForId(
  id: string,
  data: Record<string, unknown>,
) {
  const request = getRequestTypeForId(id);
  let validationSchema = { ...request.validationSchema };

  for (const field of Object.keys(request.form)) {
    if (!isFieldEnabled(field, request.form, data)) {
      delete validationSchema[field];
    }
  }
  return z.object(validationSchema);
}

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

  // used within an individual request to validate each field
  // TODO: We can likely combine this with validationSchema
  schema: ZodTypeAny;

  // Schema for completeness of the request.
  // This schema isn't built until runtime because fields can be disabled
  // based on the overall state of the form.
  validationSchema: Record<string, ZodTypeAny>;
}
function generateRequestType(
  config: RequestTypeConfig,
  formConfig: RequestTypeFormConfig,
): RequestType {
  let form: Record<string, FormField> = {};
  let schemas: Record<string, ZodTypeAny> = {};
  let validationSchema: Record<string, ZodTypeAny> = {};
  for (const [field, val] of Object.entries(formConfig)) {
    if (val === undefined) {
      continue;
    }
    const {
      formField,
      schema,
      validationSchema: vSchema,
    } = generateFormField(val);
    form[field] = formField;
    schemas[field] = schema;
    validationSchema[field] = vSchema;
  }
  return {
    id: config.id,
    name: config.name,
    group: config.group,
    description: config.description || '',
    form,
    completeOnSet: true,
    schema: z.object(schemas),
    validationSchema,
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
          'Provide a summary of how your company determines whether or not to recognize revenue and the associated COGS. For example, the company’s revenue is direct from the sale of product/service. The company recognizes revenue when the product/service has been shipped/executed to the customer.',
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
        description:
          'Provide a high-level overview of any material changes. Examples include equity or debt financing, an acquisition, entering into a significant contract or lawsuit settlement.',
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
        label: 'What are those legal matters?',
        description:
          'Disclose any outstanding lawsuits known to the business, that would result in a negative outcome if found liable. There are many examples of lawsuits, with the most common lawsuits being: breach of contract claims, employment disputes, intellectual property disputes, shareholder lawsuits, and class actions (typically from customers).',
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
        description: `Third-party transactions refer to agreements between two parties who have a preexisting business relationship. Commonly related parties are typically related to shareholders. Two common examples of a related-party transaction are:
        - If you used shareholders company to perform a service for your business
        - If you raised debt from an existing shareholder`,
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
