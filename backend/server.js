const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fal = require('@fal-ai/serverless-client');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let currentStatus = 'Idle';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FAL_KEY = process.env.FAL_KEY;

fal.config({
  credentials: FAL_KEY,
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
        content: `You are a t-shirt design expert. Your task is to create a prompt for generating a photorealistic image of a t-shirt with a design printed on it. Follow these instructions precisely:

1. The output MUST ALWAYS be a t-shirt mock-up. Never describe the design separately from the t-shirt.
2. The design MUST be clearly printed on the front of the t-shirt, as if it were a real, physical printed t-shirt.
3. Describe how the design looks when printed on the fabric, including any texture or interaction with the t-shirt material.
4. The t-shirt should be hanging on a fancy, elegant hanger.
5. The background should be clean, simple, and clear (preferably white or light-colored).
6. Specify the t-shirt color that best complements the design.
7. Include details about studio-quality lighting to enhance the presentation of the printed design and t-shirt.
8. Emphasize that this is a photo-realistic image of a physical t-shirt with the design printed on it, not a digital mockup or flat design.
9. Begin your description with: "A photorealistic image of a t-shirt hanging on an elegant hanger, featuring a design that is..."

Keep the refined prompt under 1,000 characters.`
      }, {
        role: "user",
        content: `Create a detailed description for generating a photorealistic image of a t-shirt with this design printed on it: ${userPrompt}`
      }],
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const refinedPrompt = openaiResponse.data.choices[0].message.content;
    console.log('Refined prompt:', refinedPrompt);

    // Step 2: Call Fal AI for image generation
    console.log('Calling Fal AI for image generation...');
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: refinedPrompt,
        negative_prompt: "floating design, separate graphic, digital mockup, flat design, low quality, blurry, distorted, wrinkled t-shirt, cluttered background, t-shirt outline, sketch",
        num_inference_steps: 50,
        guidance_scale: 7.5,
        width: 768,
        height: 1024
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log('Image generated successfully');
    res.json({ imageUrl: result.images[0].url });
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
