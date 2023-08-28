import * as z from 'zod';
import { updateData } from '@/controllers/request';
import { create as createDocument } from '@/controllers/document';
import BasicForm from './basic-form';
import { requestTypes } from '@/lib/request-types';
import type { Request, User, Audit, S3File } from '@/types';
import { clientSafe } from '@/lib/util';

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
  // if (!formComponents.hasOwnProperty(request.type)) {
  //   throw new Error(`Invalid request type ${request.type}`);
  // }
  // const FormCmp = formComponents[request.type];
  const FormCmp = BasicForm;
  const requestConfig = requestTypes[request.type];

  async function saveData(data: z.infer<typeof formSchema>) {
    'use server';
    const formSchema = requestTypes[request.type].schema;

    for (const [key, field] of Object.entries(requestConfig.form)) {
      if (
        field.input === 'fileupload' &&
        //@ts-ignore

        data[key] &&
        // data[key].key indicates that a new file has been uploaded
        //@ts-ignore

        data[key].key
      ) {
        //@ts-ignore

        const file: S3File = data[key];
        const doc = await createDocument({
          key: file.key,
          bucket: file.bucket,
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date(file.lastModified),
          orgId: audit.orgId,
        });
        //@ts-ignore
        data[key] = {
          documentExternalId: doc.id,
        };
      }
    }

    await updateData({
      id: request.id,
      //@ts-ignore

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
      //@ts-ignore
      request={clientSafe(request)}
      data={request.data}
      //@ts-ignore
      saveData={saveData}
    />
  );
}
