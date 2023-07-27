import * as z from 'zod';
import { updateData } from '@/controllers/request';
import BusinessNameForm from './business-name-form';
import BusinessModelForm from './business-model-form';
import BusinessDescriptionForm from './business-description-form';
import BasicForm from './basic-form';
import { requestTypes } from '@/lib/request-types';
import type { Request, User, Audit } from '@/types';
import { clientSafe } from '@/lib/util';

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
  BUSINESS_NAME: BasicForm,
  BUSINESS_DESCRIPTION: BasicForm,
  BUSINESS_MODEL: BasicForm,
  MULTIPLE_BUSINESS_LINES: BasicForm,
  USER_REQUESTED: BasicForm,
} as const;

export default async function BusinessName({ request, user, audit }: Props) {
  if (!formComponents.hasOwnProperty(request.type)) {
    throw new Error('Invalid request type');
  }
  const FormCmp = formComponents[request.type];
  const requestConfig = requestTypes[request.type];

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
      type: request.type,
    });
  }

  return (
    <FormCmp
      request={clientSafe(request)}
      data={request.data}
      saveData={saveData}
    />
  );
}
