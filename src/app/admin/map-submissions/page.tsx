

'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManageMapSubmissionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Map Submissions"
        description="View user-submitted election map predictions."
      />
      <Card>
        <CardHeader>
            <CardTitle>User Submissions</CardTitle>
            <CardDescription>A list of all shared or completed maps from users.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center text-muted-foreground py-16">
                <p>No map submissions yet.</p>
                <p className="text-sm">This page will display user-created maps when the feature is fully implemented.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

