/**
 * AI Classifier Service
 * Categorizes complaints and analyzes urgency based on student text description.
 */

// Local keyword fallback dictionary
const KEYWORDS = {
  categories: {
    plumbing: ['leak', 'pipe', 'water', 'tap', 'flush', 'clogged', 'basin', 'plumbing', 'toilet', 'drain', 'shower', 'sink'],
    electrical: ['light', 'fan', 'switch', 'plug', 'socket', 'power', 'fuse', 'electric', 'ac', 'bulb', 'heater', 'wire', 'generator'],
    housekeeping: ['clean', 'sweep', 'dust', 'dirt', 'garbage', 'trash', 'broom', 'smell', 'mosquito', 'pest', 'cockroach', 'hygiene'],
    internet: ['wifi', 'internet', 'router', 'network', 'lan', 'slow', 'disconnect', 'ping', 'ethernet', 'connection'],
  },
  urgency: {
    high: ['shock', 'short circuit', 'spark', 'flood', 'burst', 'danger', 'emergency', 'immediate', 'injury', 'fire', 'theft'],
    medium: ['broken', 'not working', 'stuck', 'leak', 'clogged', 'power cut', 'no power', 'no internet'],
  }
};

/**
 * Perform rule-based keyword extraction for local fallbacks
 */
const classifyLocally = (title = '', description = '') => {
  const text = `${title.toLowerCase()} ${description.toLowerCase()}`;
  
  // Categorize
  let category = 'other';
  let maxCatMatches = 0;

  Object.entries(KEYWORDS.categories).forEach(([cat, keywords]) => {
    const matches = keywords.filter(kw => text.includes(kw)).length;
    if (matches > maxCatMatches) {
      maxCatMatches = matches;
      category = cat;
    }
  });

  // Urgency
  let urgency = 'low';
  const hasHigh = KEYWORDS.urgency.high.some(kw => text.includes(kw));
  const hasMedium = KEYWORDS.urgency.medium.some(kw => text.includes(kw));

  if (hasHigh) {
    urgency = 'high';
  } else if (hasMedium) {
    urgency = 'medium';
  }

  return { category, urgency, confidence: 0.8, provider: 'local-heuristic' };
};

/**
 * Core analysis function
 */
const analyzeComplaint = async (title, description) => {
  const apiKey = process.env.OPENAI_API_KEY;

  // If mock key or missing key, run local classification
  if (!apiKey || apiKey === 'mock_openai_key' || apiKey.startsWith('your_')) {
    return classifyLocally(title, description);
  }

  try {
    // OpenAI dynamic classification structure (placeholder for actual API call)
    // const { Configuration, OpenAIApi } = require("openai");
    // const openai = new OpenAIApi(new Configuration({ apiKey }));
    // const response = await openai.createChatCompletion({ ... });
    
    // For local system fallback demonstration during initial phases, we output local matches:
    console.log('AI Classifier: Attempting OpenAI API call structure...');
    return classifyLocally(title, description);
  } catch (error) {
    console.error('AI Service Error (falling back to local):', error.message);
    return classifyLocally(title, description);
  }
};

module.exports = { analyzeComplaint };
