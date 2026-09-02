const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, material, position } = JSON.parse(event.body);

    if (!image) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Brak wgranego zdjęcia.' }) };
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Brak klucza FAL_KEY w Netlify.' }) };
    }

    // KROK 1: Hostowanie pliku w tymczasowym CDN fal.ai (konwersja Base64 -> URL)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const uploadRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file_name: 'input.png',
        content_type: 'image/png'
      })
    });

    let imageUrl = image; // Zapasowy URL

    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      const targetUrl = uploadData.upload_url;
      imageUrl = uploadData.file_url;

      // Wsylanie bajtow obrazu pod wbudowany URL
      await fetch(targetUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: buffer
      });
    }

    // KROK 2: Wywołanie stabilnego Inpaintingu z automatycznym maskowaniem zębów
    const materialText = material === 'gold' ? '14k gold' : '925 silver';
    const promptText = `shiny metallic ${materialText} grillz caps fitted perfectly on ${position}, photorealistic dental jewelry`;

    const response = await fetch('https://fal.run/fal-ai/flux/dev/inpainting', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        mask_prompt: "teeth, mouth",
        prompt: promptText,
        strength: 0.85
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const detailMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `FAL API (${response.status}): ${detailMsg}` })
      };
    }

    const resultUrl = data.images && data.images[0] ? data.images[0].url : null;

    if (!resultUrl) {
      throw new Error('API nie wygenerowało obrazu.');
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
