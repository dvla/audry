import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { AdaptiveCard, Selector } from '@microsoft/teams-ai'
import * as ACData from 'adaptivecards-templating'
import responseCard from '../adaptiveCards/textToTranscriptActionResponse.json'
import { GoogleGenAI } from '@google/genai'
import { TurnContext } from 'botbuilder'
import { ApplicationTurnState } from 'src/internal/interface'
import { readTextFromFile } from '../internal/utils/fileUtils'
import { Config } from '../internal/config'

const FILE_TRIGGER_PATTERN = 'textToTranscript'
const SYSTEM_INSTRUCTIONS = `You are the a world-class podcast writer, you have worked as a ghost writer for Joe Rogan, Lex Fridman, Richard Osman, The Beast.

We are in an alternate universe where actually you have been writing every line they say and they just stream it into their brains.  You have won multiple podcast awards for your writing.

Your job is to write word by word, even "umm, hmmm, right" interruptions by the second speaker based on the text provided. Keep it extremely engaging, the speakers can get derailed now and then but should discuss the topic.

Remember Speaker 2 is new to the topic and the conversation should always have realistic anecdotes and analogies sprinkled throughout. The questions should have real world example follow ups etc

Speaker 1: Leads the conversation and teaches the speaker 2, gives incredible anecdotes and analogies when explaining. Is a captivating teacher that gives great anecdotes

Speaker 2: Keeps the conversation on track by asking follow up questions. Gets super excited or confused when asking questions. Is a curious mindset that asks very interesting confirmation questions

Make sure the tangents speaker 2 provides are quite wild or interesting.

Ensure there are interruptions during explanations or there are "hmmmm...", "well..." and "umm..." injected throughout from the second speaker.

It should be a real podcast with every fine nuance documented in as much detail as possible. Welcome the listeners with a super fun overview and keep it really catchy and almost borderline click bait

Speaker 1 is called Matthew and Speaker 2 is called Ellie.

ALWAYS START YOUR RESPONSE DIRECTLY WITH SPEAKER 1:
DO NOT GIVE EPISODE TITLES SEPARATELY, LET SPEAKER 1 TITLE IT IN HER SPEECH
DO NOT GIVE CHAPTER TITLES OR MENTION THE SPEAKERS' NAMES BEFORE THE COLON
IT SHOULD STRICTLY BE THE DIALOGUES
LIMIT THE RESPONSE TO 2 TURNS PER SPEAKER

It is ESSENTIAL to follow the turn based structure of the conversation, for example:
Speaker 1: dialogue text here
Speaker 2: dialogue text here
Speaker 1: dialogue text here
Speaker 2: dialogue text here`

/**
 * TextToTranscriptActionHandler is a class that handles the action of converting text to a transcript.
 */
export class TextToTranscriptActionHandler {
  triggerVerb: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TRIGGER_PATTERN

  /**
   * Handles the action when invoked.
   * @param context - The turn context.
   * @param state - The application state.
   * @param data - The action data.
   * @returns A promise that resolves to the result of the action.
   */
  async handleActionInvoked(context: TurnContext, state: ApplicationTurnState) {
    // Create a new instance of GoogleGenAI with the API key
    const ai = new GoogleGenAI({
      apiKey: Config.GEMINI_API_KEY,
    })
    const documentId = state.conversation.documentId // <-- get the UUID

    // Stream the response using system instructions and file text
    const config = {
      responseMimeType: 'text/plain',
      systemInstruction: SYSTEM_INSTRUCTIONS,
    }

    const response = await ai.models.generateContentStream({
      model: Config.GEMINI_MODEL,
      config,
      contents: await readTextFromFile(state.conversation.extractedTextPath),
    })

    // Process the streamed response
    let responseText = ''
    for await (const chunk of response) {
      console.log(chunk.text)
      responseText += chunk.text
    }

    // Use the same UUID for the extracted file name
    const tempFilePath = path.join(os.tmpdir(), `transcript_${documentId}.txt`)
    await fs.writeFile(tempFilePath, responseText, 'utf8')
    state.conversation.transcriptTextPath = tempFilePath
    console.log('Transcript text saved to:', tempFilePath)

    // Return the response as an Adaptive Card
    const cardJson = new ACData.Template(responseCard).expand({
      $root: {
        title: 'Transcript Created',
        transcript: responseText,
      },
    })
    return cardJson as AdaptiveCard
  }
}
