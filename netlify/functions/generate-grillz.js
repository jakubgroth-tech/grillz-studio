exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { image, mask, material, style, position } = JSON.parse(event.body);

    if (!image || !mask) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Brak zdjęcia lub maski zębów.' }) };
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Brak klucza FAL_KEY w Netlify.' }) };
    }

    const materialName = material === 'gold' ? '14k solid yellow gold' : '925 sterling silver';
    
    let styleDesc = '';
    if (style === 'open') {
      styleDesc = `Open-face window grillz style: luxurious custom-fitted ${materialName} metallic frames and outlines wrapping precisely around the perimeter of each tooth, leaving the center of each tooth hollow and exposing the natural white enamel.`;
    } else {
      styleDesc = `Solid full-cap grillz style: solid ${materialName} custom dental caps completely covering the ${position} teeth with high-gloss mirror polish.`;
    }

    const promptText = `Ultra-detailed macro jewelry photography of custom-fitted hip-hop dental grillz. ${styleDesc} Meticulously snapped and fitted precisely over the teeth inside the masked area. The metal must rigorously follow the 3D anatomical contours, ridges, and individual separation lines of each tooth. High-gloss mirror reflections, specular highlights, and ambient shadows that perfectly match the exact lighting direction, color temperature, and brightness of the original user's face. Keep lips, skin, gums, facial features, and background 100% untouched and identical.`;

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
        strength: 0.92,
        guidance_scale: 8.5
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
