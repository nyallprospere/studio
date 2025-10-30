'use server';

/**
 * @fileOverview A flow to calculate the volatility index of a constituency.
 * 
 * - calculateVolatilityIndex - A function that takes a constituency name and returns its volatility index.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, query, getDocs } from 'firebase/firestore';
import { getSdks } from '@/firebase/index';

// No need to export input/output types if they are not used externally

const calculateVolatilityIndexFlow = ai.defineFlow(
  {
    name: 'calculateVolatilityIndexFlow',
    inputSchema: z.string(),
    outputSchema: z.number(),
  },
  async (constituencyName) => {
    const { firestore } = getSdks(undefined as any); // Simplified SDK access for server-side flow

    // 1. Fetch all election results
    const resultsSnapshot = await getDocs(collection(firestore, 'election_results'));
    const allResults = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const electionsSnapshot = await getDocs(collection(firestore, 'elections'));
    const allElections = electionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const constituenciesSnapshot = await getDocs(collection(firestore, 'constituencies'));
    const allConstituencies = constituenciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const targetConstituency = allConstituencies.find(c => c.name === constituencyName);
    if (!targetConstituency) {
      return 0;
    }

    // 2. Prepare data for the prompt
    const electionResultsByYear: Record<string, any[]> = {};
    allResults.forEach(result => {
        const election = allElections.find(e => e.id === result.electionId);
        if (election) {
            const year = election.year.toString();
            if (!electionResultsByYear[year]) {
                electionResultsByYear[year] = [];
            }
            const constituency = allConstituencies.find(c => c.id === result.constituencyId);
            electionResultsByYear[year].push({
                constituencyName: constituency?.name,
                ...result
            });
        }
    });

    const constituencyHistoricalData = allResults
        .filter(r => r.constituencyId === targetConstituency.id)
        .map(r => {
            const election = allElections.find(e => e.id === r.electionId);
            return election ? { year: election.year, slpVotes: r.slpVotes, uwpVotes: r.uwpVotes, otherVotes: r.otherVotes, totalVotes: r.totalVotes } : null;
        })
        .filter(Boolean);


    const prompt = `
      You are a political data analyst. Your task is to calculate a "Volatility Index" for the ${constituencyName} constituency on a scale of 0 to 100, where 0 is extremely stable and 100 is extremely volatile.

      Analyze the provided historical election data:
      - Historical Results for ${constituencyName}: ${JSON.stringify(constituencyHistoricalData)}

      Consider the following to determine volatility:
      1.  **Magnitude of Swings:** How large are the percentage point swings between the SLP and UWP from one election to the next? Larger swings mean higher volatility.
      2.  **Frequency of Flips:** How often does the winning party change? More frequent flips indicate higher volatility.
      3.  **Margins of Victory:** Are elections consistently won by large margins (stable) or narrow margins (more volatile)?

      Based on your analysis of these factors, provide a single number representing the Volatility Index. Your response should ONLY be the number, without any additional text, labels, or explanations.
    `;

    const llmResponse = await ai.generate({
      prompt: prompt,
    });
    
    // Attempt to parse the number from the response
    const responseText = llmResponse.text.trim();
    const volatility = parseFloat(responseText);

    if (isNaN(volatility)) {
        console.error(`Could not parse volatility index from response: "${responseText}"`);
        // Attempt to find a number in the string as a fallback
        const match = responseText.match(/\d+(\.\d+)?/);
        if (match) {
            return parseFloat(match[0]);
        }
        return 0; // Return a default value if parsing fails completely
    }

    return volatility;
  }
);


export async function calculateVolatilityIndex(constituencyName: string): Promise<number> {
    try {
        const result = await calculateVolatilityIndexFlow(constituencyName);
        return result;
    } catch(e) {
        console.error("Error in calculateVolatilityIndex flow", e);
        return 0;
    }
}
