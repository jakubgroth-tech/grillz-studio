exports.handler = async function (event, context) {
  // Zezwalamy tylko na zapytania typu POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, mask, prompt } = JSON.parse(event.body);
    const FAL_KEY = process.env.FAL_KEY;

    if (!FAL_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Brak skonfigurowanego klucza FAL_KEY w Netlify!" })
      };
    }

    // Zapytanie do API Fal.ai (Model FLUX.1 Fill)
    const response = await fetch("https://fal.run/fal-ai/flux-pro/v1.0/fill", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: image,
        mask_url: mask,
        prompt: prompt || "custom photorealistic chrome silver 925 grillz on teeth, organic liquid metal style, 8k jewelry photo",
        guidance_scale: 30,
        num_inference_steps: 28,
        output_format: "jpeg"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Błąd generowania w Fal.ai");
    }

    // Zwracamy wygenerowane zdjęcie
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputUrl: data.images[0].url })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};