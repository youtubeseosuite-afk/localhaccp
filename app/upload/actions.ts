'use server';

import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export async function analyzeStandard({ name, fileUrl }: any) {
  const supabase = await createClient();

  try {
    // 1. Gem standarden i databasen
    const { data: stdData, error: stdError } = await supabase
      .from('standards')
      .insert({ name, file_url: fileUrl })
      .select()
      .single();

    if (stdError) throw stdError;

    // 2. HENT filen fra Supabase Storage URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Kunne ikke hente filen fra storage. Status: ${response.status}. Tjek om din bucket er sat til 'Public'.`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Læs PDF'en
    const pdfModule = await import('pdf-parse');
    const pdf = (pdfModule as any).default || pdfModule;
    const data = await pdf(buffer);
    const extractedText = data.text;

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Kunne ikke udtrække tekst fra PDF-filen.");
    }

    // 4. AI Analyse med Claude
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20240620'),
      schema: z.object({
        requirements: z.array(z.object({
          section: z.string(),
          text: z.string(),
        }))
      }),
      prompt: `Du er en ekspert i fødevarestandarder. 
      Find alle obligatoriske krav ('skal', 'must', 'shall') i følgende tekst. 
      Sektion og kravtekst skal returneres.
      
      Tekst:
      ${extractedText}`,
    });

    // 5. Gem krav
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
    console.error("Serever Action Fejl:", error);
    return { error: error.message };
  }
}
