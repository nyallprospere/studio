
'use client';

import { PageHeader } from '@/components/page-header';

export default function HistoricalTrendsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Historical Trends"
        description="This page will display charts and graphs for historical election data."
      />
    </div>
  );
}
