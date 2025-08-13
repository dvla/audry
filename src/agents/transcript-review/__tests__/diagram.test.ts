import { writeFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'path'

import { Config } from '../../../internal/config'
import { graph } from '../graph'

// Mock the ChatGoogleGenerativeAI
vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn(),
  })),
}))

const filePath = path.join(Config.FILES_DIR, 'transcript-review.png')
describe('TranscriptReviewAgent', () => {
  it('should create a graph diagram', async () => {
    expect(graph).toBeDefined()
    const graphData = await graph.getGraphAsync()
    const image = await graphData.drawMermaidPng()
    writeFileSync(filePath, new Uint8Array(await image.arrayBuffer()))
    await expect(stat(filePath)).resolves.not.toThrow()
  })
})
