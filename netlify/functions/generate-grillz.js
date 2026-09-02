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

    // -------------------------------------------------------------
    // ETAP 1: DETEKCJA I SEGMENTACJA ZĘBÓW (SAM2 Model)
    // Awaryjnie wywołujemy model detekcji do wygenerowania czystej maski
    // -------------------------------------------------------------
    const maskResponse = await fetch('https://fal.run/fal-ai/sam2/image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: image,
        prompts: [{ type: "text", text: "teeth mouth" }]
      })
    });

    let maskUrl = null;
    if (maskResponse.ok) {
      const maskData = await maskResponse.json();
      maskUrl = maskData.image_url || (maskData.masks && maskData.masks[0] ? maskData.masks[0].url : null);
    }

    // -------------------------------------------------------------
    // ETAP 2: INPAINTING (Modyfikacja TYLKO zębów na zdjęciu)
    // Jeśli maska z SAM2 nie powstała, wywołujemy wbudowany Inpainting z tekstem detekcji
    // -------------------------------------------------------------
    const materialPrompt = material === 'gold' ? 'shiny polished 14k gold' : 'metallic 925 sterling silver';
    const promptText = `solid ${materialPrompt} grillz caps fitted perfectly over ${position}, realistic metallic sheen, detailed dental jewelry`;

    const inpaintBody = maskUrl ? {
      image_url: image,
      mask_url: maskUrl,
      prompt: promptText,
      strength: 0.9,
      guidance_scale: 7.5
    } : {
      image_url: image,
      mask_prompt: "human teeth, smile, mouth",
      prompt: promptText,
      strength: 0.9,
      guidance_scale: 7.5
    };

    const inpaintResponse = await fetch('https://fal.run/fal-ai/flux/dev/inpainting', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inpaintBody)
    });

    const inpaintData = await inpaintResponse.json();

    if (!inpaintResponse.ok) {
      return {
        statusCode: inpaintResponse.status,
        body: JSON.stringify({ error: `Błąd FAL Inpainting: ${inpaintData.detail || JSON.stringify(inpaintData)}` })
      };
    }

    const finalResultUrl = inpaintData.images && inpaintData.images[0] ? inpaintData.images[0].url : null;

    if (!finalResultUrl) {
      throw new Error('API fal.ai nie zwróciło przetworzonego obrazu.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ image: finalResultUrl })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Błąd serwera' })
    };
  }
};
