const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  ignoreDeclaration: true,
  textNodeName: '#text',
  allowBooleanAttributes: true
});

async function extractTextFromFile(filepath) {
  const fullPath = path.resolve(filepath);
  console.log("Reading file:", fullPath);

  try {
    if (fullPath.endsWith('.pdf')) {
      const buffer = fs.readFileSync(fullPath);
      const data = await pdfParse(buffer);
      return data.text;
    }

    if (fullPath.endsWith('.odt')) {
      const zip = new AdmZip(fullPath);
      const contentXml = zip.readAsText('content.xml');
      const json = parser.parse(contentXml);
      return extractTextFromOdtJson(json);
    }

    if (fullPath.endsWith('.docx')) {
      const zip = new AdmZip(fullPath);
      const contentXml = zip.readAsText('word/document.xml');
      const json = parser.parse(contentXml);
      return extractTextFromDocxJson(json);
    }

    if (fullPath.endsWith('.xml')) {
      const xmlText = fs.readFileSync(fullPath, 'utf8');
      const json = parser.parse(xmlText);
      return extractTextFromOdtJson(json);
    }

    // Default: treat as plain text
    return fs.readFileSync(fullPath, 'utf8');

  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}

// --- Helpers ---

function extractTextFromOdtJson(json) {
  const paragraphs = [];
  const textBody = json?.['office:document-content']?.['office:body']?.['office:text'] || json;

  recurseAndCollectText(textBody, paragraphs);
  return paragraphs.join('\n').trim();
}

function extractTextFromDocxJson(json) {
  const paragraphs = [];
  const body = json?.['w:document']?.['w:body'] || json;

  recurseAndCollectText(body, paragraphs);
  return paragraphs.join('\n').trim();
}

function recurseAndCollectText(node, output) {
  if (typeof node === 'string') {
    output.push(node);
  } else if (Array.isArray(node)) {
    node.forEach(child => recurseAndCollectText(child, output));
  } else if (typeof node === 'object') {
    for (const key in node) {
      recurseAndCollectText(node[key], output);
    }
  }
}

module.exports = extractTextFromFile;
