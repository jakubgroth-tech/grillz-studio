
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { image, material, position } = JSON.parse(event.body);

    if (!image) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Brak zdjęcia' }) };
    }

    // Uproszczona logika: tylko Złoto lub Srebro
    let promptMaterial = "14k polished yellow gold custom grillz caps";
    if (material && material.toLowerCase().includes("srebro")) {
      promptMaterial = "925 sterling silver custom grillz caps";
    }

    let promptPosition = "on teeth";
    if (position === "Górny łuk (Top)") promptPosition = "fitted on upper top teeth only";
    if (position === "Dolny łuk (Bottom)") promptPosition = "fitted on lower bottom teeth only";

    const fullPrompt = `photorealistic ${promptMaterial} ${promptPosition}, dental jewelry, perfect fit, professional dental photography, 8k resolution, highly detailed, realistic reflection, preserving original lips and face`;

    // Wywołanie modelu Fal.ai FLUX
    const response = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: image,
        prompt: fullPrompt,
        strength: 0.65,
        guidance_scale: 7.5,
        num_inference_steps: 28
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.detail || data.message || "Błąd API Fal.ai" })
      };
    }

    const generatedImageUrl = data.images && data.images[0] ? data.images[0].url : null;

    if (!generatedImageUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Nie udało się wygenerować obrazu." })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: generatedImageUrl })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
