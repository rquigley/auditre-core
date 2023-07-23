import * as z from 'zod';

export const businessNameSchema = z.object({
  businessName: z
    .string()
    .min(2, {
      message: 'Business name must be at least 2 characters.',
    })
    .max(128, {
      message: 'Business name must be under 128 characters.',
    }),
});

export const businessModels = [
  {
    name: 'Software as a Service',
    type: 'SAAS',
    description:
      'Companies provide software services on a subscription basis, often delivered via the internet.',
  },
  {
    name: 'E-commerce',
    type: 'E_COMMERCE',
    description:
      'Businesses sell goods or services online, either through their own websites or through online platforms.',
  },
  {
    name: 'Subscription Model',
    type: 'SUBSCRIPTION_MODEL',
    description: 'Companies charge a recurring fee for access to a service.',
  },
  {
    name: 'Freemium Model',
    type: 'FREEMIUM_MODEL',
    description:
      'Businesses offer basic services for free while charging for premium features.',
  },
  {
    name: 'Marketplace Model',
    type: 'MARKETPLACE_MODEL',
    description:
      'These businesses act as intermediaries, connecting buyers and sellers, and take a commission from each transaction.',
  },
  {
    name: 'Affiliate Marketing Model',
    type: 'AFFILIATE_MARKETING_MODEL',
    description:
      'Companies earn revenue by referring customers to another business.',
  },
  {
    name: 'Advertising Model',
    type: 'ADVERTISING_MODEL',
    description:
      'Companies provide a platform where advertisers can reach an audience.',
  },
  {
    name: 'Direct Sales Model',
    type: 'DIRECT_SALES_MODEL',
    description:
      'Businesses sell products or services directly to customers without using retailers or other intermediaries.',
  },
  {
    name: 'Franchise Model',
    type: 'FRANCHISE_MODEL',
    description:
      'A business licenses its operational model and brand to franchisees who run the local outlets.',
  },
  {
    name: 'Wholesale Model',
    type: 'WHOLESALE_MODEL',
    description:
      'A business sells products in bulk at a low price to retailers, who sell them at a higher price to consumers.',
  },
  {
    name: 'Dropshipping Model',
    type: 'DROPSHIPPING_MODEL',
    description:
      'An online store sells products, but a third-party supplier stores, packages, and ships the products on behalf of the store.',
  },
] as const;

// Explicitely define the type of businessModels for zod.
// It can't be computed since Zod isn't able to infer the exact values of
// each element.
export const businessModelTypesOnly = [
  'SAAS',
  'E_COMMERCE',
  'SUBSCRIPTION_MODEL',
  'FREEMIUM_MODEL',
  'MARKETPLACE_MODEL',
  'AFFILIATE_MARKETING_MODEL',
  'ADVERTISING_MODEL',
  'DIRECT_SALES_MODEL',
  'FRANCHISE_MODEL',
  'WHOLESALE_MODEL',
  'DROPSHIPPING_MODEL',
] as const;

export const businessModelSchema = z.object({
  businessModel: z.enum(businessModelTypesOnly),
});
