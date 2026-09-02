const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, material, position } = JSON.parse(event.body);

    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Brak wgranego zdjęcia.' })
      };
    }

    const apiKey = process.env.FAL_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Brak klucza FAL_KEY w konfiguracji Netlify.' })
      };
    }

    // Określenie wybranego wykończenia
    const materialPrompt = material === 'gold' ? '14k shiny gold' : '925 polished silver';
    
    // Budowa precyzyjnego promptu dla zębów
    const promptText = `custom ${materialPrompt} grillz jewelry cap on ${position}, photorealistic metallic texture, high detailed dental jewelry fit`;

    // Wywołanie modelu Inpainting z automatycznym maskowaniem na fal.ai
    const response = await fetch('https://fal.run/fal-ai/flux-general/inpainting', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: image,
        mask_prompt: "teeth, mouth, smile", // Model sam automatycznie wykrywa zęby i wycina z nich maskę
        prompt: promptText,
        strength: 0.85,
        guidance_scale: 7.5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Błąd FAL API (${response.status}): ${data.detail || JSON.stringify(data)}` })
      };
    }

    const resultUrl = data.images && data.images[0] ? data.images[0].url : null;

    if (!resultUrl) {
      throw new Error('API nie zwróciło przetworzonego obrazu.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ image: resultUrl })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Błąd serwera' })
    };
  }
};
