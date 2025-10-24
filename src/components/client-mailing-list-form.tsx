'use client';

import dynamic from 'next/dynamic';

// Dynamically import the MailingListForm with SSR turned off
const MailingListForm = dynamic(
  () => import('@/components/mailing-list-form').then((mod) => mod.MailingListForm),
  { ssr: false }
);

export function ClientMailingListForm() {
  return <MailingListForm />;
}
