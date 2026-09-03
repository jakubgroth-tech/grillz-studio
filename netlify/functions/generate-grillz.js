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
      styleDesc = `Open-face window grillz style: luxury artisan ${materialName} metallic frames outlining exclusively the enamel and edges of the ${position} teeth, leaving the center of each tooth hollow, uncovered, and exposing natural teeth.`;
    } else {
      styleDesc = `Solid full-cap custom grillz style: polished solid ${materialName} dental caps completely encasing the ${position} teeth.`;
    }

    // Dopracowany prompt z mocniejszym naciskiem na naturalne cieniowanie i brak kontaktu z dziąsłami
    const promptText = `High-end macro jewelry photography of custom hip-hop dental grillz. ${styleDesc}
STRICT ANATOMICAL BOUNDARY: The grillz must fit ONLY over the teeth enamel. Absolutely zero metal can touch, overlap, or cover the pink gums. The metal edges must terminate sharply at the natural gum line.
PHOTOREALISTIC BLENDING: The metallic surface must naturally reflect the surrounding ambient light, skin tones, and color temperature of the user's mouth, ensuring seamless organic blending with zero look of a pasted overlay.`;

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
        strength: 0.88, // Idealna siła dla naturalnego wtapiania cieni w usta i zęby
        guidance_scale: 8.0
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
