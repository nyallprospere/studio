'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Settings"
        description="Update site-wide settings and configurations."
      />
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>
            This is where you can manage general settings for the application. More options will be available here in the future.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Settings management interface is under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}
