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
 * Helper to clean markdown code blocks and parse raw JSON
 */
const cleanAndParseJSON = (text) => {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    return JSON.parse(cleaned.trim());
  } catch (err) {
    throw new Error('Failed to parse AI output as JSON: ' + err.message);
  }
};

/**
 * Core analysis function supporting OpenAI, Claude, and local fallbacks
 */
const analyzeComplaint = async (title, description, attachments = []) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  const claudeKey = process.env.CLAUDE_API_KEY;

  const hasOpenAI = openaiKey && openaiKey !== 'mock_openai_key' && !openaiKey.startsWith('your_');
  const hasClaude = claudeKey && claudeKey !== 'mock_claude_key' && !claudeKey.startsWith('your_');

  // If no API keys, run local classification
  if (!hasOpenAI && !hasClaude) {
    return classifyLocally(title, description);
  }

  // Format attachment info for the AI context
  const attachmentsInfo = attachments && attachments.length > 0
    ? attachments.map(a => `Filename: ${a.filename}, Type: ${a.contentType}, URL: ${a.url}`).join('; ')
    : 'None';

  const systemPrompt = `You are an assistant categorizing campus hostel complaints. Analyze the complaint title, description, and optional attachment metadata, and return a structured JSON response. 
  
Allowed values (MUST be exact lowercase strings):
- category: ONLY choose from ['plumbing', 'electrical', 'housekeeping', 'internet', 'other']
- urgency: ONLY choose from ['low', 'medium', 'high']

Response JSON format:
{
  "category": "plumbing" | "electrical" | "housekeeping" | "internet" | "other",
  "urgency": "low" | "medium" | "high",
  "summary": "A 1-sentence summary of the issue",
  "suggestedDepartment": "Name of the maintenance crew (e.g. Electrical Services, Plumbing Squad, Cleaning Crew, IT Support, General Caretaker)",
  "confidence": 0.95
}
Return ONLY the raw JSON object. Do not include markdown wraps.`;

  const userPrompt = `Complaint Details:
Title: ${title}
Description: ${description}
Attachments: ${attachmentsInfo}`;

  // 1. Try OpenAI
  if (hasOpenAI) {
    console.log('AI Classifier: Querying OpenAI API...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const contentText = data.choices[0].message.content;
      const result = cleanAndParseJSON(contentText);

      const validCategories = ['plumbing', 'electrical', 'housekeeping', 'internet', 'other'];
      const validUrgencies = ['low', 'medium', 'high'];
      if (validCategories.includes(result.category) && validUrgencies.includes(result.urgency)) {
        return {
          category: result.category,
          urgency: result.urgency,
          summary: result.summary || title,
          suggestedDepartment: result.suggestedDepartment || 'General Caretaker',
          confidence: result.confidence || 0.9,
          provider: 'openai'
        };
      }
      throw new Error('AI output enum values are invalid');
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('AI Classifier: OpenAI request failed (falling back):', error.message);
    }
  }

  // 2. Try Claude
  if (hasClaude) {
    console.log('AI Classifier: Querying Claude API...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Claude HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const contentText = data.content[0].text;
      const result = cleanAndParseJSON(contentText);

      const validCategories = ['plumbing', 'electrical', 'housekeeping', 'internet', 'other'];
      const validUrgencies = ['low', 'medium', 'high'];
      if (validCategories.includes(result.category) && validUrgencies.includes(result.urgency)) {
        return {
          category: result.category,
          urgency: result.urgency,
          summary: result.summary || title,
          suggestedDepartment: result.suggestedDepartment || 'General Caretaker',
          confidence: result.confidence || 0.9,
          provider: 'claude'
        };
      }
      throw new Error('AI output enum values are invalid');
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('AI Classifier: Claude request failed (falling back):', error.message);
    }
  }

  // 3. Fallback to local
  console.log('AI Classifier: Utilizing local heuristic fallback classifier...');
  return {
    ...classifyLocally(title, description),
    summary: title,
    suggestedDepartment: 'General Caretaker'
  };
};

module.exports = { analyzeComplaint };
