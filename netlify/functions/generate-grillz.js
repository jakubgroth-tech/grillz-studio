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
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Brak zdjęcia lub maski.' }) };
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Brak klucza FAL_KEY w Netlify.' }) };
    }

    const materialName = material === 'gold' ? '14k solid yellow gold' : '925 sterling silver';
    
    let styleDesc = '';
    if (style === 'open') {
      styleDesc = `Open-face window grillz style: luxurious artisan ${materialName} metallic frames outlining exclusively the perimeter and edges of the ${position} teeth, leaving the front center of each tooth completely hollow, uncovered, and exposing the natural white enamel inside.`;
    } else {
      styleDesc = `Solid full-cap custom grillz style: polished solid ${materialName} dental caps completely encasing the ${position} teeth.`;
    }

    // Ekstremalnie rygorystyczny prompt dbający o anatomiczne granice i fotorealistyczne dopasowanie oświetlenia
    const promptText = `Masterpiece macro jewelry photography of custom hip-hop dental grillz. ${styleDesc} 
CRITICAL ANATOMICAL RULE: The metal grillz must cover ONLY the teeth enamel and must NEVER overlap, touch, or cover the pink gums (gingiva). The top/bottom margin must stop precisely at the gum-tooth line (gingival margin). 
The 3D metal must rigorously follow the individual contours, ridges, and separation gaps of each tooth. 
COLOR & LIGHTING HARMONY: The metal must accurately inherit the exact color temperature, ambient light direction, shadows, brightness, and specular highlights of the original user's face photo, blending seamlessly so it looks completely natural and organic, not pasted. Keep lips, skin, gums, facial features, and background 100% untouched.`;

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
        strength: 0.90,
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
