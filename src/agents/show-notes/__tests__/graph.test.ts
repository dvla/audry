import { vi } from 'vitest'

import { graph } from '../graph'

// Mock the ChatGoogleGenerativeAI
vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        title: 'Great Episode Title',
        shortSummary: 'Mock summary of the episode content with key points and insights.',
        numOfWords: '42',
      }),
    }),
  })),
}))

const transcript = `Speaker 1: Ellie, welcome back to the show! Today, we're diving deep into something that might sound a little dry at first, but trust me, it affects every single one of us who has ever flown on a plane. We're talking about the UK Airspace Design Service, or UKADS. I think we can call this episode "Clearing the Air: Unpacking the UK's Ambitious Airspace Overhaul" What it means for smoother, greener, and quieter skies.

Speaker 2: Okay, Matthew, airspace design? Sounds… bureaucratic, I’m not gonna lie. But you've piqued my interest. I mean, I get on a plane, it takes off, it lands. What's there to design? Is it like city planning, but for planes? And smoother, greener, quieter skies? That sounds amazing, especially the quieter part. Living near Heathrow sometimes feels like living inside a jet engine. You know I once tried to do yoga outside and a plane flew over and I nearly fell out of my tree pose! So tell me, what exactly is this UKADS thing and why should I care?

Speaker 1: That's the perfect starting point, Ellie. You're right, most people don't think twice about what goes on behind the scenes to make air travel possible. But think of it like this: imagine a city with no traffic lights, no road markings, and everyone just driving wherever they want. Chaos, right? Airspace is the same. It needs organization, especially with the increasing number of flights. The UKADS is essentially a master plan for our skies. The goal is to modernize the airspace, making flights more efficient, reducing delays, lowering emissions, and yes, even making them quieter. So, you know your yoga sessions can stay zen.

Speaker 2: Okay, I'm with you. It's like air traffic control on steroids, but with a long-term vision. So, who's in charge of this ambitious project? I mean, designing airspace sounds incredibly complex. It's not just drawing lines on a map, is it? I assume you need experts that do that kind of work everyday right?
`
describe('ShowNotesAgent', () => {
  it('should run correctly', async () => {
    const initialInput = {
      transcript: transcript,
    }
    const config = { thread_id: 'thread-1' }

    const response = await graph.invoke(initialInput, {
      configurable: config,
    })

    // Assertions to verify the response structure
    expect(response.wordCount).toBe(337)
    expect(response.showNotes.title).toBe('Great Episode Title')
    expect(response.showNotes.shortSummary).toBe('Mock summary of the episode content with key points and insights.')
    expect(response.showNotes.numOfWords).toBe('42')
  }, 30000)
})
