import { writeFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'path'
import { vi } from 'vitest'

import { Config } from '../../../internal/config'
import { graph } from '../graph'

// Mock the ChatGoogleGenerativeAI
vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn(function (this: any) {
    return {
      withStructuredOutput: vi.fn(),
    }
  }),
}))

const filePath = path.join(Config.FILES_DIR, 'show-notes-diagram.txt')
describe('ShowNotesAgent', () => {
  it('should create a graph diagram', async () => {
    expect(graph).toBeDefined()
    const graphData = await graph.getGraphAsync()
    const mermaid = await graphData.drawMermaid()
    writeFileSync(filePath, mermaid)
    await expect(stat(filePath)).resolves.not.toThrow()
    expect(mermaid).toMatchSnapshot()
  })
})
