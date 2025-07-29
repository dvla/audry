# Audry - AI Coding Agent Instructions

## Project Overview

Audry is a Microsoft Teams bot that converts documents into podcast-style transcripts and audio files using AI. Built with Microsoft Teams AI SDK, it handles file uploads, text extraction, AI-powered transcript generation (via Google Gemini), and text-to-speech conversion (via ElevenLabs).

## Architecture & Core Patterns

### Handler-Based Architecture

- **Command Handlers**: Handle text-based commands (`src/commands/`)
- **Action Handlers**: Handle Adaptive Card button interactions (`src/handlers/`)
- **Message Routing**: Single entry point in `src/index.ts` routes activities to appropriate handlers based on patterns

### Conversation State Management

- **ConversationState**: Stored in `ApplicationTurnState` with document tracking (`src/internal/conversationHandlers.ts`)
- **Storage**: Auto-switches between CosmosDB (production) and MemoryStorage (development) in `src/teamsBot.ts`
- **State Pattern**: Each handler receives an `ActivityContext` with conversation state and proactive messaging capabilities

### Asynchronous Processing Pattern

All long-running operations (AI calls, file processing) use the immediate response + proactive update pattern:

```typescript
async handleActionInvoked(context: ActivityContext) {
  setImmediate(async () => this.generateTranscript(context))
  return processingCard('Generating transcript...')  // Immediate response
}

async generateTranscript({ proactiveSendCard }: ActivityContext) {
  // Long-running work here
  await proactiveSendCard(resultCard)  // Update later
}
```

## Key Development Workflows

### Testing & Quality

```bash
npm run check       # Full CI pipeline: build + lint + prettier + test + audit + outdated
npm test           # Vitest with coverage (excludes lib/ and adaptiveCards/)
```

## Critical Dependencies & Integration Points

### AI Services Configuration

- **Gemini AI**: Text-to-transcript via `@google/genai` (model configurable via `GEMINI_MODEL`)
- **ElevenLabs**: Text-to-speech via `@elevenlabs/elevenlabs-js`
- **Environment**: Use `src/internal/config.ts` pattern for all env vars with defaults

### Adaptive Cards UI Pattern

- **Static Cards**: JSON templates in `src/adaptiveCards/`
- **Dynamic Content**: Use `adaptivecards-templating` with `ACData.Template().expand()`
- **Actions**: Buttons use `Action.Execute` with `verb` property for routing

## Project-Specific Conventions

### Error Handling

- Use `src/internal/logger.ts` for all logging
- Return `warningCard()` for user-facing errors in action handlers
- Async operations always catch and send proactive error cards

### File Organization

- **Handlers**: One class per major workflow (`src/handlers/`)
- **Internal**: Shared utilities and configuration (`src/internal/`)
- **TTS**: AI and audio processing logic (`src/tts/`)
- **Tests**: Co-located `__tests__/` folders

### Configuration Management

- Environment variables use placeholder pattern: `<not_set>` means unset
- All configs centralized in `src/internal/config.ts` with defaults
- Optional variables handled via `checkOptionalVariable()` helper

## Teams Toolkit Integration

### Deployment Environments

- **Local**: `m365agents.local.yml` - Uses local tunnel + memory storage
- **Production**: `m365agents.yml` - Full Azure deployment with Bicep templates

## Infrastructure as Code

- **Main Template**: `infra/azure.bicep` - App Service, Bot Registration, Storage
- **Local Override**: `localinfra/azure.bicep` - Minimal local resources
- **Bot Registration**: Special handling in `infra/botRegistration/azurebot.bicep`

When adding new features, follow the handler pattern: create handler class, implement trigger patterns, register in `src/index.ts`, and add corresponding adaptive cards for UI interactions.
