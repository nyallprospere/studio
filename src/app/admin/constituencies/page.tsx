import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AdminConstituenciesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Constituencies"
        description="Add or edit constituency information."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add New Constituency</CardTitle>
          <CardDescription>Fill out the form to add a new constituency. Forms are for demonstration purposes only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="constituency-name">Constituency Name</Label>
              <Input id="constituency-name" placeholder="e.g., Gros Islet" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="constituency-population">Population</Label>
                <Input id="constituency-population" type="number" placeholder="25000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="constituency-voters">Registered Voters</Label>
                 <Input id="constituency-voters" type="number" placeholder="21000" />
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="constituency-locations">Polling Locations</Label>
                <Textarea id="constituency-locations" placeholder="Enter one location per line..."/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="constituency-map">Map Image URL</Label>
                <Input id="constituency-map" placeholder="https://example.com/map.jpg" />
            </div>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Save Constituency</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
