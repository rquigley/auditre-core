import { getCurrent } from '@/controllers/session-user';
import Header from '@/components/header';

export default async function Reports() {
  const user = await getCurrent();

  return (
    <>
      <Header title="Reports" />
      <div className="mt-8 flow-root">todo</div>
    </>
  );
}
