import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { businessModelSchema, businessNameSchema } from '@/lib/form-schema';
import { updateValue } from '@/controllers/request';
import BusinessNameForm from './business-name-form';
import BusinessModelForm from './business-model-form';

import { Request, User, Audit } from '@/types';
type Props = {
  request: Request;
  user: User;
  audit: Audit;
};
const typeMap = {
  BUSINESS_NAME: {
    cmp: BusinessNameForm,
    schema: businessNameSchema,
  },
  BUSINESS_MODEL: {
    cmp: BusinessModelForm,
    schema: businessModelSchema,
  },
} as const;
export default async function BusinessName({ request, user, audit }: Props) {
  if (!typeMap.hasOwnProperty(request.type))) {
    throw new Error('Invalid request type');
  }
  const FormCmp = typeMap[request.type].cmp;
  const formSchema = typeMap[request.type].schema;

  async function saveValues(inputVals: z.infer<typeof formSchema>) {
    'use server';

    const values = formSchema.parse(inputVals);
    updateValue(request.id, values.businessName, {
      type: 'USER',
      userId: user.id,
    });
  }
  return <FormCmp value={request?.value} saveValues={saveValues} />;
}
