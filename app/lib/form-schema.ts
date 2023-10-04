import * as z from 'zod';

export const basicInfo = z.object({
  businessName: z.string().max(128),
  description: z.string().max(10 * 1024),
  chiefDecisionMaker: z.string().max(128),
  businessModels: z.string().array(),
});

export const newAudit = z.object({
  name: z.string().min(3).max(72),
  year: z.coerce
    .number()
    .min(1970, 'The year must be at least 1970')
    .max(2050, 'The year must be before 2050'),
});

export const auditInfo = z.object({
  year: z.coerce
    .number()
    .min(1970, 'The year must be at least 1970')
    .max(2050, 'The year must be before 2050'),
  hasBeenAudited: z.coerce.boolean(),
  fiscalYearEnd: z.coerce.date(),
});

export const basicString = z.object({
  value: z.string(),
});
export const basicAny = z.object({
  value: z.any(),
});
export const documentId = z.object({
  documentId: z.any(),
});
