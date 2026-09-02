exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { image, mask, material } = JSON.parse(event.body);

    if (!image || !mask) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Brak zdjęcia lub maski.' }) };
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Brak klucza FAL_KEY w Netlify.' }) };
    }

    const promptText = `Luxury jewelry macro photography, realistic solid ${material} grillz caps fitted precisely inside the painted mask area, high-end metallic mirror reflections, seamless precise fit over human teeth, keeping skin, lips, face, and background 100% identical to the original image.`;

    // Powrót do stabilnego i sprawdzonego endpointu szybkiego inpaintingu
    const response = await fetch('https://fal.run/fal-ai/fast-sdxl/inpainting', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: image,
        mask_url: mask,
        prompt: promptText,
        strength: 0.90
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `FAL Error: ${data.detail || JSON.stringify(data)}` })
      };
    }

    const resultUrl = data.images && data.images[0] ? data.images[0].url : null;
    if (!resultUrl) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Brak obrazu w odpowiedzi FAL.' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ image: resultUrl })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Błąd serwera: ${err.message}` })
    };
  }
};
