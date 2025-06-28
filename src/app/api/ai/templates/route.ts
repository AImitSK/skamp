// src/app/api/ai/templates/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('Templates requested');

  return NextResponse.json({
    success: true,
    templates: [
      {
        title: 'Produktankündigung',
        prompt: 'Innovative Produkteinführung, die ein wichtiges Branchenproblem löst und den Markt revolutioniert'
      },
      {
        title: 'Strategische Partnerschaft',
        prompt: 'Strategische Partnerschaft zwischen zwei führenden Unternehmen mit erheblichen Synergien'
      },
      {
        title: 'Unternehmensmeilenstein',
        prompt: 'Wichtiger Unternehmensmeilenstein wie Wachstum, Expansion oder Jubiläum'
      },
      {
        title: 'Auszeichnung',
        prompt: 'Erhaltene Branchenauszeichnung oder Award, der Expertise unterstreicht'
      },
      {
        title: 'Führungswechsel',
        prompt: 'Wichtige Personalentscheidung oder Ernennung neuer Führungskraft'
      },
      {
        title: 'Forschungsergebnisse',
        prompt: 'Neue Forschungsergebnisse oder Studie mit wichtigen Branchenerkenntnissen'
      }
    ]
  });
}