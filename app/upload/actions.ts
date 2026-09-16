'use server';

import { createClient } from '@/lib/supabase/server';
import { generateAI } from 'ai'; // Simuleret import fra Vercel AI SDK
import { openai } from '@ai-sdk/openai'; // Kræver install af @ai-sdk/openai
import { z } from 'zod';

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
    // (I en rigtig produktions-app ville vi bruge en PDF-parser som 'pdf-parse')
    // For eksemplets skyld sender vi fil-referencen til AI'en
    const extractedText = "HER VIL TEKSTEN FRA PDF'EN KOMME (SIMULERET)"; 

    // 3. Brug AI til at finde "skal"-krav
    // Vi beder AI'en om at returnere et JSON array
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        requirements: z.array(z.object({
          section: z.string(),
          text: z.string(),
        }))
      }),
      prompt: `Du er en ekspert i fødevarestandarder. Læs følgende tekst fra en standard og find alle obligatoriske krav (sætninger med 'skal', 'must', 'shall'). 
      Returner dem som en liste. Tekst: ${extractedText}`,
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
    console.error(error);
    return { error: error.message };
  }
}

// Hjælpe-funktion til AI generering (forkortet version)
async function generateObject({ model, schema, prompt }: any) {
  // Dette er en forenklet version af Vercel AI SDK's generateObject
  // I praksis bruger du 'ai' pakken fra Vercel
  return { object: { requirements: [{ section: "4.1", text: "Virksomheden skal have en skriftlig rengøringsplan." }] } };
}
