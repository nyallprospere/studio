import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminPollsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Polling Data"
        description="Add or edit poll results."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add New Poll</CardTitle>
          <CardDescription>Fill out the form to add new polling data. Forms are for demonstration purposes only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="poll-source">Polling Source</Label>
                <Input id="poll-source" placeholder="e.g., CADRES" />
                </div>
                <div className="space-y-2">
                <Label htmlFor="poll-date">Date of Poll</Label>
                <Input id="poll-date" type="date" />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Party Percentages</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="poll-uwp" className="w-16">UWP %</Label>
                        <Input id="poll-uwp" type="number" placeholder="45" />
                    </div>
                     <div className="flex items-center gap-2">
                        <Label htmlFor="poll-slp" className="w-16">SLP %</Label>
                        <Input id="poll-slp" type="number" placeholder="48" />
                    </div>
                </div>
            </div>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Save Poll Data</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
