import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Enhanced file converter with better performance and error handling
export async function convertFileToText(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // Add progress tracking for large files
  if (file.size > 10 * 1024 * 1024) { // 10MB
    console.log(`Processing large file: ${fileName} (${formatFileSize(file.size)})`);
  }

  // Text files
  if (fileType.startsWith('text/') || 
      fileName.endsWith('.txt') || 
      fileName.endsWith('.md') || 
      fileName.endsWith('.csv')) {
    return await readTextFile(file);
  }

  // JSON files
  if (fileType === 'application/json' || fileName.endsWith('.json')) {
    const text = await readTextFile(file);
    try {
      const json = JSON.parse(text);
      return JSON.stringify(json, null, 2);
    } catch {
      return text;
    }
  }

  // XML/HTML files
  if (fileType === 'application/xml' || 
      fileType === 'text/xml' || 
      fileType === 'text/html' ||
      fileName.endsWith('.xml') || 
      fileName.endsWith('.html') ||
      fileName.endsWith('.htm')) {
    return await readTextFile(file);
  }

  // JavaScript/CSS files
  if (fileType === 'application/javascript' ||
      fileType === 'text/javascript' ||
      fileType === 'text/css' ||
      fileName.endsWith('.js') ||
      fileName.endsWith('.css') ||
      fileName.endsWith('.ts') ||
      fileName.endsWith('.tsx') ||
      fileName.endsWith('.jsx')) {
    return await readTextFile(file);
  }

  // Word documents
  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')) {
    return await convertDocxToText(file);
  }

  // Excel files
  if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')) {
    return await convertExcelToText(file);
  }

  // PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await convertPdfToText(file);
  }

  // Image files (OCR)
  if (fileType.startsWith('image/') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.gif') ||
      fileName.endsWith('.bmp')) {
    return await convertImageToText(file);
  }

  // Archive files
  if (fileName.endsWith('.zip') || fileName.endsWith('.jar')) {
    return await convertArchiveToText(file);
  }

  // SVG files
  if (fileType === 'image/svg+xml' || fileName.endsWith('.svg')) {
    return await readTextFile(file);
  }

  // Log files
  if (fileName.endsWith('.log') || fileName.endsWith('.cfg') || fileName.endsWith('.ini')) {
    return await readTextFile(file);
  }

  // Binary files - try to extract metadata
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check if it's a binary file
    let isBinary = false;
    for (let i = 0; i < Math.min(1000, uint8Array.length); i++) {
      if (uint8Array[i] === 0) {
        isBinary = true;
        break;
      }
    }

    if (isBinary) {
      return await extractBinaryFileInfo(file, uint8Array);
    } else {
      // Try reading as text
      return await readTextFile(file);
    }
  } catch (error) {
    throw new Error(`Unsupported file type: ${fileType || 'unknown'}`);
  }
}

async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function convertDocxToText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    throw new Error('Failed to convert DOCX file');
  }
}

async function convertExcelToText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let text = '';
    workbook.SheetNames.forEach(sheetName => {
      text += `Sheet: ${sheetName}\n`;
      text += '=' .repeat(50) + '\n';
      const worksheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      text += csvData + '\n\n';
    });
    
    return text;
  } catch (error) {
    throw new Error('Failed to convert Excel file');
  }
}

async function convertPdfToText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Set up PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url
    ).toString();
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `Page ${pageNum}:\n${pageText}\n\n`;
    }
    
    return fullText.trim();
  } catch (error) {
    throw new Error('Failed to convert PDF file');
  }
}

async function convertImageToText(file: File): Promise<string> {
  try {
    const { data: { text } } = await Tesseract.recognize(file, 'eng', {
      logger: () => {} // Disable logging
    });
    
    if (!text.trim()) {
      return await extractImageMetadata(file);
    }
    
    return `OCR Text Content:\n${text}\n\n${await extractImageMetadata(file)}`;
  } catch (error) {
    return await extractImageMetadata(file);
  }
}

async function extractImageMetadata(file: File): Promise<string> {
  const metadata = [
    `File: ${file.name}`,
    `Type: ${file.type}`,
    `Size: ${formatFileSize(file.size)}`,
    `Last Modified: ${new Date(file.lastModified).toLocaleString()}`
  ];

  // Try to get image dimensions
  try {
    const dimensions = await getImageDimensions(file);
    metadata.push(`Dimensions: ${dimensions.width}x${dimensions.height}px`);
  } catch {
    // Ignore dimension errors
  }

  return `Image Metadata:\n${metadata.join('\n')}`;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  });
}

async function convertArchiveToText(file: File): Promise<string> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    let text = `Archive Contents (${file.name}):\n`;
    text += '=' .repeat(50) + '\n';
    
    const files: string[] = [];
    contents.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        files.push(`${relativePath} (${formatFileSize(zipEntry._data?.uncompressedSize || 0)})`);
      } else {
        files.push(`${relativePath} (directory)`);
      }
    });
    
    text += files.join('\n');
    return text;
  } catch (error) {
    throw new Error('Failed to read archive file');
  }
}

async function extractBinaryFileInfo(file: File, data: Uint8Array): Promise<string> {
  const info = [
    `File: ${file.name}`,
    `Type: ${file.type || 'Binary file'}`,
    `Size: ${formatFileSize(file.size)}`,
    `Last Modified: ${new Date(file.lastModified).toLocaleString()}`,
    '',
    'File Analysis:',
    `- Binary file with ${data.length} bytes`,
    `- First 16 bytes (hex): ${Array.from(data.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`
  ];

  // Try to detect file signature
  const signature = detectFileSignature(data);
  if (signature) {
    info.push(`- Detected format: ${signature}`);
  }

  // Look for embedded strings
  const strings = extractStrings(data);
  if (strings.length > 0) {
    info.push('', 'Embedded Strings:');
    info.push(...strings.slice(0, 20).map(s => `- ${s}`));
    if (strings.length > 20) {
      info.push(`... and ${strings.length - 20} more`);
    }
  }

  return info.join('\n');
}

function detectFileSignature(data: Uint8Array): string | null {
  const signatures: { [key: string]: string } = {
    '89504E47': 'PNG Image',
    'FFD8FFE0': 'JPEG Image',
    '47494638': 'GIF Image',
    '25504446': 'PDF Document',
    '504B0304': 'ZIP Archive',
    '52617221': 'RAR Archive',
    '7F454C46': 'ELF Executable',
    '4D5A9000': 'Windows Executable'
  };

  const hex = Array.from(data.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return signatures[hex] || null;
}

function extractStrings(data: Uint8Array): string[] {
  const strings: string[] = [];
  let currentString = '';
  
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    
    if (char >= 32 && char <= 126) { // Printable ASCII
      currentString += String.fromCharCode(char);
    } else {
      if (currentString.length >= 4) {
        strings.push(currentString);
      }
      currentString = '';
    }
  }
  
  if (currentString.length >= 4) {
    strings.push(currentString);
  }
  
  return strings.filter(s => s.length >= 4).slice(0, 100);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}