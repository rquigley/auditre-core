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
export interface FileUploadInputConfig {
  input: 'fileupload';
  extensions: string[];
  maxFilesizeMB: number;
}
export interface CheckboxInputConfig {
  input: 'checkbox';
  items: {
    [key: string]: { name: string; description: string };
  };
}
export interface TextInputConfig {
  input: 'text';
}
export interface TextareaInputConfig {
  input: 'textarea';
}
export interface DateInputConfig {
  input: 'date';
}
export type InputConfig =
  | TextInputConfig
  | TextareaInputConfig
  | DateInputConfig
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
    name: 'Basic Information',
    description: '[description TODO]',
    defaultValue: {
      businessName: '',
      description: '',
      chiefDecisionMaker: '',
    },
    form: {
      businessName: {
        input: 'text',
        label: 'Legal Name of the business',
      },
      description: {
        input: 'textarea',
        label: 'Description of the business',
      },
      chiefDecisionMaker: {
        input: 'text',
        label: 'Chief Decision Maker',
      },
    },
    completeOnSet: true,
    schema: schemas.basicInfo,
  },
  AUDIT_INFO: {
    name: 'Audit Information',
    description: '[audit info description TODO]',
    defaultValue: {
      year: '',
      hasBeenAudited: false,
      fiscalYearEnd: '',
    },
    form: {
      year: {
        input: 'text',
        label: 'What year is being audited?',
      },
      hasBeenAudited: {
        input: 'text',
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
  BUSINESS_MODEL: {
    name: 'Business Model',
    description:
      'Model description. This will affect other parts of the audit, creating tasks depending on which model is selected.',
    defaultValue: {
      value: '',
    },
    form: {
      value: {
        input: 'checkbox',
        items: businessModelTypes,
      },
    },
    completeOnSet: true,
    schema: schemas.businessModelSchema,
  },
  TRIAL_BALANCE: {
    name: 'Upload the trial balance',
    description: '[Description TODO]',
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
    name: 'Upload the chart of accounts',
    description: '[Description TODO]',
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
  MULTIPLE_BUSINESS_LINES: {
    name: 'Multiple lines',
    description: '[Description of the business lines TODO]',
    defaultValue: {
      value: '',
    },
    form: {
      value: {
        input: 'textarea',
      },
    },
    completeOnSet: true,
    schema: schemas.businessModelSchema,
  },
  LEASES: {
    name: 'Does the company have any leases?',
    description: '[Description TODO]',
    defaultValue: {
      value: '',
    },
    form: {
      value: {
        input: 'date',
      },
    },
    completeOnSet: true,
    schema: schemas.businessModelSchema,
  },
  STOCK_OPTIONS: {
    name: 'Does the company issue stock to employees?',
    description: '[Description TODO]',
    defaultValue: {
      value: '',
    },
    form: {
      value: {
        input: 'date',
      },
    },
    completeOnSet: true,
    schema: schemas.businessModelSchema,
  },
  MATERIAL_CHANGES_POST_AUDIT: {
    name: 'Have there been any material changes to the operations of the business following the period being audited?',
    description: '[Description TODO]',
    defaultValue: {
      value: '',
    },
    form: {
      value: {
        input: 'date',
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
