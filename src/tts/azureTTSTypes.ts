/**
 * Azure Text-to-Speech Types and SSML Builder
 *
 * This module provides comprehensive types and a builder pattern for constructing
 * SSML (Speech Synthesis Markup Language) content for Azure Cognitive Services Text-to-Speech.
 *
 * @see https://learn.microsoft.com/azure/ai-services/speech-service/speech-synthesis-markup
 */

/**
 * Voice types supported by Azure TTS
 */
export enum AzureVoiceType {
  NEURAL = 'Neural',
  STANDARD = 'Standard',
}

/**
 * Supported speaking styles for neural voices
 * Different voices support different styles - check Azure documentation for voice-specific styles
 */
export enum SpeakingStyle {
  ADVERTISEMENT_UPBEAT = 'advertisement_upbeat',
  AFFECTIONATE = 'affectionate',
  ANGRY = 'angry',
  ASSISTANT = 'assistant',
  CALM = 'calm',
  CHAT = 'chat',
  CHEERFUL = 'cheerful',
  CUSTOMERSERVICE = 'customerservice',
  DEPRESSED = 'depressed',
  DISGRUNTLED = 'disgruntled',
  DOCUMENTARY_NARRATION = 'documentary-narration',
  EMBARRASSED = 'embarrassed',
  EMPATHETIC = 'empathetic',
  ENVIOUS = 'envious',
  EXCITED = 'excited',
  FEARFUL = 'fearful',
  FRIENDLY = 'friendly',
  GENTLE = 'gentle',
  HOPEFUL = 'hopeful',
  LYRICAL = 'lyrical',
  NARRATION_PROFESSIONAL = 'narration-professional',
  NARRATION_RELAXED = 'narration-relaxed',
  NEWSCAST = 'newscast',
  NEWSCAST_CASUAL = 'newscast-casual',
  NEWSCAST_FORMAL = 'newscast-formal',
  POETRY_READING = 'poetry-reading',
  SAD = 'sad',
  SERIOUS = 'serious',
  SHOUTING = 'shouting',
  SPORTS_COMMENTARY = 'sports_commentary',
  SPORTS_COMMENTARY_EXCITED = 'sports_commentary_excited',
  WHISPERING = 'whispering',
  TERRIFIED = 'terrified',
  UNFRIENDLY = 'unfriendly',
}

/**
 * Role types for multi-speaker scenarios
 */
export enum VoiceRole {
  GIRL = 'Girl',
  BOY = 'Boy',
  YOUNG_ADULT_FEMALE = 'YoungAdultFemale',
  YOUNG_ADULT_MALE = 'YoungAdultMale',
  OLDER_ADULT_FEMALE = 'OlderAdultFemale',
  OLDER_ADULT_MALE = 'OlderAdultMale',
  SENIOR_FEMALE = 'SeniorFemale',
  SENIOR_MALE = 'SeniorMale',
}

/**
 * Prosody contour point for pitch control
 */
export interface ContourPoint {
  /** Percentage of text duration (0-100%) */
  time: string
  /** Pitch change (e.g., "+20Hz", "-10%", "high") */
  value: string
}

/**
 * Break strength values for pauses
 */
export enum BreakStrength {
  NONE = 'none',
  X_WEAK = 'x-weak',
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
  X_STRONG = 'x-strong',
}

/**
 * Phoneme alphabet types
 */
export enum PhonemeAlphabet {
  IPA = 'ipa',
  SAPI = 'sapi',
  UPS = 'x-microsoft-ups',
}

/**
 * Say-as interpretation types
 */
export enum SayAsInterpret {
  ADDRESS = 'address',
  CARDINAL = 'cardinal',
  CHARACTERS = 'characters',
  DATE = 'date',
  DIGITS = 'digits',
  FRACTION = 'fraction',
  ORDINAL = 'ordinal',
  TELEPHONE = 'telephone',
  TIME = 'time',
  NAME = 'name',
  NET = 'net',
  CURRENCY = 'currency',
}

/**
 * Prosody configuration for controlling speech characteristics
 */
export interface ProsodyConfig {
  /** Pitch: absolute, relative, or named value (e.g., "200Hz", "+20%", "high") */
  pitch?: string
  /** Contour: array of pitch changes over time */
  contour?: ContourPoint[]
  /** Range: pitch range variation (e.g., "+20%", "high") */
  range?: string
  /** Rate: speaking speed (e.g., "0.8", "+20%", "fast") */
  rate?: string
  /** Volume: loudness (e.g., "80", "+20%", "loud") */
  volume?: string
}

