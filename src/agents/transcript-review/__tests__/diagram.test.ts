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

const filePath = path.join(Config.FILES_DIR, 'transcript-review-diagram.txt')
describe('TranscriptReviewAgent', () => {
  it('should create a graph diagram', async () => {
    expect(graph).toBeDefined()
    const graphData = await graph.getGraphAsync()
    const mermaid = await graphData.drawMermaid()
    writeFileSync(filePath, mermaid)
    await expect(stat(filePath)).resolves.not.toThrow()
    expect(mermaid).toMatchSnapshot()
  })
})
