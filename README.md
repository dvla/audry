# Project Overview
Audry is a Microsoft Teams bot that converts documents into podcast-style transcripts and audio files using AI. Built with Microsoft Teams AI SDK, it handles file uploads, text extraction, AI-powered transcript generation (via Google Gemini), and text-to-speech conversion (via Google or ElevenLabs).

## Get Started with the Workflow bot

> **Prerequisites**
>
> To run the workflow bot template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 22
> - [Microsoft 365 Agents Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Microsoft 365 Agents Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
>
> **Note**
>
> Your app can be installed into a team, or a group chat, or as personal app. See [Installation and Uninstallation](https://aka.ms/teamsfx-command-response#customize-installation).
> For local debugging using Microsoft 365 Agents Toolkit CLI, you need to do some extra steps described in [Set up your Microsoft 365 Agents Toolkit CLI for local debugging](https://aka.ms/teamsfx-cli-debugging).

1. First, select the Microsoft 365 Agents Toolkit icon on the left in the VS Code toolbar.
2. Press F5 to start debugging which launches your app in Microsoft 365 Agents Playground using a web browser. Select `Debug in Microsoft 365 Agents Playground`.
3. The browser will pop up to open Microsoft 365 Agents Playground.
4. Type or select `helloWorld` in the chat to send it to your bot - this is the default command provided by the template.
5. In the response from the bot, select the **DoStuff** button.

The bot will respond by updating the existing Adaptive Card to show the workflow is now complete! Continue reading to learn more about what's included in the template and how to customize it.

Here is a screen shot of the application running:

![Responds to command](https://github.com/user-attachments/assets/b816fdc8-bf89-46aa-82e2-536d596e3aa2)

When you click the `DoStuff` button, the above adaptive card will be updated to a new card as shown below:

![Responds to card action](https://github.com/user-attachments/assets/d5864111-7f34-4e77-855c-dc506c3fa3fe)

## What's included in the template

| Folder / File | Contents |
| - | - |
| `m365agents.yml` | Main project file describes your application configuration and defines the set of actions to run in each lifecycle stages |
| `m365agents.local.yml`| This overrides `m365agents.yml` with actions that enable local execution and debugging |
| `m365agents.playground.yml`| This overrides `m365agents.yml` with actions that enable local execution and debugging in Microsoft 365 Agents Playground |
| `env/`| Name / value pairs are stored in environment files and used by `m365agents.yml` to customize the provisioning and deployment rules |
| `.vscode/` | VSCode files for debugging |
| `appPackage/` | Templates for the application manifest |
| `infra/` | Templates for provisioning Azure resources |
| `src/` | The source code for the application |

The following files can be customized and demonstrate an example implementation to get you started.

| File | Contents |
| - | - |
| `src/index.ts`| Application entry point and `express` handlers for the Workflow bot |
| `src/teamsBot.ts` | An empty teams activity handler for bot customization |
| `src/commands/helloworldCommandHandler.ts` | Implementation that handles responding to a chat command |
| `src/adaptiveCards/helloworldCommandResponse.json` | Defines the Adaptive Card (UI) that is displayed in response to a chat command |
| `src/adaptiveCards/doStuffActionResponse.json` | A generated Adaptive Card that is sent to Teams for the response of "doStuff" action |
| `src/cardActions/doStuffActionHandler.ts` | Implements the handler for the `doStuff` button displayed in the Adaptive Card |

## Langgraph AI Agent
Audry uses Langgraph to create an AI agent that processes the transcript and generates show notes.
The agent is defined in `src/agents/show-notes/graph.ts`. It includes steps for summarizing the transcript, extracting key points, and generating a title and short summary.
To view the graph use `npm run graph` which will generate a visual representation of the agent's workflow.

## License
The MIT License (MIT)

Copyright (c) 2025 DVLA

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
