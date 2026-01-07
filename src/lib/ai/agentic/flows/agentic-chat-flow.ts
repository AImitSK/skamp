// src/lib/ai/agentic/flows/agentic-chat-flow.ts
// Haupt-Flow für das Agentic Chat System

import { ai, gemini25FlashModel } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { getSkillsForAgent } from '../skills';
import { loadSpecialistPrompt } from '../prompts/prompt-loader';
import { saveFaktenMatrix } from '@/lib/firebase-admin/fakten-matrix-admin-service';
import type { SpecialistType, ToolCall, ChatMessage } from '../types';
import type { FaktenMatrixCreateData } from '@/types/fakten-matrix';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const ToolCallInMessageSchema = z.object({
  name: z.string(),
  args: z.record(z.unknown()),
  result: z.record(z.unknown()).optional(),
});

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  toolCalls: z.array(ToolCallInMessageSchema).optional(),
});

const AgenticChatInputSchema = z.object({
  specialistType: z.enum([
    'orchestrator',
    'briefing_specialist',
    'swot_specialist',
    'audience_specialist',
    'positioning_specialist',
    'goals_specialist',
    'messages_specialist',
    'project_wizard',
  ]),
  companyId: z.string(),
  companyName: z.string(),
  language: z.enum(['de', 'en']).default('de'),
  messages: z.array(ChatMessageSchema),
  /** Aktueller Sidebar-Inhalt (damit AI weiß was schon erfasst wurde) */
  currentDocument: z.string().optional(),
  /** Projekt-ID (benötigt für project_wizard um Fakten-Matrix zu speichern) */
  projectId: z.string().optional(),
});

const ToolCallSchema = z.object({
  name: z.string(),
  args: z.record(z.unknown()),
  result: z.record(z.unknown()).optional(),
});

const AgenticChatOutputSchema = z.object({
  response: z.string(),
  toolCalls: z.array(ToolCallSchema),
  nextAgent: z.string().optional(),
});

export type AgenticChatInput = z.infer<typeof AgenticChatInputSchema>;
export type AgenticChatOutput = z.infer<typeof AgenticChatOutputSchema>;

// ============================================================================
// FLOW DEFINITION
// ============================================================================

/**
 * agenticChatFlow
 *
 * Der Haupt-Flow für das Agentic Chat System.
 * Lädt den passenden Spezialisten-Prompt und registriert die erlaubten Tools.
 */
