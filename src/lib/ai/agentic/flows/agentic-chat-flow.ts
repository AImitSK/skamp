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

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
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

    // 3. Nachrichten formatieren - WICHTIG: Leere Messages herausfiltern!
    // Genkit akzeptiert keine leeren Text-Parts: "Unsupported Part type {"text":""}"
    const messagesToFormat = (input.messages || []).filter(msg => msg.content && msg.content.trim().length > 0);
    const formattedMessages = messagesToFormat.map(msg => ({
      role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
      content: [{ text: msg.content }],
    }));

    // Debug-Logging
    console.log('[AgenticFlow] specialistType:', input.specialistType);
    console.log('[AgenticFlow] tools count:', tools?.length ?? 0);
    console.log('[AgenticFlow] original messages:', input.messages?.length ?? 0);
    console.log('[AgenticFlow] filtered messages:', formattedMessages.length);
    console.log('[AgenticFlow] first message:', formattedMessages[0]);

    // 4. Generieren mit Tools
    console.log('[AgenticFlow] Calling ai.generate...');
    const response = await ai.generate({
      model: gemini25FlashModel,
      system: systemPrompt,
      messages: formattedMessages.length > 0 ? formattedMessages : undefined,
      prompt: formattedMessages.length === 0 ? 'Starte den Prozess.' : undefined,
      tools: tools?.length > 0 ? tools : undefined,
      config: {
        temperature: 0.7,
      },
    });
    console.log('[AgenticFlow] ai.generate completed successfully');

    // 5. Tool-Calls extrahieren
    const toolCalls: ToolCall[] = [];

    // Durchlaufe alle Teile der Response (wenn vorhanden)
    if (response.message?.content) {
      for (const part of response.message.content) {
        if (part.toolRequest) {
          const toolRequest = part.toolRequest;
          // Finde das entsprechende Tool-Result
          const toolResult = response.message.content.find(
            p => p.toolResponse?.ref === toolRequest.ref
          );

          toolCalls.push({
            name: toolRequest.name as ToolCall['name'],
            args: toolRequest.input as Record<string, unknown>,
            result: toolResult?.toolResponse?.output as Record<string, unknown> | undefined,
          });
        }
      }
    }

    // 6. Text-Response extrahieren
    const textResponse = response.text;

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
