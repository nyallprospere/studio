import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminPartiesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Parties"
        description="Add or edit political party information."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add New Party</CardTitle>
          <CardDescription>Fill out the form to add a new party. Forms are for demonstration purposes only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="party-name">Party Name</Label>
                <Input id="party-name" placeholder="e.g., United Workers Party" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="party-acronym">Acronym</Label>
                <Input id="party-acronym" placeholder="e.g., UWP" />
              </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="party-leader">Party Leader</Label>
                    <Input id="party-leader" placeholder="e.g., Allen Chastanet" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="party-founded">Year Founded</Label>
                    <Input id="party-founded" type="number" placeholder="e.g., 1964" />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="party-color">Party Color</Label>
                <Input id="party-color" type="color" defaultValue="#F1C40F" />
            </div>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Save Party</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
