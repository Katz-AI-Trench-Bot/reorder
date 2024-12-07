import { openai } from './openai.js';
import { speechToText } from './speech.js';
import { textToSpeech } from './speech.js';
import { systemPrompts } from './prompts.js';

export class AIService {
  constructor() {
    this.openai = openai;
    this.conversationHistory = new Map();
  }

  async generateResponse(input, purpose, userId = null) {
    try {
      // Get conversation history for this user
      let messages = [];
      if (userId) {
        messages = this.conversationHistory.get(userId) || [];
      }

      // Add system prompt and user input
      if (messages.length === 0) {
        messages.push({
          role: "system",
          content: systemPrompts[purpose] || systemPrompts.general
        });
      }

      messages.push({
        role: "user",
        content: input
      });

      const response = await this.openai.chat.completions.create({
        model: purpose === 'image' ? "gpt-4-vision-preview" : "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 500
      });

      const reply = response.choices[0].message;
      messages.push(reply);

      if (userId) {
        this.conversationHistory.set(userId, messages);
      }

      return reply.content;
    } catch (error) {
      console.error('AI service error:', error);
      error.name = 'AIServiceError';
      throw error;
    }
  }

  async processVoiceCommand(audioBuffer) {
    try {
      const text = await speechToText(audioBuffer);
      const response = await this.generateResponse(text, 'chat');
      const audioResponse = await textToSpeech(response);
      return {
        text,
        response,
        audio: audioResponse
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      throw error;
    }
  }

  clearConversation(userId) {
    this.conversationHistory.delete(userId);
  }
}

export const aiService = new AIService();