import { PageHeader } from '@/components/page-header';
import PredictionClient from '@/components/predictions/prediction-client';

export default function PredictionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
    <PageHeader
        title="AI Election Predictions"
        description="Analyze the impact of news on the election outcome using our GenAI tool."
    />
    <PredictionClient />
    </div>
  );
}
