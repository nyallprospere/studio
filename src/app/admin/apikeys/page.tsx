import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminApiKeysPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage API Keys"
        description="Configure API keys for third-party services."
      />
      <Card>
        <CardHeader>
          <CardTitle>Gemini API Key</CardTitle>
          <CardDescription>This key is used for the AI prediction features. Forms are for demonstration purposes only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gemini-api-key">API Key</Label>
              <Input id="gemini-api-key" type="password" placeholder="Enter your Gemini API Key" />
            </div>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Save Key</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
