'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getPrediction } from '@/lib/actions';
import { Loader2, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type PredictionResult = {
  initialPrediction: {
    summary: string;
    detailedPredictions: string;
    confidenceLevel: string;
  };
  impactAssessment: {
    impactAssessment: string;
    revisedPrediction: string;
  };
};

export default function PredictionClient() {
  const [news, setNews] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!news.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    const response = await getPrediction(news);

    if (response.error) {
        setError(response.error);
    } else {
        setResult(response as PredictionResult);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-headline">News Impact Analyzer</CardTitle>
            <CardDescription>
              Enter a recent news summary to see how it might affect the election prediction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., 'The government announced a new subsidy for farmers...'"
              value={news}
              onChange={(e) => setNews(e.target.value)}
              rows={5}
              disabled={isLoading}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !news.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Prediction
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {error && (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Baseline Prediction</CardTitle>
                    <CardDescription>Initial prediction based on historical and polling data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold">Summary</h4>
                        <p className="text-muted-foreground">{result.initialPrediction.summary}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold">Confidence Level</h4>
                        <p className="text-muted-foreground">{result.initialPrediction.confidenceLevel}</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="border-primary bg-primary/5">
                 <CardHeader>
                    <CardTitle>News Impact & Revised Prediction</CardTitle>
                    <CardDescription>AI-generated assessment based on the news you provided.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <h4 className="font-semibold">Impact Assessment</h4>
                        <p className="text-muted-foreground">{result.impactAssessment.impactAssessment}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold">Revised Prediction</h4>
                        <p className="text-muted-foreground font-bold text-primary">{result.impactAssessment.revisedPrediction}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
