// src/lib/ai/agentic/flows/agentic-chat-flow.ts
// Haupt-Flow für das Agentic Chat System

import { ai, gemini25FlashModel } from '@/lib/ai/genkit-config';
import { z } from 'genkit';
import { getSkillsForAgent } from '../skills';
import { loadSpecialistPrompt } from '../prompts/prompt-loader';
import type { SpecialistType, ToolCall, ChatMessage } from '../types';

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
    const systemPrompt = await loadSpecialistPrompt(
      input.specialistType,
      input.language,
      input.companyName
    );

    // 2. Tools für diesen Agenten laden
    const tools = getSkillsForAgent(input.specialistType);
    console.log('[AgenticFlow] Loaded skills for', input.specialistType, '- count:', tools?.length);

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

    // 6. Text-Response generieren
    // Mit returnToolRequests=true bekommen wir keinen Text, daher Follow-up-Generate
    let textResponse = response.text || '';

    if (toolCalls.length > 0 && !textResponse) {
      console.log('[AgenticFlow] Generating follow-up text response...');

      // Baue Tool-Response-Messages für den Follow-up-Call
      const toolResponseParts = toolCalls.map(tc => ({
        toolResponse: {
          name: tc.name,
          ref: tc.name, // Einfache Ref für Follow-up
          output: tc.result || {},
        },
      }));

      // Follow-up Generate ohne mode='ANY' um Text zu bekommen
      const followUpResponse = await ai.generate({
        model: gemini25FlashModel,
        system: systemPrompt,
        messages: [
          ...formattedMessages,
          // Model's Tool-Requests
          {
            role: 'model' as const,
            content: toolRequests.map(tr => ({
              toolRequest: tr.toolRequest,
            })),
          },
          // Tool-Responses
          {
            role: 'tool' as const,
            content: toolResponseParts,
          },
        ],
        tools: hasTools ? tools : undefined,
        // Kein mode='ANY' hier - wir wollen Text, keine weiteren Tools
        returnToolRequests: true,
        config: {
          temperature: 0.7,
        },
      });

      textResponse = followUpResponse.text || '';
      console.log('[AgenticFlow] Follow-up response:', textResponse.substring(0, 100));
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
