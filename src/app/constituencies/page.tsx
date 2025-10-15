import { constituencies } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export default function ConstituenciesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Constituencies"
        description="Explore the 17 electoral districts of St. Lucia."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {constituencies.map((constituency) => {
          const image = PlaceHolderImages.find(img => img.id === constituency.mapImageId);
          return (
            <Card key={constituency.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
              {image && (
                <div className="relative h-40 w-full">
                  <Image
                    src={image.imageUrl}
                    alt={`Map of ${constituency.name}`}
                    fill
                    className="object-cover"
                    data-ai-hint={image.imageHint}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="font-headline text-xl">{constituency.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Population: {constituency.demographics.population.toLocaleString()}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-2 text-primary" />
                  <span>Registered Voters: {constituency.demographics.registeredVoters.toLocaleString()}</span>
                </div>
              </CardContent>
              <CardFooter>
                 <Button asChild variant="outline" className="w-full">
                    {/* The link below is a placeholder and should be a dynamic route */}
                    <Link href="#">View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