export const agenticChatFlow = ai.defineFlow(
  {
    name: 'agenticChatFlow',
    inputSchema: AgenticChatInputSchema,
    outputSchema: AgenticChatOutputSchema,
  },
  async (input) => {
    // 1. System-Prompt für den Spezialisten laden
    let systemPrompt = await loadSpecialistPrompt(
      input.specialistType,
      input.language,
      input.companyName
    );

    // 1b. CompanyId für Tool-Calls hinzufügen (WICHTIG: AI nutzt sonst den Firmennamen statt der ID!)
    const companyIdInfo = input.language === 'de'
      ? `\n\n=== FIRMEN-KONTEXT ===\nFirmenname: ${input.companyName}\ncompanyId (für skill_dna_lookup): ${input.companyId}\n\nWICHTIG: Nutze bei skill_dna_lookup IMMER die companyId "${input.companyId}", NICHT den Firmennamen!`
      : `\n\n=== COMPANY CONTEXT ===\nCompany name: ${input.companyName}\ncompanyId (for skill_dna_lookup): ${input.companyId}\n\nIMPORTANT: Always use companyId "${input.companyId}" for skill_dna_lookup, NOT the company name!`;
    systemPrompt = systemPrompt + companyIdInfo;

    // 1c. Aktuellen Sidebar-Inhalt als Kontext hinzufügen (damit AI weiß was schon erfasst wurde)
    if (input.currentDocument) {
      const contextLabel = input.language === 'de'
        ? '\n\n=== AKTUELLER STAND DER SIDEBAR ===\nDas ist der aktuelle Inhalt der Sidebar. ERWEITERE diesen Inhalt, überschreibe ihn NICHT komplett:\n\n'
        : '\n\n=== CURRENT SIDEBAR STATE ===\nThis is the current sidebar content. EXTEND this content, do NOT overwrite it completely:\n\n';
      systemPrompt = systemPrompt + contextLabel + input.currentDocument;
    }

    // 2. Tools für diesen Agenten laden
    const tools = getSkillsForAgent(input.specialistType);
    console.log('[AgenticFlow] Loaded skills for', input.specialistType, '- count:', tools?.length);
    console.log('[AgenticFlow] Input projectId:', input.projectId || 'NOT PROVIDED');

    // 3. Nachrichten formatieren - WICHTIG: Tool-Calls müssen in der History sein!
    // Genkit akzeptiert keine leeren Text-Parts: "Unsupported Part type {"text":""}"
    const messagesToFormat = (input.messages || []).filter(msg => msg.content && msg.content.trim().length > 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedMessages: any[] = [];

    for (const msg of messagesToFormat) {
      if (msg.role === 'user') {
        // User-Messages sind einfach Text
        formattedMessages.push({
          role: 'user' as const,
          content: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        // Assistant-Messages können Tool-Calls enthalten
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolCalls = (msg as any).toolCalls as Array<{
          name: string;
          args: Record<string, unknown>;
          result?: Record<string, unknown>;
        }> | undefined;

        if (toolCalls && toolCalls.length > 0) {
          // 1. Tool-Requests vom Model
          formattedMessages.push({
            role: 'model' as const,
            content: toolCalls.map((tc, idx) => ({
              toolRequest: {
                name: tc.name,
                input: tc.args,
                ref: String(idx),
              },
            })),
          });

          // 2. Tool-Responses
          formattedMessages.push({
            role: 'tool' as const,
            content: toolCalls.map((tc, idx) => ({
              toolResponse: {
                name: tc.name,
                output: tc.result || {},
                ref: String(idx),
              },
            })),
          });

          // 3. Text-Response vom Model (falls vorhanden)
          if (msg.content && msg.content.trim()) {
            formattedMessages.push({
              role: 'model' as const,
              content: [{ text: msg.content }],
            });
          }
        } else {
          // Keine Tool-Calls, nur Text
          formattedMessages.push({
            role: 'model' as const,
            content: [{ text: msg.content }],
          });
        }
      }
    }

    // Debug-Logging
    console.log('[AgenticFlow] specialistType:', input.specialistType);
    console.log('[AgenticFlow] tools count:', tools?.length ?? 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log('[AgenticFlow] tool names:', tools?.map((t: any) => t.__action?.name || t.name || 'unknown'));
    console.log('[AgenticFlow] original messages:', input.messages?.length ?? 0);
    console.log('[AgenticFlow] formatted messages (incl. tool history):', formattedMessages.length);
    console.log('[AgenticFlow] message roles:', formattedMessages.map(m => m.role));

    // 4. Generieren mit Tools
    // STRATEGIE: returnToolRequests=true gibt uns Kontrolle über Tool-Ausführung
    // mode='ANY' erzwingt Tool-Nutzung, wir führen Tools manuell aus
    console.log('[AgenticFlow] Calling ai.generate...');
    const hasTools = tools && tools.length > 0;
    const response = await ai.generate({
      model: gemini25FlashModel,
      system: systemPrompt,
      messages: formattedMessages.length > 0 ? formattedMessages : undefined,
      prompt: formattedMessages.length === 0 ? 'Starte den Prozess.' : undefined,
      tools: hasTools ? tools : undefined,
      // returnToolRequests: true stoppt nach Tool-Requests, wir führen manuell aus
      returnToolRequests: true,
      config: {
        temperature: 0.7,
        // mode='ANY' zwingt das Model, mindestens ein Tool aufzurufen
        ...(hasTools && {
          functionCallingConfig: {
            mode: 'ANY',
          },
        }),
      },
    });
    console.log('[AgenticFlow] ai.generate completed successfully');
    console.log('[AgenticFlow] response.text:', response.text?.substring(0, 100));
    console.log('[AgenticFlow] response.toolRequests:', response.toolRequests);

    // 5. Tool-Calls extrahieren und manuell ausführen
    const toolCalls: ToolCall[] = [];
    const toolRequests = response.toolRequests || [];

    console.log('[AgenticFlow] Tool requests count:', toolRequests.length);

    // Wenn Tool-Requests vorhanden, führe sie aus
    if (toolRequests && toolRequests.length > 0) {
      for (const request of toolRequests) {
        const toolName = request.toolRequest.name;
        const toolInput = request.toolRequest.input as Record<string, unknown>;

        console.log('[AgenticFlow] Executing tool:', toolName, toolInput);

        // Finde das Tool - ToolAction hat eine __action.name Property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tool = tools?.find((t: any) => {
          // Genkit Tools haben verschiedene Strukturen je nach Version
          const name = t.__action?.name || t.name || t.__name;
          return name === toolName;
        });
        let result: Record<string, unknown> | undefined;

        if (tool) {
          try {
            // Genkit ToolAction ist direkt aufrufbar als Funktion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await (tool as any)(toolInput) as Record<string, unknown>;
            console.log('[AgenticFlow] Tool result:', result);

            // SPECIAL HANDLING: Fakten-Matrix in Firestore speichern
            console.log('[AgenticFlow] Checking special handling for:', toolName, 'projectId:', input.projectId);
            if (toolName === 'skill_save_fakten_matrix' && result?.success && result?.faktenMatrix) {
              console.log('[AgenticFlow] Fakten-Matrix condition matched! projectId:', input.projectId);
              if (input.projectId) {
                try {
                  const faktenMatrix = result.faktenMatrix as FaktenMatrixCreateData;
                  await saveFaktenMatrix(input.projectId, faktenMatrix);
                  console.log('[AgenticFlow] Fakten-Matrix saved to Firestore for project:', input.projectId);
                  result = {
                    ...result,
                    message: 'Fakten-Matrix erfolgreich in Firestore gespeichert.',
                    savedToFirestore: true,
                  };
                } catch (saveError) {
                  console.error('[AgenticFlow] Firestore save error:', saveError);
                  result = {
                    ...result,
                    message: 'Validierung OK, aber Firestore-Speicherung fehlgeschlagen.',
                    savedToFirestore: false,
                    firestoreError: String(saveError),
                  };
                }
              } else {
                console.warn('[AgenticFlow] skill_save_fakten_matrix called but no projectId provided');
                result = {
                  ...result,
                  message: 'Validierung OK, aber keine projectId - Speicherung nicht möglich.',
                  savedToFirestore: false,
                };
              }
            }
          } catch (error) {
            console.error('[AgenticFlow] Tool execution error:', error);
            result = { error: String(error) };
          }
        } else {
          console.warn('[AgenticFlow] Tool not found:', toolName, 'Available:', tools?.map((t: any) => t.__action?.name || t.name));
          result = { error: `Tool ${toolName} not found` };
        }

        toolCalls.push({
          name: toolName as ToolCall['name'],
          args: toolInput,
          result,
        });
      }
    }

    // 6. Text-Response generieren (iterativ)
    // Mit returnToolRequests=true bekommen wir keinen Text, daher Follow-up-Generate
    // WICHTIG: Wir iterieren bis wir Text bekommen oder maxIterations erreicht ist
    let textResponse = response.text || '';
    let currentToolRequests = toolRequests;
    let currentMessages = [...formattedMessages];
    const maxIterations = 5; // Sicherheitslimit
    let iteration = 0;

    while (toolCalls.length > 0 && !textResponse && iteration < maxIterations) {
      iteration++;
      console.log(`[AgenticFlow] Follow-up iteration ${iteration}/${maxIterations}...`);

      // Baue Tool-Response-Messages für den Follow-up-Call
      const toolResponseParts = toolCalls.slice(-currentToolRequests.length).map(tc => ({
        toolResponse: {
          name: tc.name,
          ref: tc.name, // Einfache Ref für Follow-up
          output: tc.result || {},
        },
      }));

      // Erweitere Messages mit den letzten Tool-Requests und Responses
      currentMessages = [
        ...currentMessages,
        // Model's Tool-Requests
        {
          role: 'model' as const,
          content: currentToolRequests.map(tr => ({
            toolRequest: tr.toolRequest,
          })),
        },
        // Tool-Responses
        {
          role: 'tool' as const,
          content: toolResponseParts,
        },
      ];

      // Follow-up Generate - returnToolRequests=true um weitere Tool-Calls zu fangen
      const followUpResponse = await ai.generate({
        model: gemini25FlashModel,
        system: systemPrompt,
        messages: currentMessages,
        tools: hasTools ? tools : undefined,
        returnToolRequests: true,
        config: {
          temperature: 0.7,
        },
      });

      // Prüfe ob Text zurückkam
      if (followUpResponse.text) {
        textResponse = followUpResponse.text;
        console.log('[AgenticFlow] Follow-up response:', textResponse.substring(0, 100));
        break;
      }

      // Prüfe ob neue Tool-Requests kamen
      const newToolRequests = followUpResponse.toolRequests || [];
      if (newToolRequests.length > 0) {
        console.log('[AgenticFlow] Follow-up has more tool requests:', newToolRequests.length);

        // Führe die neuen Tools aus
        for (const request of newToolRequests) {
          const toolName = request.toolRequest.name;
          const toolInput = request.toolRequest.input as Record<string, unknown>;
          console.log('[AgenticFlow] Executing follow-up tool:', toolName, toolInput);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tool = tools?.find((t: any) => {
            const name = t.__action?.name || t.name || t.__name;
            return name === toolName;
          });
          let result: Record<string, unknown> | undefined;

          if (tool) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              result = await (tool as any)(toolInput) as Record<string, unknown>;
              console.log('[AgenticFlow] Follow-up tool result:', result);

              // SPECIAL HANDLING: Fakten-Matrix in Firestore speichern (auch in Follow-ups)
              if (toolName === 'skill_save_fakten_matrix' && result?.success && result?.faktenMatrix) {
                if (input.projectId) {
                  try {
                    const faktenMatrix = result.faktenMatrix as FaktenMatrixCreateData;
                    await saveFaktenMatrix(input.projectId, faktenMatrix);
                    console.log('[AgenticFlow] Follow-up: Fakten-Matrix saved to Firestore for project:', input.projectId);
                    result = {
                      ...result,
                      message: 'Fakten-Matrix erfolgreich in Firestore gespeichert.',
                      savedToFirestore: true,
                    };
                  } catch (saveError) {
                    console.error('[AgenticFlow] Follow-up: Firestore save error:', saveError);
                    result = {
                      ...result,
                      message: 'Validierung OK, aber Firestore-Speicherung fehlgeschlagen.',
                      savedToFirestore: false,
                      firestoreError: String(saveError),
                    };
                  }
                } else {
                  console.warn('[AgenticFlow] Follow-up: skill_save_fakten_matrix called but no projectId provided');
                  result = {
                    ...result,
                    message: 'Validierung OK, aber keine projectId - Speicherung nicht möglich.',
                    savedToFirestore: false,
                  };
                }
              }
            } catch (error) {
              console.error('[AgenticFlow] Follow-up tool execution error:', error);
              result = { error: String(error) };
            }
          } else {
            result = { error: `Tool ${toolName} not found` };
          }

          toolCalls.push({
            name: toolName as ToolCall['name'],
            args: toolInput,
            result,
          });
        }

        currentToolRequests = newToolRequests;
      } else {
        // Kein Text und keine Tools - breche ab
        console.log('[AgenticFlow] No text and no more tool requests, breaking loop');
        break;
      }
    }

    if (iteration >= maxIterations && !textResponse) {
      console.warn('[AgenticFlow] Max iterations reached without text response');
      textResponse = 'Ich habe die Informationen verarbeitet. Wie kann ich Ihnen weiterhelfen?';
    }

    // 7. Prüfen ob ein Agent-Wechsel gewünscht ist
    let nextAgent: string | undefined;

    // Prüfe ob ein Handoff-Wunsch im Text enthalten ist
    const handoffPatterns = [
      { pattern: /\[HANDOFF:(\w+)\]/i, group: 1 },
      { pattern: /wechseln? (?:zu|zum|zur) (\w+)/i, group: 1 },
    ];

    for (const { pattern, group } of handoffPatterns) {
      const match = textResponse.match(pattern);
      if (match) {
        nextAgent = match[group];
        break;
      }
    }

    return {
      response: textResponse,
      toolCalls,
      nextAgent,
    };
  }
);

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export { AgenticChatInputSchema, AgenticChatOutputSchema };
