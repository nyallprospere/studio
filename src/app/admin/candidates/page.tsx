import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function AdminCandidatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Candidates"
        description="Add or edit candidate profiles."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add New Candidate</CardTitle>
          <CardDescription>Fill out the form to add a new candidate. Forms are for demonstration purposes only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="candidate-name">Candidate Name</Label>
              <Input id="candidate-name" placeholder="e.g., Jane Doe" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="candidate-party">Party</Label>
                <Select>
                    <SelectTrigger id="candidate-party">
                        <SelectValue placeholder="Select a party" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="uwp">United Workers Party</SelectItem>
                        <SelectItem value="slp">Saint Lucia Labour Party</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidate-constituency">Constituency</Label>
                 <Select>
                    <SelectTrigger id="candidate-constituency">
                        <SelectValue placeholder="Select a constituency" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gros-islet">Gros Islet</SelectItem>
                        <SelectItem value="castries-central">Castries Central</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="candidate-bio">Biography</Label>
                <Textarea id="candidate-bio" placeholder="A brief bio of the candidate..."/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="candidate-photo">Photo URL</Label>
                <Input id="candidate-photo" placeholder="https://example.com/photo.jpg" />
            </div>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Save Candidate</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
