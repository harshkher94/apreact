require('dotenv').config();
const axios = require('axios');

async function testOpenAI() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  try {
    console.log('Testing OpenAI API...');
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: "Hello, can you hear me?"
      }],
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('OpenAI API Response:', response.data.choices[0].message.content);
    console.log('API test successful!');
  } catch (error) {
    console.error('Error testing OpenAI API:', error.response ? error.response.data : error.message);
  }
}

testOpenAI();