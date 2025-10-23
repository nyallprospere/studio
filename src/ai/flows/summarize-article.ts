'use server';

/**
 * @fileOverview A flow to summarize an article.
 * 
 * - summarizeArticle - A function that takes article content and returns a summary.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export async function summarizeArticle(content: string): Promise<string> {
    return summarizeArticleFlow(content);
}

const summarizeArticlePrompt = ai.definePrompt({
  name: 'summarizeArticlePrompt',
  input: {schema: z.string()},
  output: {schema: z.string()},
  prompt: `You are a skilled news editor. Summarize the following article content into a concise paragraph.
  
  Article Content:
  {{input}}`,
});

const summarizeArticleFlow = ai.defineFlow(
  {
    name: 'summarizeArticleFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (content) => {
    const {output} = await summarizeArticlePrompt(content);
    return output || '';
  }
);
