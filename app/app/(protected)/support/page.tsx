import { Content } from '@/components/content';
import { Header } from '@/components/header';

export default async function SupportPage() {
  return (
    <>
      <Header title="Support" />
      <Content pad={true}>
        <div>- Show contact form</div>
        <div>- Show contact info</div>
        <div>- Feature request</div>
      </Content>
    </>
  );
}
