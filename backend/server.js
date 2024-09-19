const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fal = require('@fal-ai/serverless-client');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FAL_KEY = process.env.FAL_KEY;

fal.config({
  credentials: FAL_KEY,
});

app.post('/generate-image', async (req, res) => {
  const { userPrompt } = req.body;
  console.log('Received prompt:', userPrompt);
  
  try {
    console.log('Calling OpenAI API...');
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are a t-shirt design expert. Refine the user's prompt to create an elegant t-shirt design. The output should be a description for generating a high-quality image of the t-shirt design hanging on a hanger with a clean background. Keep the refined prompt under 1,000 characters."
      }, {
        role: "user",
        content: userPrompt
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

    console.log('Calling Fal AI...');
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: refinedPrompt
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
