'use server';

import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createRequire } from 'module';

// Vi opretter en 'require'-funktion, så vi kan hente gamle CommonJS-moduler direkte
const require = createRequire(import.meta.url);

export async function analyzeStandard({ name, fileUrl }: any) {
  const supabase = await createClient();

  try {
    // 1. FIX: Polyfill for DOMMatrix
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

    // 3. HENT filen fra Supabase Storage
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Kunne ikke hente filen fra storage. Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. DEN RIGTIGE MÅDE AT LOADE PDF-PARSE PÅ
    // Vi bruger 'require' i stedet for 'import'. Dette omgår alle Webpack/ESM problemer.
    const pdf = require('pdf-parse');
    
    const data = await pdf(buffer);
    const extractedText = data.text;

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Kunne ikke udtrække tekst fra PDF-filen.");
    }

    // 5. AI Analyse med Claude 3.5 Sonnet
    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-20240620'),
      schema: z.object({
        requirements: z.array(z.object({
          section: z.string(),
          text: z.string(),
        }))
      }),
      prompt: `Du er en ekspert i fødevarestandarder (IFS, BRCGS, ISO). 
      Find alle obligatoriske krav (dem med 'skal', 'must', 'shall', 'obligatorisk') i følgende tekst.
      Returner dem som en struktureret liste med sektionsnummer og tekst.
      
      Tekst:
      ${extractedText}`,
    });

    // 6. Gem krav i databasen
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