/**
 * Voice effect configuration (neural voices only)
 */
export interface VoiceEffectConfig {
  /** Effect name - currently only "eq_telecom" is supported */
  effect: 'eq_telecom'
}

/**
 * Dialog turn for multi-speaker conversations
 */
export interface DialogTurn {
  /** Speaker identifier (e.g., "andrew", "ava") */
  speaker: string
  /** Text spoken by this speaker */
  text: string
}

/**
 * SSML Builder for constructing Azure TTS SSML documents
 *
 * @example
 * ```typescript
 * const ssml = new SSMLBuilder('en-US', 'en-US-JennyNeural')
 *   .addText('Hello! ')
 *   .addProsody({ rate: 'slow', pitch: '+10%' }, 'This is slower and higher.')
 *   .addBreak('500ms')
 *   .addEmphasis('strong', 'This is important!')
 *   .build();
 * ```
 */
export class SSMLBuilder {
  private elements: string[] = []
  private readonly language: string
  private readonly voiceName: string | null
  private voiceEffect?: VoiceEffectConfig
  private style?: SpeakingStyle
  private styleDegree?: number
  private role?: VoiceRole
  private multiVoiceMode: boolean = false

  /**
   * Creates a new SSML builder
   * @param language - Language code (e.g., "en-US")
   * @param voiceName - Full Azure voice name (e.g., "en-US-JennyNeural"), or null for multi-voice mode
   */
  constructor(language: string, voiceName: string | null = null) {
    this.language = language
    this.voiceName = voiceName
    this.multiVoiceMode = voiceName === null
  }

  /**
   * Sets the speaking style for the voice (neural voices only)
   * @param style - Speaking style
   * @param degree - Style intensity (0.01 to 2.0, default 1.0)
   * @returns This builder instance
   */
  setStyle(style: SpeakingStyle, degree: number = 1.0): this {
    this.style = style
    this.styleDegree = degree
    return this
  }

  /**
   * Sets the voice role for multi-speaker scenarios
   * @param role - Voice role
   * @returns This builder instance
   */
  setRole(role: VoiceRole): this {
    this.role = role
    return this
  }

  /**
   * Sets a voice effect (neural voices only)
   * @param effect - Voice effect configuration
   * @returns This builder instance
   */
  setVoiceEffect(effect: VoiceEffectConfig): this {
    this.voiceEffect = effect
    return this
  }

  /**
   * Adds plain text to be spoken
   * @param text - Text content
   * @returns This builder instance
   */
  addText(text: string): this {
    this.elements.push(this.escapeXml(text))
    return this
  }

  /**
   * Adds text with prosody controls
   * @param config - Prosody configuration
   * @param text - Text to apply prosody to
   * @returns This builder instance
   */
  addProsody(config: ProsodyConfig, text: string): this {
    const attrs: string[] = []

    if (config.pitch) attrs.push(`pitch="${config.pitch}"`)
    if (config.contour) {
      const contourStr = config.contour.map((p) => `(${p.time},${p.value})`).join(' ')
      attrs.push(`contour="${contourStr}"`)
    }
    if (config.range) attrs.push(`range="${config.range}"`)
    if (config.rate) attrs.push(`rate="${config.rate}"`)
    if (config.volume) attrs.push(`volume="${config.volume}"`)

    const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : ''
    this.elements.push(`<prosody${attrString}>${this.escapeXml(text)}</prosody>`)
    return this
  }

  /**
   * Adds a pause/break in speech
   * @param duration - Duration (e.g., "500ms", "2s") or strength
   * @returns This builder instance
   */
  addBreak(duration: string | BreakStrength): this {
    const isStrength = Object.values(BreakStrength).includes(duration as BreakStrength)
    const attr = isStrength ? `strength="${duration}"` : `time="${duration}"`
    this.elements.push(`<break ${attr}/>`)
    return this
  }

  /**
   * Adds emphasized text
   * @param level - Emphasis level ("strong", "moderate", "reduced", or "none")
   * @param text - Text to emphasize
   * @returns This builder instance
   */
  addEmphasis(level: 'strong' | 'moderate' | 'reduced' | 'none', text: string): this {
    this.elements.push(`<emphasis level="${level}">${this.escapeXml(text)}</emphasis>`)
    return this
  }

