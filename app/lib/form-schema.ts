import * as z from 'zod';
import { requestTypes, businessModelTypes } from './request-types';

export const businessNameSchema = z.object({
  value: z.string().min(2, {
    message: 'This must be at least 2 characters.',
  }),
});

export const basicString = z.object({
  value: z.string(),
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
