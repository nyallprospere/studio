import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const electionYears = [
  "2021",
  "2016",
  "2011",
  "2006",
  "2001",
  "1997",
  "1992",
  "1987 (Apr 30)",
  "1987 (April 6)",
  "1982",
  "1979",
  "1974",
];

export default function AdminResultsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Election Results"
        description="Input results for a specific constituency."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add Constituency Result</CardTitle>
          <CardDescription>Fill out the form to add a result. Forms are for demonstration purposes only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="result-year">Election Year</Label>
                    <Select>
                      <SelectTrigger id="result-year">
                        <SelectValue placeholder="Select an election" />
                      </SelectTrigger>
                      <SelectContent>
                        {electionYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="result-constituency">Constituency</Label>
                    <Select>
                        <SelectTrigger id="result-constituency">
                            <SelectValue placeholder="Select a constituency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="gros-islet">Gros Islet</SelectItem>
                            <SelectItem value="castries-central">Castries Central</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="space-y-2">
                <Label htmlFor="result-candidate">Candidate</Label>
                 <Input id="result-candidate" placeholder="Candidate Name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="result-party">Party</Label>
                 <Select>
                    <SelectTrigger id="result-party">
                        <SelectValue placeholder="Select a party" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="uwp">UWP</SelectItem>
                        <SelectItem value="slp">SLP</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="result-votes">Votes</Label>
                <Input id="result-votes" type="number" placeholder="4500" />
              </div>
            </div>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Save Result</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
