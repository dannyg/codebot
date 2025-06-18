# AI Code Gen

AI Code Gen is a CLI AI coding assistant that leverages OpenAI's API to help developers interactively work with code repositories. It can read, summarize, edit, and generate code by understanding the context of your project and your instructions.

## Features

- Interactive command-line interface to chat with an AI coding assistant
- Supports reading and summarizing files, including PDFs
- File system operations: list, find, read, create, edit files and directories
- Conversation management with automatic summarization of long interactions
- Customizable prompts for different coding tasks or projects
- Extensible toolset to integrate with your local file system

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

## Usage

### Initialize API Key

Set your OpenAI API key:

```bash
aicodegen init
```

### Start Assistant

Start an interactive chat session:

```bash
aicodegen
```

### Use a Named Prompt

Use a predefined prompt to customize the assistant's behavior (you need to have added this in prompts.js):

```bash
aicodegen use <promptName>
```

### Help

Show usage information:

```bash
aicodegen help
```

## Configuration

The OpenAI API key is stored in your home directory under `.aicodegen/config.json`. Use `aicodegen init` to set or update the key.

## Current Constraints

- The assistant currently uses OpenAI's GPT-4.1-mini model exclusively.
- Limited to command-line usage; no GUI or web interface.
- Some file operations assume local file system access and permissions.
- Conversation size is managed by summarization but very large or complex projects may still pose challenges.
- Tool calls and file operations are synchronous blocking calls.
- Command line cannot support multi-line input

## Potential Improvements

- Add support for switching between different OpenAI models and potentially other AI model providers.
- Add docker integration to improve safety and allow arbitrary exceution (e.g. to build and run repos)
- Enhance summarization and context management to better handle very large codebases.
- Add a GUI or web interface for easier interaction.
- Improve error handling and user feedback during interactive sessions.
- Extend toolset with more specialized code analysis and generation functions.

## License

GNU GPL v3.0 License

---


