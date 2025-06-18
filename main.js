#!/usr/bin/env node
const readline = require('readline');
const { initConfig } = require('./config');
const prompts = require('./prompts');

const command = process.argv[2];
const arg = process.argv[3]; // for commands like: aicodegen use lsv3

console.log(`Command: ${command}`);
if (command === 'init') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter your OpenAI API key: ', (key) => {
    initConfig(key.trim());
    rl.close();
  });

  return;
}

const { sendMessage } = require('./openai');
const { tools, handleToolCall } = require('./tools');

if (['-h', '--help', 'help'].includes(command)) {
  console.log(`
  \x1b[1maicodegen\x1b[0m – Your OpenAI-powered coding assistant

  \x1b[1mUsage:\x1b[0m
    aicodegen            Start the interactive assistant
    aicodegen init       Set your OpenAI API key
    aicodegen use <prompt>   Use a named prompt (e.g. lsv3)
    aicodegen help       Show this help message
  `);
  process.exit(0);
}

let selectedPrompt = prompts.default;
let startMessage = 'Chat with Aidan to ask about the current repo (Ctrl+C to quit)';
if (command === 'use') {
  if (!prompts[arg]) {
    console.error(`❌ Unknown prompt "${arg}". Available prompts: ${Object.keys(prompts).join(', ')}`);
    process.exit(1);
  }
  selectedPrompt = prompts[arg];
  if (prompts[arg + '_startMessage']) {
    startMessage = prompts[arg+'_startMessage'];
  }
} else if (command) {
  console.error(`❌ Unknown command "${command}". Try "aicodegen help"`);
  process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[94mYou\x1b[0m: '
});

let conversation = [
    {
        role: 'system',
        content: selectedPrompt.trim()
    }
];


console.log(startMessage);
rl.prompt();

rl.on('line', async (line) => {
    const userInput = line.trim();
    if (userInput) {
        conversation.push({ role: 'user', content: userInput });
        const gptMessage = await sendMessage(conversation, tools, handleToolCall);
        if (gptMessage && gptMessage.content) {
            console.log(`\x1b[93mGPT\x1b[0m: ${gptMessage.content}`);
        } else {
            if (gptMessage) {
                console.log(`\x1b[91mError\x1b[0m: Unexpected response from GPT ${JSON.stringify(gptMessage)}.`);
            } else {
                console.log(`\x1b[91mError\x1b[0m: Empty response from GPT.`);
            }            
        }
        
    }
    rl.prompt();
}).on('close', () => {
    console.log('\nSession ended.');
    process.exit(0);
});
