const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, mask, material, position } = JSON.parse(event.body);

    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Brak zdjęcia' })
      };
    }

    const apiKey = process.env.CLIPDROP_API_KEY || process.env.BRIA_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Brak klucza API w zmiennych środowiskowych Netlify' })
      };
    }

    // Zamiana Base64 na bufer
    const imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    
    // Tworzenie FormData dla nowego endpointu Clipdrop / Bria
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image_file', imageBuffer, { filename: 'image.png', contentType: 'image/png' });

    if (mask) {
      const maskBuffer = Buffer.from(mask.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      form.append('mask_file', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    }

    const prompt = `realistic ${material} grillz jewelry on teeth, ${position} jaw, highly detailed, professional photography`;
    form.append('prompt', prompt);

    // Poprawiony uniwersalny endpoint Clipdrop Inpainting / Replace
    const response = await fetch('https://clipdrop-api.co/replace-background/v1', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const errText = await response.text();
      // Jeśli endpoint replace nie zadziała, próba zapasowego endpointu text-to-image/inpainting
      const fallbackResponse = await fetch('https://clipdrop-api.co/cleanup/v1', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          ...form.getHeaders()
        },
        body: form
      });

      if (!fallbackResponse.ok) {
        throw new Error(`API Error (${response.status}): ${errText}`);
      }

      const buffer = await fallbackResponse.buffer();
      const base64Res = buffer.toString('base64');

      return {
        statusCode: 200,
        body: JSON.stringify({ image: `data:image/png;base64,${base64Res}` })
      };
    }

    const buffer = await response.buffer();
    const base64Res = buffer.toString('base64');

    return {
      statusCode: 200,
      body: JSON.stringify({ image: `data:image/png;base64,${base64Res}` })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
