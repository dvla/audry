# Project Overview
Audry is a Microsoft Teams bot that converts documents into podcast-style transcripts and audio files using AI. Built with Microsoft Teams AI SDK, it handles file uploads, text extraction, AI-powered transcript generation (via Google Gemini), and text-to-speech conversion (via Google, Azure or ElevenLabs).

There are 3 ways to run this project:

1. [**Teams Bot**](#get-started-with-the-teams-bot): Runs the project as a Teams bot using the Microsoft 365 Agents Toolkit (requires setup).
2. [**Local API Server**](#quick-start-api-only): Runs the project as a rest API server using Hono.
3. [**Langgraph API**](#langgraph-ai-agent): Uses Langgraph and Langsmith studio to visualise the graph element of the project.

## Prerequisites
- [Node.js](https://nodejs.org/), supported versions: 24.12.0
- [pnpm](https://pnpm.io/) use ```npm install -g pnpm@latest-10```
- For Teams integration use [Microsoft 365 Agents Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Microsoft 365 Agents Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)

## Quick Start (API only)

To get started quickly, you can use the following steps:

1. Clone the repository

2. Install dependencies and build the project:
   ```bash
   pnpm install
   pnpm build
   ```

3. Start the local **API server**:
   ```bash
   pnpm api
   ```

4. Set up the Gemini API key in `/env/.env.local` to enable AI-powered transcript generation:
    ```bash
     GEMINI_API_KEY="your_gemini_api_key"
     GEMINI_MODEL="gemini-2.5-flash" # Or any latest available model
    ```

5. Open your browser and navigate to `http://localhost:3000` or `http://localhost:3000/start.html`.

## Get Started with the Teams bot

### Deploying with Azure AI Bot Service

To deploy the bot using Azure AI Bot Service with client secrets, follow these steps:

1. **Provision Resources**:
   - Follow the instructions in the [Azure Bot Service documentation](https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/azure-bot-create-single-secret) to create and configure an Azure Bot resource.

2. **Create Secrets**:
   - Refer to the same documentation to generate a client secret and retrieve the Application (client) ID and Directory (tenant) ID.

3. **Set Environment Variables**:
   - Add the following variables to your `env/.env.local` file:
     ```bash
     BOT_ID="your_client_id"
     TEAMS_APP_TENANT_ID="your_tenant_id"
     SECRET_BOT_PASSWORD="your_client_secret"
     ```

4. **Run the Bot**:
   - Select the Microsoft 365 Agents Toolkit icon on the left in the VS Code toolbar.
   - Press F5 to start debugging, and choose `Debug in Teams` when prompted.
   - The Teams app will launch in your browser or in the Teams desktop app. You can then interact with the bot by sending messages.

## Project overview

| Folder / File | Contents |
| - | - |
| `m365agents.yml` | Main project file describes your application configuration and defines the set of actions to run in each lifecycle stages |
| `m365agents.local.yml`| This overrides `m365agents.yml` with actions that enable local execution and debugging |
| `env/`| Name / value pairs are stored in environment files and used by `m365agents.yml` to customize the provisioning and deployment rules |
| `.vscode/` | VSCode files for debugging |
| `appPackage/` | Config for the application manifest |
| `infra/` | Bicep templates for provisioning Azure resources |
| `src/` | The source code for the application |

### Handler-Based Architecture

- **Action Handlers**: Handle Adaptive Card button interactions (`src/handlers/`)
- **Message Routing**: Single entry point in `src/index.ts` routes activities to appropriate handlers based on patterns.

## Langgraph AI Agent
Audry uses Langgraph to create AI agents that process the transcript and generates show notes.

To view the graph use `pnpm graph` which will generate a visual representation of the agent's workflow.

- Show Notes - Defined in `src/agents/show-notes/graph.ts`. It includes steps for summarizing the transcript, extracting key points, and generating a title and short summary.
- Transcript Review - Defined in `src/agents/transcript-review/graph.ts`. It includes steps for reviewing the transcript, providing feedback, and re-drafting a new edition.

## Languages

Cuurently Audry supports English and Welsh in the episodeConfig.ts. To add new languages you must update the EpisodeLanguages enum and the LANGUAGE_CONFIG.

```
/**
 * Supported languages for episodes.
 */
export enum EpisodeLanguages {
  ENGLISH = 'English',
  WELSH = 'Welsh',
  SPANISH = 'Spanish' //Spanish Added
}

/**
 * Configuration mapping for each supported language.
 */
export const LANGUAGE_CONFIG = {
  [EpisodeLanguages.ENGLISH]: {
    code: 'en-GB',
    shortCode: 'en',
    name: EpisodeLanguages.ENGLISH,
  },
  [EpisodeLanguages.WELSH]: {
    code: 'cy-GB',
    shortCode: 'cy',
    name: EpisodeLanguages.WELSH,
  },
  // Added Spanish Config
  [EpisodeLanguages.SPANISH]: {
    code: 'es-ES',
    shortCode: 'es,
    name: EpisodeLanguages.SPANISH,
  },
}
```

## Text-to-Speech Providers
Audry supports multiple text-to-speech providers.  With MS Teams setup, a feature flag is used (see [infrastructure code](#infrastructure-code)). 

You can configure the provider locally in the `/env/.env.local` file using the `TTS_MODEL_OVERRIDE` variable.

**Google TTS is the default**, you don't need to set any additional variables for it, but you could override the model like this:

```bash
TTS_MODEL_OVERRIDE='{"provider": "google", "model": "gemini-2.5-pro-preview-tts"}'
```

For ElevenLabs TTS, set the following environment variable:

```bash
ELEVEN_LABS_API_KEY="your_elevenlabs_api_key"
TTS_MODEL_OVERRIDE='{"provider": "elevenlabs", "model": "eleven_v3"}'
```

For Azure TTS, set the following environment variables:

```bash
AZURE_SPEECH_SERVICE_ENDPOINT=https://your_endpoint.cognitive.microsoft.com/
AZURE_SPEECH_KEY="your_azure_speech_key"
TTS_MODEL_OVERRIDE='{"provider": "azure", "model": "not_used"}'
```

## Infrastructure Code

The infrastructure code for provisioning Azure resources is located in the `/infra` folder. This folder contains templates and scripts to set up the necessary cloud resources for the application.

## License
The MIT License (MIT)

Copyright (c) 2026 DVLA

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
