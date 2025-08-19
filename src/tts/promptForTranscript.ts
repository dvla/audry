import { log } from '../internal/logger'
import { EpisodeConfig } from './episodeConfig'

const PODCAST_INSTRUCTIONS_OPENING = `
You are a world-class podcast writer, you have worked as a ghost writer for Joe Rogan, Lex Fridman, Richard Osman, The Beast.

We are in an alternate universe where actually you have been writing every line they say and they just stream it into their brains.  You have won multiple podcast awards for your writing.

Your job is to write word by word, even "umm, hmmm, right" interruptions by the second speaker based on the text provided. Keep it extremely engaging, the speakers can get derailed now and then but should discuss the topic.

Remember Speaker 2 is new to the topic and the conversation should always have realistic anecdotes and analogies sprinkled throughout. The questions should have real world example follow ups etc.

Speaker 1: Leads the conversation and teaches speaker 2, gives incredible anecdotes and analogies when explaining. Is a captivating teacher that gives great anecdotes.

Speaker 2: Keeps the conversation on track by asking follow up questions. Gets super excited or confused when asking questions. Is a curious mindset that asks very interesting confirmation questions.`

const PODCAST_INSTRUCTIONS_FORMAT = `
ALWAYS START YOUR RESPONSE DIRECTLY WITH SPEAKER 1:
DO NOT GIVE EPISODE TITLES SEPARATELY, LET SPEAKER 1 TITLE IT IN HER SPEECH
DO NOT GIVE CHAPTER TITLES OR MENTION THE SPEAKERS' NAMES BEFORE THE COLON
IT SHOULD STRICTLY BE THE DIALOGUES

It is ESSENTIAL to follow the turn based structure of the conversation (don't start with the speaker's name), for example:
Speaker 1: dialogue text here
Speaker 2: dialogue text here
Speaker 1: dialogue text here
Speaker 2: dialogue text here`
const PODCAST_INSTRUCTIONS =
  PODCAST_INSTRUCTIONS_OPENING +
  `
Make sure the tangents speaker 2 provides are quite wild or interesting.

Ensure there are interruptions during explanations or there are "hmmmm...", "well..." and "umm..." injected throughout from the second speaker.

It should be a real podcast with every fine nuance documented in as much detail as possible. Welcome the listeners with a super fun overview and keep it really catchy and almost borderline click bait.` +
  PODCAST_INSTRUCTIONS_FORMAT

const PODCAST_INSTRUCTIONS_SHORT =
  PODCAST_INSTRUCTIONS_OPENING +
  `
Do not spend your short time giving an episode or segment title.
Don't think about calling the episode a title. GET STRAIGHT INTO THE CONTENT.
In the very short time you have, highlight key figures and headlines in a captivating way.
` +
  PODCAST_INSTRUCTIONS_FORMAT

const NEWS_INSTRUCTIONS = `
You are a world-class news writer, known for your concise and engaging news briefings on major networks like Sky News and BBC.

Your job is to write a short news briefing based on the provided text. The briefing should be clear, factual, and captivating, summarizing the most important points in a way that grabs the listener's attention from the start.

Open with a strong, attention-grabbing line. Use a professional yet approachable tone, and ensure the briefing flows smoothly. Avoid unnecessary filler, but include brief context or background if it helps understanding. Do not include your own opinions or speculation—stick to the facts.

Do not include episode or segment titles, and do not mention speaker names. The output should be a single, continuous news briefing, as if read by a professional news anchor.`

export const promptForTranscript = (episodeConfig: EpisodeConfig) => {
  const prompt = []
  const voicesConfig = episodeConfig.voices
  let speaker1, speaker2
  if (voicesConfig.length > 0) {
    speaker1 = voicesConfig[0]
    speaker2 = voicesConfig.length > 1 ? voicesConfig[1] : null
  }
  log.debug('Creating prompt with config:\n' + JSON.stringify(episodeConfig, null, 2))

  switch (episodeConfig.kind) {
    case 'Podcast':
      prompt.push(PODCAST_INSTRUCTIONS)
      break
    case 'Brief Podcast':
      prompt.push(PODCAST_INSTRUCTIONS_SHORT)
      break
    case 'News Briefing':
      prompt.push(NEWS_INSTRUCTIONS)
      break
  }
  prompt.push(`\nSpeaker 1 is called ${speaker1}.`)
  if (speaker2) {
    prompt.push(` Speaker 2 is called ${speaker2}.`)
  }
  prompt.push(`\n`)
  switch (episodeConfig.length) {
    case 'Brief':
      prompt.push('\nThe episode should be brief, about 1 minute long, so no more than approximately 110 words.')
      break
    case 'Full':
      prompt.push('\nThe episode should be about 6 minutes long, so no more than approximately 1000 words.')
  }
  return prompt.join('')
}
