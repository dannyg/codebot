const { loadApiKey } = require('./config');
const axios = require('axios');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const API_KEY = loadApiKey();


const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1-mini';

async function sendMessage(conversation, tools, handleToolCall) {
  try {
    let assistantMessage;

    while (true) {
      let conversationSize = 0;
      // Loop throught he conversation and count the number of letters in each message
      conversation.forEach(message => {
        const messageSize = JSON.stringify(message).length; // Convert the message to a JSON string and measure its length
        conversationSize += messageSize;
      });
      if (conversationSize > 200000) {
        console.log(`Warning - Size of conversation getting large: ${conversationSize} characters`);
        conversation = await summarizeConversation(conversation);
        console.log("Conversation summarized to reduce size.");
      }

      const response = await axios.post(
        API_URL,
        {
          model: MODEL,
          messages: conversation,
          temperature: 0.7,
          tools,
          tool_choice: "auto"
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const message = response.data.choices[0].message;

      // If there are tool calls, handle them
      if (message.tool_calls) {
        conversation.push(message);

        const toolResponses = await Promise.all(
          message.tool_calls.map(async (toolCall) => {
            const result = await handleToolCall(toolCall);
            return {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: result
            };
          })
        );

        conversation.push(...toolResponses);
      } else {
        // No more tool calls — return the assistant's final message
        assistantMessage = message;
        conversation.push(assistantMessage);
        return assistantMessage;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Conversation:', JSON.stringify(conversation, null, 2));
  }
}

async function summariseFile(filepath) {
  try {
    let fileContent;

    // Check if the file is a PDF
    if (filepath.endsWith('.pdf')) {
      console.log(`Processing PDF file: ${filepath}`);
      const pdfBuffer = await fs.readFile(filepath); // Read the PDF file as a buffer
      const pdfData = await pdfParse(pdfBuffer); // Extract text from the PDF
      fileContent = pdfData.text; // Get the text content
    } else {
      console.log(`Processing non-PDF file: ${filepath}`);
      fileContent = await fs.readFile(filepath, 'utf-8'); // Read the file as plain text
    }

    // Prepare the conversation for summarization
    const conversation = [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes files. The files are to understand how to integrate with a third party. The summary will be used by AI agents to write code that correctly conforms to the information found in the files. These may be API specs or functional specs (e.g., to help with mapping).'
      },
      {
        role: 'user',
        content: `Please summarize the key points relevant for an AI Agent implementing integration code from the following file content:\n\n${fileContent}`
      }
    ];

    // Send the conversation to the OpenAI API
    const response = await axios.post(
      API_URL,
      {
        model: MODEL,
        messages: conversation,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract and return the assistant's response
    const summary = response.data.choices[0].message.content;
    return summary;
  } catch (error) {
    console.error(`Error summarizing file: ${filepath}`, error.message);
    throw error;
  }
}

async function summarizeConversation(conversation) {
  try {
    console.log("Summarizing conversation to reduce size...");

    // Prepare the conversation for summarization
    const summarizationPrompt = [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes conversations. Summarize the following conversation while retaining all key points and context necessary for continuing the discussion.'
      },
      {
        role: 'user',
        content: `Please summarize the following conversation:\n\n${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      }
    ];

    // Send the summarization request to the OpenAI API
    const response = await axios.post(
      API_URL,
      {
        model: MODEL,
        messages: summarizationPrompt,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the summary from the response
    const summary = response.data.choices[0].message.content;

    // Replace the conversation with the summary
    return [
      {
        role: 'system',
        content: 'This is a summarized version of the previous conversation to reduce size.'
      },
      {
        role: 'assistant',
        content: summary
      }
    ];
  } catch (error) {
    console.error("Error summarizing conversation:", error.message);
    throw error;
  }
}

module.exports = { sendMessage, summariseFile };
