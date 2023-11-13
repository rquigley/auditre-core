import { Content } from '@/components/content';
import { Header } from '@/components/header';
import { getCurrent } from '@/controllers/session-user';

export default async function SettingsPage() {
  const { user, authRedirect } = await getCurrent();
  if (!user) {
    return authRedirect();
  }

  return (
    <>
      <Header title="Account Settings" />
      <Content pad={true}>
        <div>- Change name</div>
        <div>- Show login methods</div>
      </Content>
    </>
  );
}
