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

    // Dynamiczna zmiana promptu na podstawie wyboru stylistyki
    let stylePrompt = "";
    if (style === 'open') {
      stylePrompt = `Open-face window grillz style: thick ${material} metallic borders outlining the edges of the teeth, leaving the center of each tooth hollow and exposing the natural white enamel inside. The jewelry acts strictly as a shiny metallic frame around the perimeter of the teeth.`;
    } else {
      stylePrompt = `Solid full-cap grillz style: completely covering the teeth with solid ${material} custom dental molds.`;
    }

    const promptText = `Ultra-detailed macro jewelry photography of custom-fitted hip-hop dental grillz. ${stylePrompt} Meticulously fitted precisely over the teeth strictly inside the masked area. Highly polished mirror metallic reflections, sharp realistic contours separating individual teeth, natural lighting reflecting off the metal, premium custom jewelry look. Keep the lips, skin, facial features, gums, and background 100% untouched and identical to the original image.`;

    // Używamy modelu Flux Dev Inpainting dla zachowania ultra realizmu
    const response = await fetch('https://fal.run/fal-ai/flux/dev/inpainting', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: image,
        mask_url: mask,
        prompt: promptText,
        strength: 0.95, // Bardzo wysoka siła maski, żeby wymusić detale Open Face
        guidance_scale: 8.5,
        num_inference_steps: 28
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
