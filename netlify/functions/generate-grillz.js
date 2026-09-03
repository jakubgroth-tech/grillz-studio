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

    // Zaawansowany żargon jubilerski dopasowany do najwyższej jakości prac (Youth Grillz Paris style)
    let stylePrompt = "";
    if (style === 'open') {
      stylePrompt = `Open-face window grillz style: custom-fitted luxury ${material} metallic frames and outlines wrapping precisely around the perimeter and edges of each individual tooth, leaving the center hollow and exposing the natural white enamel. Clean, sharp artisan metal skeleton structure.`;
    } else {
      stylePrompt = `Solid full-cap custom grillz style: seamless, mirror-polished solid ${material} dental caps perfectly encasing every tooth.`;
    }

    const promptText = `High-end professional macro jewelry photography of custom hip-hop dental grillz. ${stylePrompt} Fitted meticulously over the teeth within the masked region. The metal must accurately match the 3D anatomical curves, gaps, and separation lines of the real teeth. High-gloss mirror reflections, specular glints, and ambient occlusion shadows that precisely match the ambient lighting direction, color temperature, and intensity of the user's original photo. Lips, skin, gums, facial features, and background must remain 100% untouched and identical.`;

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
