// AI Analysis utilities for text processing
// This is a mock implementation - in production, you would integrate with actual AI services

export interface AIAnalysis {
  summary: string;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  language: string;
}

export async function analyzeTextWithAI(text: string): Promise<AIAnalysis> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock AI analysis - in production, integrate with OpenAI, Anthropic, or other AI services
  const analysis: AIAnalysis = {
    summary: generateSummary(text),
    keywords: extractKeywords(text),
    sentiment: analyzeSentiment(text),
    language: detectLanguage(text)
  };
  
  return analysis;
}

function generateSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const firstSentences = sentences.slice(0, 3).join('. ');
  
  if (firstSentences.length > 200) {
    return firstSentences.substring(0, 200) + '...';
  }
  
  return firstSentences || 'This document contains structured data or content that requires specialized analysis.';
}

export function extractKeywords(text: string): string[] {
  // Simple keyword extraction - in production, use NLP libraries or AI services
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const stopWords = new Set([
    'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know',
    'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when',
    'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over',
    'such', 'take', 'than', 'them', 'well', 'were', 'what', 'your',
    'about', 'after', 'again', 'before', 'being', 'could', 'every',
    'first', 'found', 'great', 'group', 'large', 'last', 'little',
    'most', 'never', 'only', 'other', 'place', 'right', 'same',
    'should', 'small', 'still', 'those', 'through', 'under', 'where',
    'while', 'work', 'world', 'would', 'years', 'young'
  ]);
  
  const wordCount = new Map<string, number>();
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  });
  
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  // Simple sentiment analysis - in production, use proper sentiment analysis APIs
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'success',
    'successful', 'perfect', 'best', 'awesome', 'brilliant', 'outstanding'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry',
    'sad', 'disappointed', 'frustrated', 'problem', 'issue', 'error',
    'fail', 'failure', 'worst', 'difficult', 'hard', 'impossible'
  ];
  
  const words = text.toLowerCase().split(/\W+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function detectLanguage(text: string): string {
  // Simple language detection - in production, use proper language detection APIs
  const commonEnglishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
  const commonSpanishWords = ['que', 'de', 'no', 'a', 'la', 'el', 'es', 'y', 'en', 'lo', 'un', 'por', 'qué', 'me', 'una', 'te', 'los', 'se', 'con', 'para', 'mi', 'está', 'si', 'bien', 'pero', 'yo', 'eso', 'las', 'sí', 'su', 'tu', 'aquí', 'del', 'al', 'como', 'le', 'más', 'esto', 'ya', 'todo'];
  const commonFrenchWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par', 'grand', 'en', 'une', 'être', 'et', 'en', 'avoir', 'que', 'pour'];
  
  const words = text.toLowerCase().split(/\W+/).slice(0, 100);
  
  let englishScore = 0;
  let spanishScore = 0;
  let frenchScore = 0;
  
  words.forEach(word => {
    if (commonEnglishWords.includes(word)) englishScore++;
    if (commonSpanishWords.includes(word)) spanishScore++;
    if (commonFrenchWords.includes(word)) frenchScore++;
  });
  
  if (englishScore >= spanishScore && englishScore >= frenchScore) return 'English';
  if (spanishScore >= frenchScore) return 'Spanish';
  if (frenchScore > 0) return 'French';
  
  return 'Unknown';
}

export async function summarizeText(text: string): Promise<string> {
  // Mock text summarization - in production, use AI summarization APIs
  await new Promise(resolve => setTimeout(resolve, 1500));
  return generateSummary(text);
}