const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, material, position } = JSON.parse(event.body);

    const apiKey = process.env.FAL_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Brak klucza FAL_KEY w zmiennych Netlify!' })
      };
    }

    const promptText = `A close up portrait photo of a person smiling with custom ${material} grillz jewelry fitted on their ${position}, high detailed fashion dental photography, 8k resolution`;

    // Wywołanie stabilnego i błyskawicznego modelu FLUX Schnell w fal.ai
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: promptText,
        image_size: "square_hd",
        num_inference_steps: 4
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `FAL API error: ${data.detail || JSON.stringify(data)}` })
      };
    }

    const imageUrl = data.images && data.images[0] ? data.images[0].url : null;

    if (!imageUrl) {
      throw new Error('FAL API nie zwróciło adresu obrazu.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ image: imageUrl })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Wewnętrzny błąd funkcji' })
    };
  }
};
