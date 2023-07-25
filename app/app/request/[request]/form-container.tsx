import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { updateData } from '@/controllers/request';
import BusinessNameForm from './business-name-form';
import BusinessModelForm from './business-model-form';
import type { RequestType } from '@/types';
import { requestTypes } from '@/controllers/request';
import type { Request, User, Audit } from '@/types';

type FormType = { cmp: React.FC<Props>; schema: z.ZodSchema<any, any, any> };
type TypeMap = {
  [key in RequestType]: FormType;
};

type Props = {
  request: Request;
  user: User;
  audit: Audit;
};

const formComponents = {
  BUSINESS_NAME: BusinessNameForm,
  BUSINESS_DESCRIPTION: BusinessNameForm,
  BUSINESS_MODEL: BusinessModelForm,
  MULTIPLE_BUSINESS_LINES: BusinessNameForm,
  USER_REQUESTED: BusinessNameForm,
} as const;

export default async function BusinessName({ request, user, audit }: Props) {
  if (!formComponents.hasOwnProperty(request.type)) {
    throw new Error('Invalid request type');
  }
  const FormCmp = formComponents[request.type];

  async function saveData(data: z.infer<typeof formSchema>) {
    'use server';
    const formSchema = requestTypes[request.type].schema;

    await updateData({
      id: request.id,
      data,
      actor: {
        type: 'USER',
        userId: user.id,
      },
      schema: formSchema,
    });
  }

  return <FormCmp data={request.data} saveData={saveData} />;
}
