import { candidates, getPartyById, getConstituencyById } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PageHeader } from '@/components/page-header';

export default function CandidatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="2026 Candidates"
        description="Meet the individuals contesting in the upcoming general elections."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {candidates.map((candidate) => {
          const party = getPartyById(candidate.partyId);
          const constituency = getConstituencyById(candidate.constituencyId);
          const image = PlaceHolderImages.find(img => img.id === candidate.imageId);

          return (
            <Card key={candidate.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                {image && (
                  <div className="relative h-56 w-full">
                    <Image
                      src={image.imageUrl}
                      alt={`Photo of ${candidate.name}`}
                      fill
                      className="object-cover"
                      data-ai-hint={image.imageHint}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                 <div className="p-6">
                    <CardTitle className="font-headline text-xl">{candidate.name}</CardTitle>
                    {party && (
                      <CardDescription style={{ color: party.color }}>
                        {party.name} ({party.acronym})
                      </CardDescription>
                    )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Running in: <span className="font-semibold text-foreground">{constituency?.name}</span>
                </p>
                <p className="mt-2 text-sm line-clamp-3">{candidate.bio}</p>
              </CardContent>
              <CardFooter>
                 <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    {/* The link below is a placeholder and should be a dynamic route */}
                    <Link href={`#`}>View Full Profile</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
