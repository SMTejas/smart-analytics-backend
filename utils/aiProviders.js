/**
 * AI Provider Abstraction Layer
 * Supports multiple AI providers with automatic fallback
 */

/**
 * Call Hugging Face Inference API
 * Free tier available at: https://huggingface.co/inference-api
 */
const callHuggingFace = async (prompt, systemPrompt) => {
    const apiKey = process.env.HUGGINGFACE_API_KEY || '';
    // Use proper text generation models (not classification models like BART-MNLI)
    const modelOptions = [
      process.env.HUGGINGFACE_MODEL, // User specified model
      'gpt2',                          // Simple, always available text generation
      'distilgpt2',                    // Smaller GPT-2 variant
      'microsoft/DialoGPT-small',      // Chat model
      'google/flan-t5-large',          // Instruction-following model
    ].filter(Boolean);
  
    // Default to GPT-2 (simple, reliable, always available)
    const defaultModel = 'gpt2';
    const model = modelOptions[0] || defaultModel;
  
    if (!apiKey) {
      throw new Error(
        'Hugging Face API key is not configured. Please set HUGGINGFACE_API_KEY in your environment variables.'
      );
    }
  
    // Combine system + user prompt for generative models
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\nUser Question: ${prompt}\n\nAssistant Response:`
      : prompt;
  
    console.log(`Attempting Hugging Face API with model: ${model}`);
  
    // 👇 Build payload differently depending on model type
    let bodyPayload;
  
    if (model.includes('bart-large-mnli') || model.includes('roberta')) {
      // Zero-shot classification models
      bodyPayload = {
        inputs: prompt,
        parameters: {
          candidate_labels: ['insight', 'issue', 'suggestion', 'other'],
        },
      };
    } else {
      // Text generation or dialogue models
      bodyPayload = {
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false,
        },
      };
    }
  
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      }
    );
  
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || response.statusText;
      const fullError = errorData.error || errorData.message || errorMsg;
  
      if (response.status === 503 && errorData.estimated_time) {
        throw new Error(
          `Hugging Face model "${model}" is loading. Please wait ${Math.ceil(
            errorData.estimated_time
          )} seconds and try again.`
        );
      }
  
      if (response.status === 404) {
        throw new Error(
          `Hugging Face model "${model}" not found (404). The model may not be available on the Inference API. Try setting HUGGINGFACE_MODEL=gpt2 (simple, always works) or check available models at https://huggingface.co/models`
        );
      }
  
      throw new Error(
        `Hugging Face API error: ${response.status} - ${fullError}. Model: ${model}`
      );
    }
  
    const data = await response.json();
  
    // ✅ Handle different response formats cleanly
    if (Array.isArray(data)) {
      if (data[0]?.generated_text) return data[0].generated_text.trim();
      if (data[0]?.label) return `${data[0].label} (${data[0].score.toFixed(2)})`;
      if (typeof data[0] === 'string') return data[0].trim();
    } else if (data.generated_text) {
      return data.generated_text.trim();
    } else if (typeof data === 'string') {
      return data.trim();
    }
  
    throw new Error(
      'Unexpected response format from Hugging Face API: ' +
        JSON.stringify(data).substring(0, 200)
    );
  };
  

/**
 * Get available Gemini models via REST API
 */
