import * as ACData from 'adaptivecards-templating'
import * as path from 'path'

import errorCardJson from '../adaptiveCards/errorCard.json'
import processingCardJson from '../adaptiveCards/processingCard.json'
import transcriptToAudioCardJson from '../adaptiveCards/transcriptToAudioCard.json'
import uploadFileCardJson from '../adaptiveCards/uploadFileCard.json'
import warningCardJson from '../adaptiveCards/warningCard.json'
import { Feature, isFeatureEnabled } from '../features/featureFlags'
import {
  DEFAULT_CONFIG,
  EpisodeConfig,
  EpisodeIntro,
  EpisodeKind,
  EpisodeLanguages,
  EpisodeLength,
  EpisodeOutro,
  EpisodeVoices,
} from '../tts/episodeConfig'

export const SAVE_CONFIG_MESSAGE = 'saveConfig'
export const CARD_ACTION_SET = 'ActionSet'
export const SHOW_CARD_ACTION = 'Action.ShowCard'

interface CardItem {
  type: string
}

/**
 * Generates an error card with the provided message.
 * @param message The error message to display on the card.
 * @returns An Adaptive Card with the error message.
 */
export const errorCard = (message: string): any => {
  return new ACData.Template(errorCardJson).expand({
    $root: {
      message: message,
    },
  })
}

/**
 * Generates a warning card with the provided message.
 * @param message The warning message to display on the card.
 * @returns An Adaptive Card with the warning message.
 */
export const warningCard = (message: string): any => {
  return new ACData.Template(warningCardJson).expand({
    $root: {
      message: message,
    },
  })
}

/**
 * Generates a processing card with the provided message.
 * @param message The message to display on the card indicating processing status.
 * @returns An Adaptive Card indicating processing status.
 */
export const processingCard = (title: string, message: string) => {
  return new ACData.Template(processingCardJson).expand({
    $root: {
      title: title,
      message: message,
    },
  })
}

/**
 * Generates an upload file card with the provided title and body text.
 * @param title The title of the card.
 * @param body The body text of the card.
 * @returns An Adaptive Card with the title and body text.
 */
export const uploadFileCard = async (title: string, body: string, config: EpisodeConfig) => {
  const extendedConfig = await isFeatureEnabled(Feature.ExtendedConfig)
  if (!extendedConfig) {
    resetExtendedConfig(config)
  }
  // Create a deep copy so we don't mutate the original
  const uploadFileCardCopy = structuredClone(uploadFileCardJson)
  const actionSet = uploadFileCardCopy.body.find((item: CardItem) => item.type === CARD_ACTION_SET)
  if (actionSet) {
    actionSet.actions = [...actionSet.actions, episodeConfigCard(config, extendedConfig)]
  }

  return new ACData.Template(uploadFileCardCopy).expand({
    $root: {
      title,
      body,
    },
  })
}

/**
 * Generates a text-to-transcript card with the provided title and transcript.
 * @param title The title of the card.
 * @param transcript The transcript text to display on the card.
 * @returns An Adaptive Card with the title and transcript.
 */
export const textToTranscriptCard = (title: string, transcripts: string[]) => {
  return new ACData.Template(createTextToTranscriptCard(transcripts)).expand({
    $root: {
      title: title,
    },
  })
}

/**
 * Generates a transcript-to-audio card with the provided message and audio file path.
 * @param message The message to display on the card.
 * @param audioFilePath The file path of the generated audio.
 * @returns An Adaptive Card with the message and audio file path.
 */
export const transcriptToAudioCard = (message: string, audioFilePath: string) => {
  return new ACData.Template(transcriptToAudioCardJson).expand({
    $root: {
      message: message,
      audioFilePath: audioFilePath,
    },
  })
}

// ============ FILE CONSENT CARD FUNCTIONS ============

/**
 * Creates a file consent card for uploading audio files to Teams.
 * This is a special Teams card type that requests user permission before file upload.
 * @param fileName - Name of the file to be uploaded
 * @param description - Description of the file
 * @param fileSize - Size of the file in bytes
 * @returns Teams file consent card attachment
 */
