import Header from '@/components/header';
import { getCurrent } from '@/controllers/session-user';

export default async function SettingsPage() {
  const user = await getCurrent();

  return (
    <>
      <Header title="Account Settings" />
      <div className="mt-8 flow-root">todo</div>
    </>
  );
}
