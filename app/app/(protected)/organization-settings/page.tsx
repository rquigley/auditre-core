import { getCurrent } from '@/controllers/session-user';
import Header from '@/components/header';

export default async function OrganizationSettingsPage() {
  const user = await getCurrent();

  return (
    <>
      <Header title="Organization Settings" />
      <div className="mt-8 flow-root">todo</div>
    </>
  );
}