export const createFileConsentCard = (
  fileId: string,
  fileName: string,
  description: string = 'Generated audio file'
) => {
  return {
    contentType: 'application/vnd.microsoft.teams.card.file.consent',
    name: fileName,
    content: {
      description: description,
      acceptContext: {
        fileId: fileId,
        fileName: fileName,
        timestamp: new Date().toISOString(),
      },
      declineContext: {
        fileId: fileId,
        fileName: fileName,
        timestamp: new Date().toISOString(),
      },
    },
  }
}

/**
 * Creates a file info attachment for the completed upload.
 * This tells Teams about the uploaded file after successful upload.
 * @param fileName - Name of the uploaded file
 * @param contentUrl - URL where the file can be accessed
 * @param uniqueId - Unique identifier for the file
 * @returns Teams file info attachment
 */
export const createFileInfoAttachment = (fileName: string, contentUrl: string, uniqueId: string) => {
  const cleanFileName = fileName.replace(/[<>:"/\\|?*]/g, '_')
  const fileExtension = path.extname(cleanFileName).substring(1).toLowerCase() || 'mp3'

  return {
    contentType: 'application/vnd.microsoft.teams.card.file.info',
    contentUrl: contentUrl,
    name: cleanFileName,
    content: {
      uniqueId: uniqueId,
      fileType: fileExtension,
    },
  }
}

/**
 * Creates an adaptive card to display after successful file upload.
 * @param fileName - Name of the uploaded file
 * @param message - Success message
 * @returns Adaptive card for successful upload
 */
export const audioFileUploadedCard = (fileName: string, message: string = 'Audio file uploaded successfully!') => {
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: '✅ ' + message,
        weight: 'Bolder',
        size: 'Medium',
        color: 'Good',
      },
      {
        type: 'TextBlock',
        text: `File: ${fileName}`,
        wrap: true,
        spacing: 'Small',
      },
      {
        type: 'TextBlock',
        text: 'The audio file has been uploaded to your Teams account and is now available in the Files tab.',
        wrap: true,
        size: 'Small',
        color: 'Accent',
      },
    ],
  }
}

/**
 * Returns an array of choices for the given configuration name.
 * @param configName - The configuration name object containing key-value pairs.
 * @returns Array of choice objects
 */
const toChoices = (configName: Record<string, string>) => {
  return Object.values(configName).map((v) => ({ title: v, value: v }))
}

/**
 * Creates an adaptive card for episode configuration using EpisodeSchema.
 * Uses Input.ChoiceSet for multiple value options and sets default values from DEFAULT_CONFIG.
 * @param config - The episode configuration object
 * @param extendedConfig - Whether to include extended configuration options
 * @returns Adaptive card for episode configuration
 */
export const episodeConfigCard = (config: EpisodeConfig, extendedConfig: boolean) => {
  return {
    type: SHOW_CARD_ACTION,
    title: 'Advanced',
    verb: 'showConfig',
    style: 'default',
    card: {
      type: 'AdaptiveCard',
      $schema: 'https://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.6',
      body: [
        {
          type: 'TextBlock',
          text: Date.now().toString(),
          isVisible: false,
        },
        {
          type: 'Container',
          style: 'accent',
          bleed: true,
          showBorder: true,
          items: [
            {
              type: 'TextBlock',
              text: 'Settings',
              weight: 'Bolder',
              size: 'Large',
              horizontalAlignment: 'Center',
              spacing: 'Medium',
            },
            {
              type: 'Input.ChoiceSet',
              id: 'kind',
              label: 'Episode Kind',
              isRequired: true,
              value: config.kind || DEFAULT_CONFIG.kind,
              style: 'expanded',
              choices: toChoices(EpisodeKind),
            },
            {
              type: 'Input.ChoiceSet',
              id: 'language',
              label: 'Language',
              isRequired: true,
              value: config.language || DEFAULT_CONFIG.language,
              style: 'expanded',
              choices: toChoices(EpisodeLanguages),
            },
            {
              type: 'Input.ChoiceSet',
              id: 'length',
              label: 'Episode Length',
              isRequired: true,
              value: config.length || DEFAULT_CONFIG.length,
              style: 'expanded',
              choices: toChoices(EpisodeLength),
            },
            {
              type: 'Input.ChoiceSet',
              id: 'voices',
              label: 'Voices (Select two)',
              isMultiSelect: true,
              isRequired: true,
              value: config.voices.join(',') || DEFAULT_CONFIG.voices.join(','),
              style: 'compact',
              choices: toChoices(EpisodeVoices),
            },
            extendedConfig ? extendConfig(config) : null,
          ],
          spacing: 'Medium',
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Save',
          style: 'positive',
          data: {
            action: SAVE_CONFIG_MESSAGE,
          },
        },
      ],
    },
  }
}

