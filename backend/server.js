const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Replicate = require("replicate");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

app.post('/generate-image', async (req, res) => {
  const { userPrompt } = req.body;
  console.log('Received prompt:', userPrompt);
  
  try {
    // Step 1: OpenAI API call for prompt refinement
    console.log('Calling OpenAI API for prompt refinement...');
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4",
      messages: [{
        role: "system",
        content: `You are a t-shirt design expert. Create a concise prompt (max 500 characters) for generating a photorealistic image of a t-shirt with a design printed on it. Include:
1. T-shirt color and hanging position
2. Design description, emphasizing it's printed on the shirt
3. Background description (simple and clear)
4. Lighting details
Begin with: "Photorealistic t-shirt:"`
      }, {
        role: "user",
        content: `Create a brief description for a t-shirt with this design: ${userPrompt}`
      }],
      max_tokens: 100
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const refinedPrompt = openaiResponse.data.choices[0].message.content;
    console.log('Refined prompt:', refinedPrompt);
    console.log('Refined prompt length:', refinedPrompt.length);

    // Truncate if still too long
    const truncatedPrompt = refinedPrompt.slice(0, 500);

    // Step 2: Call Replicate for image generation
    console.log('Calling Replicate for image generation...');
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: truncatedPrompt,
          negative_prompt: "floating design, separate graphic, digital mockup, flat design, low quality, blurry, distorted, wrinkled t-shirt, cluttered background, t-shirt outline, sketch",
          num_inference_steps: 50,
          guidance_scale: 7.5,
          width: 768,
          height: 1024
        }
      }
    );

    console.log('Image generated successfully');
    res.json({ imageUrl: output[0] });
  } catch (error) {
    console.error('Detailed error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while processing your request.', details: error.message });
  }
});

app.get('/status', (req, res) => {
  res.json({ status: currentStatus });
});

// For Vercel, we need to export the Express app
module.exports = app;

// Only listen if we're running directly (not on Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
