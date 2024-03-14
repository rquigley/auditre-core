import { DocumentOverlay } from '@/components/document-overlay';

export default async function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}

      <DocumentOverlay />
    </>
  );
}
