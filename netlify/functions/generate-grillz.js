const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, mask, material, position } = JSON.parse(event.body);

    if (!image || !mask) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Wymagane jest zdjęcie oraz maska' })
      };
    }

    const apiKey = process.env.CLIPDROP_API_KEY || process.env.BRIA_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Brak klucza CLIPDROP_API_KEY w ustawieniach Netlify' })
      };
    }

    // Czyszczenie i konwersja obrazów z formatu Base64 na bufory binarne
    const imgBase64Pure = image.replace(/^data:image\/\w+;base64,/, '');
    const maskBase64Pure = mask.replace(/^data:image\/\w+;base64,/, '');

    const imgBuffer = Buffer.from(imgBase64Pure, 'base64');
    const maskBuffer = Buffer.from(maskBase64Pure, 'base64');

    // Przygotowanie formularza multipart
    const form = new FormData();
    form.append('image_file', imgBuffer, { filename: 'image.png', contentType: 'image/png' });
    form.append('mask_file', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    
    const promptText = `shiny ${material} grillz jewelry placed perfectly on teeth, ${position} teeth row, realistic 8k dental photography`;
    form.append('prompt', promptText);

    // Wywołanie produkcyjnego endpointu Clipdrop Inpainting
    const response = await fetch('https://clipdrop-api.co/inpainting/v1', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Błąd Clipdrop API (${response.status}): ${errorResponse}` })
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      body: JSON.stringify({ image: `data:image/png;base64,${resultBase64}` })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Wewnętrzny błąd serwera' })
    };
  }
};