  /**
   * Adds a word with specific pronunciation using phonemes
   * @param word - The word to pronounce
   * @param phoneme - Phonetic pronunciation
   * @param alphabet - Phoneme alphabet to use
   * @returns This builder instance
   */
  addPhoneme(word: string, phoneme: string, alphabet: PhonemeAlphabet = PhonemeAlphabet.IPA): this {
    this.elements.push(`<phoneme alphabet="${alphabet}" ph="${phoneme}">${this.escapeXml(word)}</phoneme>`)
    return this
  }

  /**
   * Adds text with specific interpretation (numbers, dates, etc.)
   * @param interpret - How to interpret the text
   * @param text - Text to interpret
   * @param format - Optional format string (for dates, times)
   * @param detail - Optional detail level for dates
   * @returns This builder instance
   */
  addSayAs(interpret: SayAsInterpret, text: string, format?: string, detail?: string): this {
    const attrs = [`interpret-as="${interpret}"`]
    if (format) attrs.push(`format="${format}"`)
    if (detail) attrs.push(`detail="${detail}"`)

    this.elements.push(`<say-as ${attrs.join(' ')}>${this.escapeXml(text)}</say-as>`)
    return this
  }

  /**
   * Adds a substitution (displays one thing, says another)
   * @param display - Text to display
   * @param spoken - Text to speak
   * @returns This builder instance
   */
  addSubstitution(display: string, spoken: string): this {
    this.elements.push(`<sub alias="${this.escapeXml(spoken)}">${this.escapeXml(display)}</sub>`)
    return this
  }

  /**
   * Adds a paragraph break
   * @param text - Paragraph text
   * @returns This builder instance
   */
  addParagraph(text: string): this {
    this.elements.push(`<p>${this.escapeXml(text)}</p>`)
    return this
  }

  /**
   * Adds a sentence break
   * @param text - Sentence text
   * @returns This builder instance
   */
  addSentence(text: string): this {
    this.elements.push(`<s>${this.escapeXml(text)}</s>`)
    return this
  }

  /**
   * Adds an audio file to be played
   * @param src - URL to the audio file
   * @returns This builder instance
   */
  addAudio(src: string): this {
    this.elements.push(`<audio src="${this.escapeXml(src)}"/>`)
    return this
  }

  /**
   * Adds a bookmark for tracking speech progress
   * @param name - Bookmark name
   * @returns This builder instance
   */
  addBookmark(name: string): this {
    this.elements.push(`<bookmark mark="${this.escapeXml(name)}"/>`)
    return this
  }

  /**
   * Adds background audio (neural voices only)
   * @param src - URL to the background audio file
   * @param volume - Volume percentage (0-100)
   * @param fadeIn - Fade in duration in milliseconds
   * @param fadeOut - Fade out duration in milliseconds
   * @returns This builder instance
   */
  addBackgroundAudio(src: string, volume: number = 50, fadeIn?: number, fadeOut?: number): this {
    const attrs = [`src="${this.escapeXml(src)}"`, `volume="${volume}"`]
    if (fadeIn !== undefined) attrs.push(`fadein="${fadeIn}"`)
    if (fadeOut !== undefined) attrs.push(`fadeout="${fadeOut}"`)

    this.elements.push(`<mstts:backgroundaudio ${attrs.join(' ')}/>`)
    return this
  }

  /**
   * Adds a silence element (alternative to break)
   * @param type - Silence type ("Leading", "Tailing", "Sentenceboundary", "Comma", etc.)
   * @param value - Duration in milliseconds
   * @returns This builder instance
   */
  addSilence(type: string, value: number): this {
    this.elements.push(`<mstts:silence type="${type}" value="${value}ms"/>`)
    return this
  }

  /**
   * Adds a dialog section with multiple speakers (multi-talker voices only)
   * @param voiceName - Multi-talker voice name (e.g., "en-US-MultiTalker-Ava-Andrew:DragonHDLatestNeural")
   * @param turns - Array of dialog turns with speaker and text
   * @returns This builder instance
   * @example
   * ```typescript
   * builder.addDialog('en-US-MultiTalker-Ava-Andrew:DragonHDLatestNeural', [
   *   { speaker: 'andrew', text: 'Hello, welcome to the show!' },
   *   { speaker: 'ava', text: 'Thanks for having me!' }
   * ])
   * ```
   */
  addDialog(voiceName: string, turns: DialogTurn[]): this {
    const turnElements = turns
      .map((turn) => `<mstts:turn speaker="${turn.speaker}">${this.escapeXml(turn.text)}</mstts:turn>`)
      .join('\n    ')

    this.elements.push(
      `<voice name="${voiceName}">\n  <mstts:dialog>\n    ${turnElements}\n  </mstts:dialog>\n</voice>`
    )
    return this
  }

