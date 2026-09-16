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

    // 2. AI Analyse med Claude 3.5 Sonnet (Modtager direkte teksten fra browseren)
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20240620'),
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
      ${text}`,
    });

    // 3. Gem krav
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
    console.error("Server Action Error:", error);
    return { error: error.message || "En ukendt fejl opstod under analysen." };
  }
}
