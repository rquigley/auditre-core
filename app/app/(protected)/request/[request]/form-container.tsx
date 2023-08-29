import * as z from 'zod';
import { updateData } from '@/controllers/request';
import { create as createDocument } from '@/controllers/document';
import BasicForm from './basic-form';
import { requestTypes } from '@/lib/request-types';
import type { Request, User, Audit, S3File, ClientSafeRequest } from '@/types';
import { clientSafe } from '@/lib/util';
import { revalidatePath } from 'next/cache';

type Props = {
  request: Request;
  user: User;
  audit: Audit;
};

export default async function FormContainer({ request, user, audit }: Props) {
  const requestConfig = requestTypes[request.type];

  async function saveData(data: z.infer<typeof formSchema>) {
    'use server';
    const formSchema = requestTypes[request.type].schema;

    for (const [key, field] of Object.entries(requestConfig.form)) {
      if (!data.hasOwnProperty(key)) {
        continue;
      }
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

    revalidatePath(`/request/${request.id}`);
  }

  return (
    <BasicForm
      request={clientSafe(request) as ClientSafeRequest}
      data={request.data}
      // @ts-ignore
      saveData={saveData}
    />
  );
}
