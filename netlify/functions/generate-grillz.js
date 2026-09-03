exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { image, mask, material, style } = JSON.parse(event.body);

    if (!image || !mask) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Brak zdjęcia lub maski.' }) };
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Brak klucza FAL_KEY w Netlify.' }) };
    }

    // Zaawansowane instrukcje dla stylu "Ramki" (Open Face) vs "Pełne"
    let stylePrompt = "";
    if (style === 'open') {
      stylePrompt = `Open-face window grillz style: luxurious custom-fitted ${material} metallic borders and frames outlining exclusively the perimeter, edges, and gaps of the teeth, leaving the front center of each tooth completely hollow, uncovered, and exposing the natural white enamel inside. The jewelry acts precisely as a shiny metallic outer frame.`;
    } else {
      stylePrompt = `Solid full-cap grillz style: completely and seamlessly covering the teeth with solid ${material} custom dental molds and caps.`;
    }

    const promptText = `Ultra-detailed macro jewelry photography of custom hip-hop dental grillz. ${stylePrompt} Meticulously snapped and fitted strictly over the teeth inside the masked area. Highly polished mirror metallic reflections, sharp realistic contours separating individual teeth caps, professional studio lighting reflecting off the metal. Keep lips, skin, facial features, and background 100% untouched and identical to the original image.`;

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
        strength: 0.94
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
