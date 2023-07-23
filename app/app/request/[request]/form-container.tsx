import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { businessNameSchema as formSchema } from '@/lib/formSchema';
import { updateValue } from '@/controllers/request';
import BusinessNameForm from './BusinessNameForm';
import BusinessModelForm from './BusinessModelForm';

import { Request, User, Audit } from '@/types';
type Props = {
  request: Request;
  user: User;
  audit: Audit;
};
export default async function BusinessName({ request, user, audit }: Props) {
  async function saveValues(inputVals: z.infer<typeof formSchema>) {
    'use server';

    const values = formSchema.parse(inputVals);
    updateValue(request.id, values.businessName, {
      type: 'USER',
      userId: user.id,
    });
  }
  //const businessName = request.value;
  if (request.type === 'BUSINESS_NAME') {
    return (
      <BusinessNameForm
        businessName={request?.value?.value || ''}
        saveValues={saveValues}
        // schema={formSchema}
      />
    );
  } else if (request.type === 'BUSINESS_MODEL') {
    return (
      <BusinessModelForm
        businessModel={request?.value?.value || ''}
        saveValues={saveValues}
        // schema={formSchema}
      />
    );
  }
}