  /**
   * Adds a complete voice section with optional style and role
   * Use this for multi-voice documents where each section has different voices
   * @param voiceName - Voice name for this section
   * @param options - Optional style and role configuration
   * @param builder - Callback to add content with this voice
   * @returns This builder instance
   */
  addVoiceSectionWithStyle(
    voiceName: string,
    options: {
      style?: SpeakingStyle
      styleDegree?: number
      role?: VoiceRole
    },
    builder: (b: SSMLBuilder) => void
  ): this {
    const subBuilder = new SSMLBuilder(this.language, voiceName)
    if (options.style) {
      subBuilder.setStyle(options.style, options.styleDegree)
    }
    if (options.role) {
      subBuilder.setRole(options.role)
    }
    builder(subBuilder)

    // Get the content without the outer speak/voice wrapper
    const content = subBuilder.elements.join('')
    let wrappedContent = content

    if (subBuilder.style) {
      const expressAttrs = [`style="${subBuilder.style}"`]
      if (subBuilder.styleDegree !== undefined && subBuilder.styleDegree !== 1.0) {
        expressAttrs.push(`styledegree="${subBuilder.styleDegree}"`)
      }
      if (subBuilder.role) {
        expressAttrs.push(`role="${subBuilder.role}"`)
      }
      wrappedContent = `<mstts:express-as ${expressAttrs.join(' ')}>\n    ${content}\n  </mstts:express-as>`
    } else if (subBuilder.role) {
      wrappedContent = `<mstts:express-as role="${subBuilder.role}">\n    ${content}\n  </mstts:express-as>`
    }

    this.elements.push(`<voice name="${voiceName}">\n  ${wrappedContent}\n</voice>`)
    return this
  }

  /**
   * Groups content with a specific voice change
   * @param voiceName - Voice name to use for this section
   * @param builder - Callback to add content with the new voice
   * @returns This builder instance
   */
  addVoiceSection(voiceName: string, builder: (b: SSMLBuilder) => void): this {
    const subBuilder = new SSMLBuilder(this.language, voiceName)
    builder(subBuilder)
    const content = subBuilder.elements.join('')
    this.elements.push(`<voice name="${voiceName}">${content}</voice>`)
    return this
  }

  /**
   * Escapes XML special characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * Builds the complete SSML document
   * @returns Complete SSML string
   */
  build(): string {
    const xmlns = [
      'version="1.0"',
      'xmlns="http://www.w3.org/2001/10/synthesis"',
      'xmlns:mstts="https://www.w3.org/2001/mstts"',
      `xml:lang="${this.language}"`,
    ].join(' ')

    // Multi-voice mode: elements already contain complete voice tags
    if (this.multiVoiceMode || this.voiceName === null) {
      const content = this.elements.join('\n')
      return `<speak ${xmlns}>\n${content}\n</speak>`
    }

    // Single voice mode: wrap content in voice tag
    const voiceAttrs: string[] = [`name="${this.voiceName}"`]

    if (this.voiceEffect) {
      voiceAttrs.push(`effect="${this.voiceEffect.effect}"`)
    }

    const voiceAttrString = voiceAttrs.join(' ')

    // Build the content with optional express-as wrapper
    let content = this.elements.join('')

    if (this.style) {
      const expressAttrs = [`style="${this.style}"`]
      if (this.styleDegree !== undefined && this.styleDegree !== 1.0) {
        expressAttrs.push(`styledegree="${this.styleDegree}"`)
      }
      if (this.role) {
        expressAttrs.push(`role="${this.role}"`)
      }
      content = `<mstts:express-as ${expressAttrs.join(' ')}>${content}</mstts:express-as>`
    } else if (this.role) {
      content = `<mstts:express-as role="${this.role}">${content}</mstts:express-as>`
    }

    return `<speak ${xmlns}><voice ${voiceAttrString}>${content}</voice></speak>`
  }

  /**
   * Builds and returns the SSML as a formatted string
   * @returns Formatted SSML string
   */
  buildPretty(): string {
    // Simple pretty-print implementation
    return this.build()
      .replace(/></g, '>\n<')
      .split('\n')
      .map((line) => {
        const indent = '  '.repeat(Math.max(0, line.split('<').length - line.split('</').length - 1))
        return indent + line
      })
      .join('\n')
  }
}
