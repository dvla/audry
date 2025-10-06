import { describe, expect, it } from 'vitest'

import { Config } from '../../../internal/config'
import { BG_SYSTEM_PROMPT, CR_SYSTEM_PROMPT, EDA_SYSTEM_PROMPT, EDITOR_SYSTEM_PROMPT } from '../prompts'

describe('Transcript Review Prompts', () => {
  describe('BG_SYSTEM_PROMPT (British Grammar & Localisation Expert)', () => {
    it('should include British English standards instructions', () => {
      expect(BG_SYSTEM_PROMPT).toContain('British Grammar and Localisation Expert')
      expect(BG_SYSTEM_PROMPT).toContain('British English standards')
    })

    it('should specify output format requirements', () => {
      expect(BG_SYSTEM_PROMPT).toContain('clear, self-contained sentence')
      expect(BG_SYSTEM_PROMPT).toContain('Avoid bullet points')
      expect(BG_SYSTEM_PROMPT).toContain('Do not rewrite the entire transcript')
    })
  })

  describe('CR_SYSTEM_PROMPT (Content Reviewer)', () => {
    it('should include Config.ORGANISATION_NAME in the prompt', () => {
      expect(CR_SYSTEM_PROMPT).toContain(Config.ORGANISATION_NAME)
    })

    it('should reference the organisation in context', () => {
      expect(CR_SYSTEM_PROMPT).toContain(
        `ensuring that podcast transcripts meet the professional and ethical communication standards of ${Config.ORGANISATION_NAME}`
      )
    })

    it('should include all required review areas', () => {
      expect(CR_SYSTEM_PROMPT).toContain('Clarity and Plain English')
      expect(CR_SYSTEM_PROMPT).toContain('Tone and Style')
      expect(CR_SYSTEM_PROMPT).toContain('Use of Jargon or Technical Language')
      expect(CR_SYSTEM_PROMPT).toContain('Complexity and Cognitive Load')
      expect(CR_SYSTEM_PROMPT).toContain('Cultural and Institutional Alignment')
      expect(CR_SYSTEM_PROMPT).toContain('Sensitive or Restricted Information')
      expect(CR_SYSTEM_PROMPT).toContain('Public Confidence and Reputational Risk')
    })

    it('should specify output format', () => {
      expect(CR_SYSTEM_PROMPT).toContain('list of complete feedback sentences')
      expect(CR_SYSTEM_PROMPT).toContain('Do **not** rewrite the full transcript')
    })

    it('should include fallback message for compliant content', () => {
      expect(CR_SYSTEM_PROMPT).toContain(
        'The transcript aligns with organisational standards in clarity, tone, and content'
      )
    })
  })

  describe('EDA_SYSTEM_PROMPT (Expressive Delivery Advisor)', () => {
    it('should identify its role as expressive delivery advisor', () => {
      expect(EDA_SYSTEM_PROMPT).toContain('Expressive Delivery Advisor')
      expect(EDA_SYSTEM_PROMPT).toContain('emotional expression or non-verbal sound cues')
    })

    it('should define Before/After output format', () => {
      expect(EDA_SYSTEM_PROMPT).toContain('Before/After format')
      expect(EDA_SYSTEM_PROMPT).toContain('**Before:**')
      expect(EDA_SYSTEM_PROMPT).toContain('**After:**')
    })
  })

  describe('EDITOR_SYSTEM_PROMPT (Professional Editor)', () => {
    it('should include Config.ORGANISATION_NAME in the prompt', () => {
      expect(EDITOR_SYSTEM_PROMPT).toContain(Config.ORGANISATION_NAME)
    })

    it('should reference default organisation in public audience context', () => {
      expect(EDITOR_SYSTEM_PROMPT).toContain(
        `**You are editing with DVLA (Driver and Vehicle Licensing Agency)’s public audience in mind.**`
      )
    })

    it('should specify editing objectives', () => {
      expect(EDITOR_SYSTEM_PROMPT).toContain('Apply British English Conventions')
      expect(EDITOR_SYSTEM_PROMPT).toContain('Address Reviewer Feedback')
      expect(EDITOR_SYSTEM_PROMPT).toContain('Ensure Readability for Speaking')
      expect(EDITOR_SYSTEM_PROMPT).toContain('Respect Speaker Voice')
    })

    it('should specify output requirements', () => {
      expect(EDITOR_SYSTEM_PROMPT).toContain('final edited transcript')
      expect(EDITOR_SYSTEM_PROMPT).toContain('Do not include revision tracking')
      expect(EDITOR_SYSTEM_PROMPT).toContain('Only show the final version')
    })

    it('should emphasize professional standards', () => {
      expect(EDITOR_SYSTEM_PROMPT).toContain('professionalism, clarity, accuracy, and accessibility')
      expect(EDITOR_SYSTEM_PROMPT).toContain('warm, human, fun and engaging')
    })
  })
})
