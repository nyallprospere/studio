
'use server';

/**
 * @fileOverview A flow to summarize an article.
 * 
 * - summarizeArticle - A function that takes article content and returns a summary.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export async function summarizeArticle(content: string): Promise<string> {
    const llmResponse = await ai.generate({
      prompt: `You are a skilled news editor. Summarize the following article content to 45 characters or less.
  
      Article Content:
      ${content}`,
    });

    return llmResponse.text;
}

const summarizeArticleFlow = ai.defineFlow(
  {
    name: 'summarizeArticleFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (content) => {
    const llmResponse = await ai.generate({
      prompt: `You are a skilled news editor. Summarize the following article content to 45 characters or less.
  
      Article Content:
      ${content}`,
    });

    return llmResponse.text;
  }
);

