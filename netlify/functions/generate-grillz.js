exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { image, mask } = JSON.parse(event.body);

    if (!image || !mask) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Brak zdjęcia lub maski.' }) };
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Brak klucza FAL_KEY w Netlify.' }) };
    }

    const promptText = `Masterpiece macro jewelry photography of custom-fitted 14k solid yellow gold grillz covering both upper and lower teeth. Flawless mirror-polished finish with deep, rich golden reflections, highly detailed individual tooth caps separated by crisp artisan contour lines. 
STRICT ANATOMICAL RULE: The gold grillz must cover exclusively the enamel of the teeth and must NEVER touch, overlap, or cover the pink gums. The margins terminate perfectly at the natural gum line.
PHOTOREALISTIC HARMONY: The gold metal naturally reflects the exact lighting direction, color temperature, skin tones, and ambient brightness of the user's face photo, creating a seamless, organic integration with zero overlay artifacts. Lips, skin, and background remain 100% untouched.`;

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
        strength: 0.86,
        guidance_scale: 8.5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Poprawione formatowanie błędu, żeby nigdy więcej nie pokazało [object Object]
      const errorDetails = data.detail ? (typeof data.detail === 'object' ? JSON.stringify(data.detail) : data.detail) : JSON.stringify(data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `FAL Error: ${errorDetails}` })
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