/**
 * Creates an adaptive card for displaying all transcripts.
 * @param transcripts - array of transcript strings
 * @returns Adaptive card for text-to-transcript results
 */
const createTextToTranscriptCard = (transcripts: string[]) => {
  return {
    type: 'AdaptiveCard',
    version: '1.5',
    msteams: {
      width: 'Full',
    },
    body: [
      {
        type: 'Container',
        style: 'default',
        bleed: true,
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: '✅',
                    size: 'Large',
                  },
                ],
              },
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: '${title}',
                    weight: 'Bolder',
                    size: 'Medium',
                    color: 'Default',
                    wrap: true,
                  },
                  createTranscriptCarousel(transcripts),
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}

/** * Extends the episode configuration card with additional advanced options.
 * @param config - The episode configuration object
 * @returns Array of additional card items
 */
const extendConfig = (config: EpisodeConfig) => {
  return [
    {
      type: 'Input.ChoiceSet',
      id: 'intro_effect',
      label: 'Intro Style',
      isMultiSelect: false,
      isRequired: false,
      value: config.intro_effect,
      style: 'compact',
      choices: [...toChoices(EpisodeIntro), { title: 'None', value: '' }],
    },
    {
      type: 'Input.ChoiceSet',
      id: 'outro_effect',
      label: 'Outro Style',
      isMultiSelect: false,
      isRequired: false,
      value: config.outro_effect,
      style: 'compact',
      choices: [...toChoices(EpisodeOutro), { title: 'None', value: '' }],
    },
  ]
}

/** Resets the extended episode configuration.
 * @param config - The episode configuration object
 */
const resetExtendedConfig = (config: EpisodeConfig) => {
  if (config.intro_effect) config.intro_effect = null
  if (config.outro_effect) config.outro_effect = null
}

/**
 * Creates a carousel of transcript pages with actions for each transcript.
 * Each page includes truncated and full transcript views with toggle visibility actions,
 * as well as buttons to create a podcast or edit the transcript.
 * @param transcripts - array of transcript strings
 * @returns Carousel card with pages for each transcript
 */
const createTranscriptCarousel = (transcripts: string[]) => {
  const pages = transcripts.map((transcript, index) => ({
    type: 'CarouselPage',
    style: 'accent',
    showBorder: true,
    roundedCorners: true,
    items: [
      {
        type: 'TextBlock',
        id: `truncatedText_${index}`,
        text: transcript,
        wrap: true,
        maxLines: 5,
      },
      {
        type: 'TextBlock',
        id: `fullText_${index}`,
        text: transcript,
        wrap: true,
        isVisible: false,
      },
      {
        type: 'RichTextBlock',
        id: `showMore_${index}`,
        targetWidth: 'AtLeast:Narrow',
        inlines: [
          {
            type: 'TextRun',
            text: 'Show Full Transcript',
            selectAction: {
              type: 'Action.ToggleVisibility',
              targetElements: [`truncatedText_${index}`, `fullText_${index}`, `showMore_${index}`, `showLess_${index}`],
            },
          },
        ],
      },
      {
        type: 'RichTextBlock',
        id: `showLess_${index}`,
        targetWidth: 'AtLeast:Narrow',
        inlines: [
          {
            type: 'TextRun',
            text: 'Show Preview',
            selectAction: {
              type: 'Action.ToggleVisibility',
              targetElements: [`truncatedText_${index}`, `fullText_${index}`, `showMore_${index}`, `showLess_${index}`],
            },
          },
        ],
        isVisible: false,
      },
      {
        type: 'ActionSet',
        actions: [
          {
            type: 'Action.Execute',
            verb: 'transcriptToAudio',
            title: 'Create Podcast',
            style: 'positive',
            data: { index: index },
          },
          {
            type: 'Action.Submit',
            title: 'Edit Transcript',
            id: 'openDialog',
            data: {
              msteams: {
                type: 'task/fetch',
              },
              taskModule: 'openDialog',
              transcript: transcript,
              index: index,
            },
          },
        ],
      },
    ],
  }))

  return {
    type: 'Carousel',
    pages,
  }
}
