import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Sparkles,
  Zap,
  Brain,
  FileCheck,
  Archive,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { convertFileToText } from '../utils/fileConverter';
import { analyzeTextWithAI, summarizeText, extractKeywords } from '../utils/aiAnalysis';

interface ConvertedFile {
  id: string;
  name: string;
  originalType: string;
  textContent: string;
  size: number;
  relativePath: string;
  isFromFolder: boolean;
  aiAnalysis?: {
    summary: string;
    keywords: string[];
    sentiment: string;
    language: string;
  };
  isAnalyzing?: boolean;
}

const FileConverter: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<ConvertedFile | null>(null);
  const [processingFolder, setProcessingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);
    
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files, false);
  }, []);

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setProcessingFolder(true);
    await processFiles(files, true);
    setProcessingFolder(false);
  }, []);

  const processFiles = async (files: File[], isFromFolder: boolean = false) => {
    setIsConverting(true);
    setConversionProgress(0);
    const results: ConvertedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setConversionProgress(((i + 0.5) / files.length) * 100);
        
        const textContent = await convertFileToText(file);
        
        // Extract relative path for folder uploads
        const relativePath = isFromFolder && (file as any).webkitRelativePath 
          ? (file as any).webkitRelativePath 
          : file.name;
        
        const convertedFile: ConvertedFile = {
          id: `${Date.now()}-${i}`,
          name: file.name,
          originalType: file.type || 'unknown',
          textContent,
          size: file.size,
          relativePath,
          isFromFolder,
        };
        
        results.push(convertedFile);
        setConversionProgress(((i + 1) / files.length) * 100);
      } catch (err) {
        setError(`Failed to convert ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setConvertedFiles(prev => [...prev, ...results]);
    setIsConverting(false);
    setConversionProgress(0);
  };

  const analyzeWithAI = async (file: ConvertedFile) => {
    setConvertedFiles(prev => 
      prev.map(f => f.id === file.id ? { ...f, isAnalyzing: true } : f)
    );

    try {
      const analysis = await analyzeTextWithAI(file.textContent);
      setConvertedFiles(prev => 
        prev.map(f => f.id === file.id ? { ...f, aiAnalysis: analysis, isAnalyzing: false } : f)
      );
    } catch (error) {
      setError('AI analysis failed. Please try again.');
      setConvertedFiles(prev => 
        prev.map(f => f.id === file.id ? { ...f, isAnalyzing: false } : f)
      );
    }
  };

  const downloadAsText = (file: ConvertedFile) => {
    const blob = new Blob([file.textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Group files by whether they're from folders or individual uploads
    const folderFiles = convertedFiles.filter(f => f.isFromFolder);
    const individualFiles = convertedFiles.filter(f => !f.isFromFolder);

    // Add individual files to root
    individualFiles.forEach(file => {
      const fileName = `${file.name.replace(/\.[^/.]+$/, '')}.txt`;
      zip.file(fileName, file.textContent);
      
      if (file.aiAnalysis) {
        const analysisFileName = `${file.name.replace(/\.[^/.]+$/, '')}_analysis.txt`;
        const analysisContent = `
AI Analysis for: ${file.name}
${'='.repeat(50)}

Summary:
${file.aiAnalysis.summary}

Keywords: ${file.aiAnalysis.keywords.join(', ')}
Sentiment: ${file.aiAnalysis.sentiment}
Language: ${file.aiAnalysis.language}
        `.trim();
        zip.file(analysisFileName, analysisContent);
      }
    });

    // Add folder files maintaining structure
    folderFiles.forEach(file => {
      // Replace original extension with .txt while maintaining folder structure
      const pathParts = file.relativePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const folderPath = pathParts.slice(0, -1).join('/');
      const txtFileName = fileName.replace(/\.[^/.]+$/, '') + '.txt';
      const fullPath = folderPath ? `${folderPath}/${txtFileName}` : txtFileName;
      
      zip.file(fullPath, file.textContent);
      
      if (file.aiAnalysis) {
        const analysisFileName = fileName.replace(/\.[^/.]+$/, '') + '_analysis.txt';
        const analysisPath = folderPath ? `${folderPath}/${analysisFileName}` : analysisFileName;
        const analysisContent = `
AI Analysis for: ${file.name}
${'='.repeat(50)}

Summary:
${file.aiAnalysis.summary}

Keywords: ${file.aiAnalysis.keywords.join(', ')}
Sentiment: ${file.aiAnalysis.sentiment}
Language: ${file.aiAnalysis.language}
        `.trim();
        zip.file(analysisPath, analysisContent);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted_files_with_analysis.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFiles = () => {
    setConvertedFiles([]);
    setError(null);
    setSelectedFile(null);
  };

  const removeFile = (fileId: string) => {
    setConvertedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <FileText className="relative w-20 h-20 mx-auto mb-6 text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-600" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              AI-Powered File Converter
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Convert any file to text with lightning speed and get AI-powered insights
            </p>
            <div className="flex justify-center space-x-6 mt-6">
              <div className="flex items-center space-x-2 text-violet-600">
                <Zap className="w-5 h-5" />
                <span className="font-medium">Ultra Fast</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-600">
                <Brain className="w-5 h-5" />
                <span className="font-medium">AI Analysis</span>
              </div>
              <div className="flex items-center space-x-2 text-cyan-600">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Smart Extraction</span>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 transform ${
              isDragOver
                ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-blue-50 scale-105 shadow-2xl'
                : 'border-gray-300 hover:border-violet-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-violet-50 hover:scale-102 hover:shadow-xl'
            } ${isConverting || processingFolder ? 'pointer-events-none' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isConverting || processingFolder}
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              multiple
              onChange={handleFolderSelect}
              className="hidden"
              disabled={isConverting || processingFolder}
            />
            
            {isConverting || processingFolder ? (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-violet-600 animate-spin mb-6" />
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full blur-lg opacity-30 animate-pulse"></div>
                </div>
                <p className="text-2xl font-bold text-gray-700 mb-2">
                  {processingFolder ? 'Processing folder...' : 'Converting files...'}
                </p>
                <div className="w-64 bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-violet-600 to-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${conversionProgress}%` }}
                  ></div>
                </div>
                <p className="text-gray-500">{Math.round(conversionProgress)}% complete</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <Upload className="w-16 h-16 text-violet-600" />
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="w-6 h-6 text-blue-500 animate-bounce" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-700 mb-3">
                  Drop files here or click to browse
                </p>
                <p className="text-gray-500 text-lg mb-6">
                  Supports 100+ file formats with AI-powered analysis
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    Choose Files
                  </button>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    Choose Folder
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center shadow-sm">
              <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
              <span className="text-red-700 font-medium">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Results */}
          {convertedFiles.length > 0 && (
            <div className="mt-12">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  Converted Files ({convertedFiles.length})
                </h2>
                <div className="flex space-x-3">
                  <button
                    onClick={downloadAllAsZip}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 shadow-lg transform hover:scale-105"
                  >
                    <Archive className="w-5 h-5" />
                    <span>Download All as ZIP</span>
                  </button>
                  <button
                    onClick={clearFiles}
                    className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center space-x-2 shadow-lg transform hover:scale-105"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-6">
                {convertedFiles.map((file) => (
                  <div key={file.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                          <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-20"></div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{file.name}</h3>
                          <p className="text-gray-500">
                            {file.originalType || 'Unknown type'} • {formatFileSize(file.size)}
                            {file.isFromFolder && (
                              <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs">
                                📁 {file.relativePath}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => analyzeWithAI(file)}
                          disabled={file.isAnalyzing || !!file.aiAnalysis}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                        >
                          {file.isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : file.aiAnalysis ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Brain className="w-4 h-4" />
                          )}
                          <span>
                            {file.isAnalyzing ? 'Analyzing...' : file.aiAnalysis ? 'Analyzed' : 'AI Analysis'}
                          </span>
                        </button>
                        <button
                          onClick={() => setSelectedFile(file)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => downloadAsText(file)}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* AI Analysis Results */}
                    {file.aiAnalysis && (
                      <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                        <h4 className="text-lg font-bold text-purple-800 mb-4 flex items-center">
                          <Sparkles className="w-5 h-5 mr-2" />
                          AI Analysis Results
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold text-purple-700 mb-2">Summary:</p>
                            <p className="text-gray-700 text-sm">{file.aiAnalysis.summary}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-purple-700 mb-2">Keywords:</p>
                            <div className="flex flex-wrap gap-2">
                              {file.aiAnalysis.keywords.map((keyword, idx) => (
                                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-purple-700 mb-2">Sentiment:</p>
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              file.aiAnalysis.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                              file.aiAnalysis.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {file.aiAnalysis.sentiment}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-purple-700 mb-2">Language:</p>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {file.aiAnalysis.language}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 rounded-xl p-6 max-h-64 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {file.textContent.slice(0, 1000)}
                        {file.textContent.length > 1000 && '...'}
                      </pre>
                    </div>
                    
                    {file.textContent.length > 1000 && (
                      <p className="text-sm text-gray-500 mt-3 flex items-center">
                        <FileCheck className="w-4 h-4 mr-2" />
                        Showing first 1000 characters of {file.textContent.length} total
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Preview Modal */}
          {selectedFile && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-gray-800">{selectedFile.name}</h3>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {selectedFile.textContent}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Supported Formats */}
          <div className="mt-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent mb-6 text-center">
              Supported File Formats & AI Features
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                <FileText className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <h4 className="font-bold text-blue-800 mb-2">Documents</h4>
                <p className="text-sm text-blue-600">DOCX, PDF, RTF, ODT</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <FileCheck className="w-8 h-8 mx-auto mb-3 text-green-600" />
                <h4 className="font-bold text-green-800 mb-2">Spreadsheets</h4>
                <p className="text-sm text-green-600">XLSX, XLS, CSV, ODS</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                <Brain className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                <h4 className="font-bold text-purple-800 mb-2">AI Analysis</h4>
                <p className="text-sm text-purple-600">Summary, Keywords, Sentiment</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-orange-600" />
                <h4 className="font-bold text-orange-800 mb-2">Smart OCR</h4>
                <p className="text-sm text-orange-600">Images, PDFs, Scanned docs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileConverter;