const fs = require('fs');
const path = require('path');
const { summariseFile } = require('./openai');
const extractTextFromFile = require('./extractTextFromFile');

const tools = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the file" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_and_summarise_documentation",
      description: "Read the contents of a file, and summarise it for use in code generation",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the file" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List the files in a directory",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the directory" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_files",
      description: "Find files by name/regex",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to run the find from", default: "." },
          filenameSearch: { type: "string", description: "File name to look for" },
        },
        required: ["filenameSearch"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files_recursive",
      description: "List all files in a directory and its subdirectories, excluding certain paths",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the directory" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Find and replace a string in a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          find: { type: "string" },
          replace: { type: "string" }
        },
        required: ["path", "find", "replace"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_file_regex",
      description: "Find and replace a regex in a file - preferred to edit_file for more complex replacements",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          find: { type: "string", description: "Regex pattern to find" },
          replace: { type: "string" }
        },
        required: ["path", "find", "replace"]
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write text content to a file (creates or overwrites)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description: "Creates a new file with the given content",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path where the file should be created" },
          content: { type: "string", description: "The contents of the new file" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_directory',
      description: 'Create a new directory at the specified path',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path to create' }
        },
        required: ['path']
      }
    }
  }
];

function readFile(filepath) {
  console.log("Reading file: " + filepath);
  try {
      return extractTextFromFile(filepath);
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}

async function readAndSummariseFile(filepath) {
  console.log("Summarising file: " + filepath);
  try {
    const fullPath = path.resolve(filepath);
    return await summariseFile(fullPath); // Use await to handle the async function
  } catch (err) {
    return `Error summarising file: ${err.message}`;
  }
}

function findFiles(dirPath = ".", filenameSearch) {
  console.log("Finding files like " + filenameSearch + " in dir: " + dirPath);
  try {
    const fullPath = path.resolve(dirPath);
    const result = [];

    function searchDirectory(currentPath) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          searchDirectory(entryPath); // Recurse into subdirectory
        } else if (entry.isFile() && entry.name.includes(filenameSearch)) {
          result.push(entryPath);
        }
      }
    }

    searchDirectory(fullPath);
    return result.length
      ? `Matching files:\n` + result.join('\n')
      : `No files found matching "${filenameSearch}"`;
  } catch (err) {
    return `Error finding files: ${err.message}`;
  }
}

function listFiles(dirPath) {
  console.log("Listing dir: " + dirPath);
  try {
    const fullPath = path.resolve(dirPath);
    const files = fs.readdirSync(fullPath);
    return `Files in ${dirPath}:
` + files.join('\n');
  } catch (err) {
    return `Error listing files: ${err.message}`;
  }
}

function listFilesRecursive(dirPath, excludePaths = ['*/bin', '*/lib', '*/obj', '*/node_modules', '*/.git', '*/.svn']) {
  console.log("Listing files recursively in: " + dirPath);
  try {
    const fullPath = path.resolve(dirPath);
    const results = [];

    function walkDirectory(currentPath) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);

        const shouldExclude = excludePaths.some(pattern => {
          const regex = new RegExp(
            pattern
              .replace(/\*\//g, '(?:.*/)?') // Match any directory level (optional)
              .replace(/\*/g, '[^/]*')      // Match anything except directory separators
              .replace(/\./g, '\\.')        // Escape dots
              + '$'                         // Ensure it matches the end of the path
          );
          return regex.test(entryPath);
        });

        if (shouldExclude) {
          continue; // Skip excluded paths
        }

        if (entry.isDirectory()) {
          walkDirectory(entryPath); // Recurse into subdirectory
        } else {
          results.push(entryPath); // Add file to results
        }
      }
    }

    walkDirectory(fullPath);
    return `Files in ${dirPath} (including subdirectories):\n` + results.join('\n');
  } catch (err) {
    return `Error listing files recursively: ${err.message}`;
  }
}

function createDirectory(filepath) {
  console.log("Creating Directory: " + filepath);
  try {
    if (!fs.existsSync(filepath)) {
      fs.mkdirSync(filepath, { recursive: true });
      return `📁 Directory "${filepath}" created successfully.`;
    } else {
      return `⚠️ Directory "${filepath}" already exists.`;
    }
  } catch (err) {
    return `Error creating directory: ${err.message}`;
  }
}

function writeFile(filepath, content) {
  console.log("Writing file: " + filepath);
  try {
    fs.writeFileSync(args.path, args.content, 'utf8');
    return `Wrote to file ${dirPath} with content:\n${content}`;
  } catch (err) {
    return `Error writing to file: ${err.message}`;
  }
}

function editFile(filepath, findStr, replaceStr) {
  console.log("Editing file: " + filepath);
  try {
    const fullPath = path.resolve(filepath);
    let content = fs.readFileSync(fullPath, 'utf8');
    const newContent = content.split(findStr).join(replaceStr);
    fs.writeFileSync(fullPath, newContent);
    return `Replaced all occurrences of "${findStr}" with "${replaceStr}" in ${filepath}`;
  } catch (err) {
    return `Error editing file: ${err.message}`;
  }
}

function editFileRegex(filepath, pattern, replacement) {
  console.log("Editing (regex) file: " + filepath);
  try {
    const fullPath = path.resolve(filepath);
    let content = fs.readFileSync(fullPath, 'utf8');
    const regex = new RegExp(pattern, 'g');
    const newContent = content.replace(regex, replacement);
    fs.writeFileSync(fullPath, newContent);
    return `Replaced all occurrences of "${pattern}" with "${replacement}" in ${filepath}`;
  } catch (err) {
    return `Error editing file: ${err.message}`;
  }
}
function createFile(path, content) {
  console.log("Creating file: " + path);

  try {
    fs.writeFileSync(path, content, 'utf8');
    return `File created: ${path}`;
  } catch (err) {
    return `Error creating file: ${err.message}`;
  }
}

async function handleToolCall(toolCall) {
  const { name, arguments: argsJson } = toolCall.function;
  const args = JSON.parse(argsJson);

  if (name === 'read_file') {
    return readFile(args.path);
  }

  if (name === 'read_and_summarise_documentation') {
    return await readAndSummariseFile(args.path);
  }

  if (name === 'list_files') {
    return listFiles(args.path);
  }

  if (name === 'find_files') {
    return findFiles(args.path, args.filenameSearch);
  }

  if (name === 'list_files_recursive') {
    return listFilesRecursive(args.path); //, args.excludePaths);
  }

  if (name === 'edit_file') {
    return editFile(args.path, args.find, args.replace);
  }

  if (name === 'write_file') {
    return writeFile(args.path, args.content);
  }

  if (name === 'create_directory') {
    return createDirectory(args.path);
  }

  if (name === 'edit_file_regex') {
    return editFileRegex(args.path, args.find, args.replace);
  }

  if (name === 'create_file') {
    return createFile(args.path, args.content);
  }

  return 'Unknown tool.';
}


module.exports = { tools, readFile, readAndSummariseFile, findFiles, listFiles, listFilesRecursive, editFile, editFileRegex, createFile, handleToolCall };
