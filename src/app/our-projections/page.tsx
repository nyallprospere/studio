'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OurProjectionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Our Projections"
        description="Detailed projections for the upcoming 2026 General Elections."
      />
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Projection Details</CardTitle>
            <CardDescription>
              In-depth analysis and seat-by-seat predictions will be available here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This section is under construction. Check back soon for detailed projections!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
