'use server';

import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
// Vi importerer pdf-parse på en måde, der omgår TypeScript's strenge type-tjek for gamle moduler
import pdf from 'pdf-parse/lib/pdf-parse.js';

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

    // 2. KONVERTERING: Blob -> ArrayBuffer -> Buffer
    // pdf-parse kræver en Node.js Buffer for at kunne læse PDF'en
    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Ekstraher tekst fra PDF
    // Vi bruger (pdf as any) for at fortælle TypeScript: "Stol på mig, det her er en funktion"
    const data = await (pdf as any)(buffer);
    const extractedText = data.text;

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Kunne ikke udtrække tekst fra PDF-filen. Er filen tom eller krypteret?");
    }

    // 4. Brug Claude AI til at finde "skal"-krav
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20240620'),
      schema: z.object({
        requirements: z.array(z.object({
          section: z.string(),
          text: z.string(),
        }))
      }),
      prompt: `Du er en ekspert i fødevarestandarder (som IFS, BRCGS, ISO). 
      Læs følgende tekst fra en standard og find alle obligatoriske krav (krav der indeholder ord som 'skal', 'must', 'shall', 'obligatorisk'). 
      For hvert krav skal du angive sektionen (f.eks. "4.1.2") og selve kravteksten.
      
      Husk at være præcis og kun udtrække faktiske krav.
      
      Tekst fra dokument:
      ${extractedText}`,
    });

    // 5. Gem alle fundne krav i databasen
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
    console.error("AI Analyse fejl:", error);
    return { error: error.message };
  }
}
