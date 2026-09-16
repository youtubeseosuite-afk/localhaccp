'use server';

import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic'; // Skiftet til Anthropic
import { z } from 'zod';
import pdf from 'pdf-parse';

export async function analyzeStandard({ name, fileUrl, fileBlob }: any) {
  const supabase = await createClient();

  try {
    // 1. Gem standarden i databasen
    const { data: stdData, error: stdError } = await supabase
      .from('standards')
      .insert({ name, file_url: fileUrl })
      .select()
      .single();

    if (stdError) throw stdError;

    // 2. Ekstraher tekst fra PDF
    const data = await pdf(fileBlob);
    const extractedText = data.text;

    // 3. Brug Claude AI til at finde "skal"-krav
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20240620'), // Bruger nu Claude 3.5 Sonnet
      schema: z.object({
        requirements: z.array(z.object({
          section: z.string(),
          text: z.string(),
        }))
      }),
      prompt: `Du er en ekspert i fødevarestandarder (som IFS, BRCGS, ISO). 
      Læs følgende tekst fra en standard og find alle obligatoriske krav (krav der indeholder ord som 'skal', 'must', 'shall', 'obligatorisk'). 
      For hvert krav skal du angive sektionen (f.eks. "4.1.2") og selve kravteksten.
      
      Tekst fra dokument:
      ${extractedText}`,
    });

    // 4. Gem alle fundne krav i databasen
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
    console.error("Anthropic Analyse fejl:", error);
    return { error: error.message };
  }
}
