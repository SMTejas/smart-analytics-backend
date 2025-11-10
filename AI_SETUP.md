# AI Provider Setup Guide

This project supports multiple AI providers for data analysis. You can use any of the following providers:

## Supported Providers

### 1. **Hugging Face Inference API** (Recommended - Free Tier Available) ⭐
- **Free Tier**: Yes, with generous limits
- **Sign Up**: https://huggingface.co/settings/tokens
- **Get API Key**: 
  1. Go to https://huggingface.co
  2. Sign up or log in
  3. Go to Settings → Access Tokens
  4. Create a new token with "Read" permissions
- **Best Models for Analysis** (Verified Working on Free Tier):
  - `gpt2` (default, recommended - simple, always available, good for text generation)
  - `distilgpt2` (smaller GPT-2 variant, faster)
  - `microsoft/DialoGPT-small` (chat model, good for conversational responses)
  - `google/flan-t5-large` (instruction-following model)
  - ⚠️ Note: Some models like BART-MNLI are classification models, not text generation. Use GPT-2 based models for text generation.

### 2. **Google Gemini API** (Free Tier Available)
- **Free Tier**: Yes, 60 requests per minute
- **Recommended Model**: `gemini-1.5-flash` (fast, widely available, free tier)
- **⚠️ IMPORTANT**: Get API key from **Google AI Studio** (NOT Google Cloud Console)
  - **Correct URL**: https://ai.google.dev/ (or https://makersuite.google.com/app/apikey)
  - **Get API Key**:
    1. Go to https://ai.google.dev/
    2. Click "Get API Key" in the top right
    3. Sign in with your Google account
    4. Click "Create API Key"
    5. Copy your API key (should start with "AIza...")
  - **❌ Do NOT use**: Google Cloud Console API keys (those require different setup and may not work)

### 3. **OpenAI API** (Paid, but flexible)
- **Free Tier**: No (but $5 credit for new users)
- **Sign Up**: https://platform.openai.com/api-keys
- **Get API Key**:
  1. Go to https://platform.openai.com
  2. Sign up and add payment method
  3. Go to API Keys section
  4. Create a new API key

## Configuration

Create or update your `.env` file in the `backend` directory:

```env
# Choose your preferred AI provider (huggingface, gemini, or openai)
AI_PROVIDER=huggingface

# Hugging Face Configuration (Recommended for free tier)
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
HUGGINGFACE_MODEL=gpt2

# Google Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
```

## Quick Start with Hugging Face (Recommended)

1. Sign up at https://huggingface.co
2. Get your API token from https://huggingface.co/settings/tokens
3. Add to `.env`:
   ```env
   AI_PROVIDER=huggingface
   HUGGINGFACE_API_KEY=hf_your_token_here
   HUGGINGFACE_MODEL=gpt2
   ```
4. Restart your server

## How It Works

- The system will automatically use the provider specified in `AI_PROVIDER`
- If that provider fails or isn't configured, it will automatically fall back to other configured providers
- Fallback order: Hugging Face → Gemini → OpenAI

## Provider Comparison

| Feature | Hugging Face | Gemini | OpenAI |
|---------|-------------|--------|--------|
| Free Tier | ✅ Yes | ✅ Yes | ❌ No ($5 credit) |
| Setup Difficulty | Easy | Easy | Easy |
| Response Quality | Excellent | Excellent | Excellent |
| Speed | Good | Fast | Fast |
| Best For | General use, free tier | Fast responses | Production apps |

## Troubleshooting

### "No AI provider is configured"
- Make sure at least one API key is set in your `.env` file
- Restart the server after adding environment variables

### "Quota exceeded" or "Rate limit"
- Switch to a different provider
- Hugging Face free tier is very generous
- Consider upgrading your plan or using multiple providers

### "API key invalid"
- Verify your API key is correct
- Check if you copied the entire key (no extra spaces)
- For Hugging Face, ensure token has "Read" permissions
