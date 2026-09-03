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

    // Precyzyjne zdefiniowanie stylu jubilerskiego dla AI (Full Caps vs Open-Face Window Grillz)
    let stylePrompt = "";
    if (style === 'open') {
      stylePrompt = `Open-face window grillz style: luxurious custom-fitted ${material} metallic frames, borders, and outlines wrapping tightly around the perimeter and edges of each tooth, leaving the center of each tooth hollow, uncovered, and exposing the natural white enamel inside. The jewelry is a shiny, precision-crafted metal skeleton outlining individual teeth.`;
    } else {
      stylePrompt = `Solid full-cap grillz style: solid ${material} custom dental caps seamlessly covering every tooth completely with mirror polish.`;
    }

    const promptText = `Masterpiece macro jewelry photography of custom-fitted hip-hop dental grillz. ${stylePrompt} Meticulously snapped and fitted strictly over the teeth inside the masked area. The metal must rigorously follow the 3D anatomical contours, ridges, and individual separation lines of each tooth. Highly polished mirror reflections, specular highlights, and ambient shadows that perfectly match the exact lighting direction, color temperature, and brightness of the original user's face. Keep lips, skin, gums, facial features, and background 100% untouched and identical.`;

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
