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

    // TUTAJ WKLEJ SWÓJ DOKŁADNY LINK DO OBRAZKA REFERENCYJNEGO Z GITHUBA:
    const referenceImageUrl = "https://github.com/jakubgroth-tech/grillz-studio/blob/6896c2c3d0e4d03e96afb10ec5378369e6a8fe57/reference-grillz.png";

    const promptText = `Masterpiece macro jewelry photography of custom-fitted 14k solid yellow gold grillz covering both upper and lower teeth, perfectly matching the style, polish, and texture of the reference image. 
STRICT ANATOMICAL RULE: The gold grillz must cover exclusively the enamel of the teeth and must NEVER touch, overlap, or cover the pink gums. The margins terminate precisely at the natural gum line.
PHOTOREALISTIC HARMONY: The gold metal naturally reflects the exact lighting direction, color temperature, skin tones, and ambient brightness of the user's face photo, creating a seamless, organic integration with zero overlay artifacts. Lips, skin, and background remain 100% untouched.`;

    // Wykorzystujemy potężny silnik FLUX z referencją wizualną (Image-to-Image Inpainting)
    const response = await fetch('https://fal.run/fal-ai/flux-kontext-lora/inpaint', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: image,
        mask_url: mask,
        reference_image_url: referenceImageUrl,
        prompt: promptText,
        num_inference_steps: 30,
        guidance_scale: 3.5,
        strength: 0.88
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
