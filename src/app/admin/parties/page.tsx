'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AdminPartiesPage() {
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Manage Parties"
        description="Add or edit political party information."
      />
      <Card>
        <form>
          <CardHeader>
            <CardTitle>Add New Party</CardTitle>
            <CardDescription>Fill out the form to add a new party. Forms are for demonstration purposes only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Party Name</Label>
                <Input id="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acronym">Acronym</Label>
                <Input id="acronym" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leader">Party Leader</Label>
              <Input id="leader" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="founded">Year Founded</Label>
                <Input id="founded" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Party Color</Label>
                <Input id="color" type="color" className="h-10" />
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="A brief description of the party's history and ideology..."/>
            </div>

             <div className="space-y-2">
                <Label htmlFor="manifestoSummary">Manifesto Summary</Label>
                <Textarea id="manifestoSummary" placeholder="A short summary of the key points in the party's manifesto..."/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="logo">Party Logo</Label>
                <Input id="logo" type="file" accept="image/*" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manifesto">Party Manifesto (PDF)</Label>
                <Input id="manifesto" type="file" accept=".pdf" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Save Party
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
