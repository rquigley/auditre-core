import * as schemas from '@/lib/form-schema';
import type { ZodTypeAny } from 'zod';
import type { RequestData } from '@/types';

export type RequestTypeConfig = {
  name: string;
  description: string;
  defaultValue: RequestData;
  form: {
    [key: string]: InputConfig;
  };
  schema: ZodTypeAny;
  completeOnSet: boolean;
};
interface BaseInputConfig {
  label: string;
  description?: string;
}
export interface FileUploadInputConfig extends BaseInputConfig {
  input: 'fileupload';
  extensions: string[];
  maxFilesizeMB: number;
}
export interface CheckboxInputConfig extends BaseInputConfig {
  input: 'checkbox';
  items: {
    [key: string]: { name: string; description: string };
  };
}
export interface TextInputConfig extends BaseInputConfig {
  input: 'text';
}
export interface TextareaInputConfig extends BaseInputConfig {
  input: 'textarea';
}
export interface DateInputConfig extends BaseInputConfig {
  input: 'date';
}
export interface YearInputConfig extends BaseInputConfig {
  input: 'year';
}
export interface BooleanInputConfig extends BaseInputConfig {
  input: 'boolean';
}
export type InputConfig =
  | BooleanInputConfig
  | TextInputConfig
  | TextareaInputConfig
  | DateInputConfig
  | YearInputConfig
  | CheckboxInputConfig
  | FileUploadInputConfig;

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

export const requestTypes = {
  BASIC_INFO: {
    name: 'Basic information',
    description: '',
    defaultValue: {
      businessName: '',
      description: '',
      businessModels: [],
      chiefDecisionMaker: '',
    },
    form: {
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
    completeOnSet: true,
    schema: schemas.basicInfo,
  },
  AUDIT_INFO: {
    name: 'Audit information',
    description: '',
    defaultValue: {
      year: '',
      hasBeenAudited: false,
      fiscalYearEnd: '',
    },
    form: {
      year: {
        input: 'year',
        label: 'What year is being audited?',
      },
      hasBeenAudited: {
        input: 'boolean',
        label: 'Has the company been audted before?',
      },
      fiscalYearEnd: {
        input: 'date',
        label: "When does the company's fiscal year end?",
      },
    },
    completeOnSet: true,
    schema: schemas.auditInfo,
  },
  ARTICLES_OF_INCORPORATION: {
    name: 'Upload the Articles of Incorporation',
    description: '',
    defaultValue: {
      value: '',
    },
    form: {
      value: {
        extensions: ['PDF'],
        maxFilesizeMB: 10,
        input: 'fileupload',
      },
    },
    completeOnSet: true,
    schema: schemas.basicAny,
  },
  TRIAL_BALANCE: {
    name: 'Upload the Trial Balance',
    description: '',
    defaultValue: {
      value: '',
    },
    form: {
      value: {
        extensions: ['XLS', 'XLSX', 'CSV'],
        maxFilesizeMB: 10,
        input: 'fileupload',
      },
    },
    completeOnSet: true,
    schema: schemas.basicAny,
  },
  CHART_OF_ACCOUNTS: {
    name: 'Upload the Chart of Accounts',
    description: '',
    defaultValue: {
      value: '',
    },
    form: {
      value: {
        extensions: ['XLS', 'XLSX', 'CSV'],
        maxFilesizeMB: 10,
        input: 'fileupload',
      },
    },
    completeOnSet: true,
    schema: schemas.basicAny,
  },
  LEASES: {
    name: 'Leases',
    description: '',
    defaultValue: {
      value: false,
    },
    form: {
      value: {
        input: 'boolean',
        label: 'Does the company have any leases?',
      },
    },
    completeOnSet: true,
    schema: schemas.businessModelSchema,
  },
  STOCK_OPTIONS: {
    name: 'Stock option plan and ammendments',
    description: '',
    defaultValue: {
      value: false,
    },
    form: {
      value: {
        input: 'boolean',
        label: 'Does the company issue stock to employees?',
      },
    },
    completeOnSet: true,
    schema: schemas.businessModelSchema,
  },
  MATERIAL_CHANGES_POST_AUDIT: {
    name: 'Post-audit changes',
    description: '',
    defaultValue: {
      value: false,
    },
    form: {
      value: {
        input: 'boolean',
        label:
          'Have there been any material changes to the operations of the business following the period being audited?',
      },
    },
    completeOnSet: true,
    schema: schemas.businessModelSchema,
  },
  USER_REQUESTED: {
    name: '???',
    description: '',
    defaultValue: {
      value: '',
    },
    form: {
      value: {
        input: 'textarea',
      },
    },
    completeOnSet: false,
    schema: schemas.businessModelSchema,
  },
};

export type RequestType = keyof typeof requestTypes;
