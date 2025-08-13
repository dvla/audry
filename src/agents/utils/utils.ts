import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

import { Config } from '../../internal/config'

// Chat model types
export enum ChatModels {
  GENERAL = 'general',
  THINKING = 'thinking',
}

// In-memory cache for chat models
const models = new Map<ChatModels, BaseChatModel>()

/**
 * Get the llm model based on the specified chat model type.
 * @param chatModel The type of chat model to retrieve.
 * @returns The chat model instance.
 */
export const getChatModel = (chatModel: ChatModels): BaseChatModel => {
  let model = models.get(chatModel)
  if (!model) {
    switch (chatModel) {
      case ChatModels.THINKING:
        model = new ChatGoogleGenerativeAI({
          model: Config.GEMINI_MODEL,
          apiKey: Config.GEMINI_API_KEY,
        })
        models.set(ChatModels.THINKING, model)
        break
      case ChatModels.GENERAL:
      // General is the default model
      default:
        model = new ChatGoogleGenerativeAI({
          model: Config.GEMINI_MODEL,
          apiKey: Config.GEMINI_API_KEY,
        })
        models.set(ChatModels.GENERAL, model)
        break
    }
  }
  return model
}
