import * as z from 'zod';
import { businessModelTypes } from './request-types';

export const basicInfo = z.object({
  businessName: z.string().max(128),
  description: z.string().max(10 * 1024),
  chiefDecisionMaker: z.string().max(128),
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

// export type BusinessModel =
//   keyof typeof requestTypes.BUSINESS_MODEL.form.value.items;

// Explicitely define the type of businessModels for zod.
// It can't be computed since Zod isn't able to infer the exact values of
// each element.
// const businessModelTypesOnly = Object.keys(
//   requestTypes.BUSINESS_MODEL.form.value.items,
// );

export const businessModelSchema = z.object({
  value: z.array(
    z.string().refine((v) => Object.keys(businessModelTypes).includes(v), {
      message: 'Invalid business model.',
    }),
  ),
});
