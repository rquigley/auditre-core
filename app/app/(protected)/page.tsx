import Header from '@/components/header';

export default async function Home() {
  return (
    <>
      <Header title="Dashboard" />
      <div>
        <div>- timeline?</div>
        <div>- deadlines?</div>
        <div>- request progress?</div>
        <div>- outstanding notifications for user?</div>
      </div>
    </>
  );
}
