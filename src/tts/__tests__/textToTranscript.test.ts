import { describe, expect, it, vi } from 'vitest'

import { textToTranscript } from '../textToTranscript'
import * as clientModule from '../textoSpeechGoogle'

const TRANSCRIPT =
  "Speaker 1: Ellie, welcome to another electrifying episode! Today, we're diving deep into something that might sound a bit dry at first, but trust me, it's the backbone of how things get done in the modern world."

describe('textToTranscript', () => {
  it('should return concatenated response from stream chunks', async () => {
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: 'Speaker 1: Ellie, welcome to another electrifying episode!' }
        yield { text: " Today, we're diving deep into something that might sound a bit dry at first, but trust me, " }
        yield { text: "it's the backbone of how things get done in the modern world." }
      },
    }

    const mockClient = {
      models: {
        generateContentStream: vi.fn().mockResolvedValue(mockStream),
      },
    }

    vi.spyOn(clientModule, 'getGoogleClient').mockReturnValue(mockClient as any)

    const result = await textToTranscript(
      '',
      'Information Technology Services  Digital and Technology Strategic Plan  2021 24'
    )

    expect(result).toBe(TRANSCRIPT)
  })
})
