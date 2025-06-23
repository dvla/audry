import { Selector } from '@microsoft/teams-ai'
import { ActivityContext } from '../internal/conversationHandlers'
import { Config } from '../internal/config'
import { getExtractedText, writeTranscript } from '../internal/utils/documentUtils'
import { getGoogleClient } from '../tts/textoSpeechGoogle'
import { errorCard, processingCard, textToTranscriptCard } from '../internal/cards'

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

It is ESSENTIAL to follow the turn based structure of the conversation, for example:
Speaker 1: dialogue text here
Speaker 2: dialogue text here
Speaker 1: dialogue text here
Speaker 2: dialogue text here`

/**
 * TextToTranscriptActionHandler is a class that handles the action of converting text to a transcript.
 */
export class TextToTranscriptHandler {
  triggerVerb: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TRIGGER_PATTERN

  /**
   * Handles the action when invoked from a button on an adaptive card.
   * @param context - The activity context containing the conversation and activity.
   * @returns An Adaptive Card indicating the processing state.
   */
  async handleActionInvoked(context: ActivityContext) {
    setImmediate(async () => this.generateTranscript(context))

    return processingCard('Generating transcript... This may take a few minutes.')
  }

  /**
   * Generates a transcript from the extracted text.
   * @param context - The activity context containing the conversation and proactiveSendCard.
   * @return A promise that resolves when the transcript is generated and sent as an Adaptive Card.
   */
  async generateTranscript({ proactiveSendCard, conversation }: ActivityContext): Promise<void> {
    try {
      const ai = getGoogleClient()
      const documentId = conversation.documentId // <-- get the UUID
      const extractedText = await getExtractedText(documentId)
      // Stream the response using system instructions and file text
      const config = {
        responseMimeType: 'text/plain',
        systemInstruction: SYSTEM_INSTRUCTIONS,
      }

      const response = await ai.models.generateContentStream({
        model: Config.GEMINI_MODEL,
        config,
        contents: extractedText,
      })

      // Process the streamed response
      let responseText = ''
      for await (const chunk of response) {
        console.log(chunk.text)
        responseText += chunk.text
      }

      await writeTranscript(responseText, documentId)

      await proactiveSendCard(textToTranscriptCard('Transcript Created - transcriptToAudio', responseText))
    } catch (error) {
      console.error('Error generating transcript:', error)
      await proactiveSendCard(errorCard('An error occurred while generating the transcript. Please try again later.'))
    }
  }
}
