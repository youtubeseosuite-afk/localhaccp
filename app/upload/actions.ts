'use server';

import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export async function analyzeStandard({ name, fileUrl, text }: any) {
  const supabase = await createClient();

  try {
    // 1. Gem standarden i databasen
    const { data: stdData, error: stdError } = await supabase
      .from('standards')
      .insert({ name, file_url: fileUrl })
      .select()
      .single();

    if (stdError) throw stdError;

    // 2. TEKST-SÆKREDKONTROL
    // Vi begrænser teksten til de første 50.000 tegn for at undgå context-fejl
    // Dette er mere end rigeligt til de fleste standard-dokumenter.
    const safeText = text.length > 50000 ? text.substring(0, 50000) + "... [Tekst beskåret]" : text;

    // 3. AI Analyse med Claude 3 Haiku (Hurtigere, billigere og mere stabil)
    let aiResult;
    try {
      aiResult = await generateObject({
        model: anthropic('claude-3-haiku-20240307'), // SKIFTET TIL HAIKU
        schema: z.object({
          requirements: z.array(z.object({
            section: z.string(),
            text: z.string(),
          }))
        }),
        prompt: `Du er en ekspert i fødevarestandarder. 
        Find alle obligatoriske krav (dem med 'skal', 'must', 'shall', 'obligatorisk') i følgende tekst.
        Returner dem som en struktureret liste med sektionsnummer og tekst.
        
        Tekst:
        ${safeText}`,
      });
    } catch (aiError: any) {
      console.error("CATCHED AI ERROR:", aiError);
      // Her tvinger vi fejlen til at være læselig
      throw new Error(`AI-FEJL: ${aiError.message || "Uventet fejl i AI-modulet"}`);
    }

    const { object } = aiResult;

    // 4. Gem krav
    const requirementsToInsert = object.requirements.map(req => ({
      standard_id: stdData.id,
      section: req.section,
      requirement_text: req.text,
      status: 'pending'
    }));

    const { error: reqError } = await supabase
      .from('requirements')
      .insert(requirementsToInsert);

    if (reqError) throw reqError;

    return { success: true };
  } catch (error: any) {
    console.error("FINAL ERROR:", error);
    return { error: error.message || "En ukendt fejl opstod." };
  }
}
