'use server';

import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export async function analyzeStandard({ name, fileUrl }: any) {
  const supabase = await createClient();

  try {
    // 1. FIX: Polyfill for DOMMatrix
    // Dette snyder pdf-parse til at tro, at vi er i en browser, 
    // så den ikke crasher over manglende DOM-funktioner.
    if (typeof global.DOMMatrix === 'undefined') {
      (global as any).DOMMatrix = class {
        constructor() {}
        multiply() { return this; }
        translate() { return this; }
      };
    }

    // 2. Gem standarden i databasen
    const { data: stdData, error: stdError } = await supabase
      .from('standards')
      .insert({ name, file_url: fileUrl })
      .select()
      .single();

    if (stdError) throw stdError;

    // 3. HENT filen fra Supabase Storage URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Kunne ikke hente filen fra storage. Tjek om din bucket er 'Public'.`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Læs PDF'en dynamisk
    const pdfModule = await import('pdf-parse');
    const pdf = (pdfModule as any).default || pdfModule;
    const data = await pdf(buffer);
    const extractedText = data.text;

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Kunne ikke udtrække tekst fra PDF-filen.");
    }

    // 5. AI Analyse med Claude
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

    // 6. Gem krav
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
    console.error("Server Action Fejl:", error);
    return { error: error.message };
  }
}
