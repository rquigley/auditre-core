'use client';

import { useIntercom } from '@/lib/hooks/use-intercom';

export default function Intercom({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  useIntercom({
    name,
    email,
  });
  return null;
}
