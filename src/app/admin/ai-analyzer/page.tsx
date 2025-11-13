'use client';

import { PageHeader } from '@/components/page-header';
import PredictionClient from '@/components/predictions/prediction-client';
import { ConstituencyAnalyzer } from '@/components/predictions/constituency-analyzer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AIAnalyzerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="AI Election Predictions"
        description="Analyze election outcomes using our GenAI tools."
      />
      <Tabs defaultValue="news-impact" className="w-full mt-6">
        <TabsList>
          <TabsTrigger value="news-impact">News Impact Analyzer</TabsTrigger>
          <TabsTrigger value="constituency-outcome">Constituency Outcome Analyzer</TabsTrigger>
        </TabsList>
        <TabsContent value="news-impact">
          <PredictionClient />
        </TabsContent>
        <TabsContent value="constituency-outcome">
          <ConstituencyAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