const getAvailableGeminiModels = async (apiKey) => {
  try {
    // Try v1 endpoint first
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    // If v1 fails, try v1beta
    if (!response.ok) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (response.ok) {
      const data = await response.json();
      if (data.models) {
        const models = data.models
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
        return models.length > 0 ? models : null;
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('Model list API response:', response.status, errorData);
    }
  } catch (error) {
    console.log('Could not fetch available models:', error.message);
  }
  return null;
};

/**
 * Call Google Gemini API using the official SDK
 * Free tier available with good limits
 */
const callGemini = async (prompt, systemPrompt) => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.');
  }

  // Combine system prompt and user prompt
  const fullPrompt = systemPrompt 
    ? `${systemPrompt}\n\n${prompt}`
    : prompt;

  // First, try to get available models (non-blocking)
  console.log('Checking available Gemini models...');
  let availableModels = null;
  try {
    availableModels = await Promise.race([
      getAvailableGeminiModels(apiKey),
      new Promise(resolve => setTimeout(() => resolve(null), 2000)) // Timeout after 2s
    ]);
  } catch (error) {
    console.log('Model list check failed, will use fallback list');
  }
  
  // Build model list - prioritize user selection, then common names
  let modelOptions = [
    process.env.GEMINI_MODEL,  // User specified
  ].filter(Boolean);

  // Add available models if we got them, otherwise use fallback list
  if (availableModels && availableModels.length > 0) {
    console.log(`✅ Found ${availableModels.length} available models:`, availableModels.slice(0, 5).join(', '));
    // Prioritize flash and pro models
    const priorityModels = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro'];
    for (const priority of priorityModels) {
      if (availableModels.includes(priority) && !modelOptions.includes(priority)) {
        modelOptions.push(priority);
      }
    }
    // Add other available models
    for (const model of availableModels) {
      if (!modelOptions.includes(model) && model.includes('gemini')) {
        modelOptions.push(model);
      }
    }
  } else {
    // Fallback: try common model names in order of likelihood
    console.log('⚠️  Could not fetch model list, trying common model names...');
    console.log('💡 Tip: Make sure your API key is from https://ai.google.dev/ (Google AI Studio) not Google Cloud Console');
    modelOptions.push(
      'gemini-1.5-flash',      // Most commonly available
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',        // Alternative
      'gemini-1.5-pro-latest',
      'gemini-pro',            // Older but stable
      'gemini-1.0-pro'         // Legacy
    );
  }

  let lastError = null;

  // Try each model until one works
  for (const modelName of modelOptions) {
    try {
      console.log(`Attempting Gemini API with model: ${modelName}`);
      
      // Use the official Google Generative AI SDK
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.95,
        }
      });

      // Correct SDK usage - just pass the prompt string
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Gemini API returned empty response');
      }
      
      console.log(`✅ Gemini API succeeded with model: ${modelName}`);
      return text.trim();
      
    } catch (error) {
      console.log(`❌ Gemini model ${modelName} failed: ${error.message}`);
      lastError = error;
      
      // If it's not a model availability error, don't try other models
      if (!error.message.includes('not found') && !error.message.includes('404') && !error.message.includes('NOT_FOUND')) {
        throw error;
      }
      
      // Continue to next model
      continue;
    }
  }

  // If all SDK attempts failed, try REST API directly
  console.log('All Gemini SDK models failed, trying REST API with direct call...');
  
  // Try REST API with the first available model or common fallback
  const restModelOptions = availableModels && availableModels.length > 0 
    ? availableModels.slice(0, 3)
    : ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

  for (const restModel of restModelOptions) {
    try {
      console.log(`Trying REST API with model: ${restModel}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${restModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: fullPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
              topP: 0.95,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || errorData.message || response.statusText;
        if (response.status === 404) {
          console.log(`REST API: Model ${restModel} not found, trying next...`);
          continue;
        }
        throw new Error(`Gemini REST API error: ${response.status} - ${errorMsg}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
        console.log(`✅ Gemini REST API succeeded with model: ${restModel}`);
        return data.candidates[0].content.parts[0].text.trim();
      }
      
    } catch (restError) {
      console.log(`REST API failed for ${restModel}:`, restError.message);
      if (!restError.message.includes('404') && !restError.message.includes('not found')) {
        throw restError;
      }
      continue;
    }
  }

  // Final error with helpful message
  const errorMsg = availableModels && availableModels.length > 0
    ? `Available models: ${availableModels.join(', ')}. None of them worked with your API key.`
    : `Could not determine available models.`;
  
  throw new Error(
    `❌ All Gemini models failed. ${errorMsg}\n` +
    `Last error: ${lastError?.message || 'Unknown error'}\n\n` +
    `🔧 Troubleshooting steps:\n` +
    `1. Get API key from https://ai.google.dev/ (Google AI Studio) - NOT Google Cloud Console\n` +
    `2. Make sure API key starts with "AIza..."\n` +
    `3. Verify API key is active and not revoked\n` +
    `4. Try setting GEMINI_MODEL=gemini-1.5-flash in your .env file\n` +
    `5. Check if Gemini API access is enabled for your account\n\n` +
    `📝 Note: Free-tier API keys from Google AI Studio work differently than Cloud Console keys.`
  );
};

/**
 * Call OpenAI API (existing implementation)
 */
const callOpenAI = async (prompt, systemPrompt) => {
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || ''
  });

  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  
  const messages = [];
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  messages.push({
    role: 'user',
    content: prompt
  });

  const completion = await openai.chat.completions.create({
    model: model,
    messages: messages,
    temperature: 0.7,
    max_tokens: 1000
  });

  return completion.choices[0]?.message?.content || 'Unable to generate insights.';
};

/**
 * Main function to generate AI insights with automatic provider fallback
 */
const generateAIInsights = async (prompt, systemPrompt = 'You are a helpful data analyst assistant. Provide clear, actionable insights from data summaries.') => {
  // Determine which provider to use based on environment variables
  const aiProvider = (process.env.AI_PROVIDER || 'huggingface').toLowerCase();
  
  const providers = {
    'huggingface': callHuggingFace,
    'gemini': callGemini,
    'openai': callOpenAI
  };

  // If specific provider is requested and configured, use it
  if (providers[aiProvider]) {
    try {
      // Check if the provider has required API key
      if (aiProvider === 'huggingface' && !process.env.HUGGINGFACE_API_KEY) {
        throw new Error('Hugging Face API key not configured');
      }
      if (aiProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
      }
      if (aiProvider === 'openai' && !process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      return await providers[aiProvider](prompt, systemPrompt);
    } catch (error) {
      console.error(`Error with ${aiProvider} provider:`, error.message);
      // Fall through to try other providers
    }
  }

  // Fallback chain: Try providers in order of preference
  const fallbackOrder = ['huggingface', 'gemini', 'openai'];
  
  for (const provider of fallbackOrder) {
    // Skip if it was already tried
    if (provider === aiProvider) continue;
    
    try {
      // Check if provider has API key
      if (provider === 'huggingface' && process.env.HUGGINGFACE_API_KEY) {
        console.log('Trying Hugging Face as fallback...');
        return await callHuggingFace(prompt, systemPrompt);
      }
      if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
        console.log('Trying Gemini as fallback...');
        return await callGemini(prompt, systemPrompt);
      }
      if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        console.log('Trying OpenAI as fallback...');
        return await callOpenAI(prompt, systemPrompt);
      }
    } catch (error) {
      console.error(`Error with ${provider} provider (fallback):`, error.message);
      continue;
    }
  }

  // Check if any provider is configured but all failed
  const hasAnyProvider = process.env.HUGGINGFACE_API_KEY || 
                         process.env.GEMINI_API_KEY || 
                         process.env.OPENAI_API_KEY;

  if (hasAnyProvider) {
    throw new Error('All configured AI providers failed. Please check your API keys and try again.');
  }

  throw new Error('No AI provider is configured. Please set at least one of: HUGGINGFACE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY');
};

module.exports = {
  generateAIInsights,
  callHuggingFace,
  callGemini,
  callOpenAI
};
