import * as z from 'zod';

export const businessName = z.object({
  businessName: z
    .string()
    .min(2, {
      message: 'Business name must be at least 2 characters.',
    })
    .max(128, {
      message: 'Business name must be under 128 characters.',
    }),
});
