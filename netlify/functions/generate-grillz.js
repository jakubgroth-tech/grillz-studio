exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { image, mask, material, position } = JSON.parse(event.body);

    if (!image || !mask) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Brak zdjęcia lub maski' }) };
    }

    let promptMaterial = "14k polished yellow gold grillz caps";
    if (material && material.toLowerCase().includes("srebro")) {
      promptMaterial = "polished 925 sterling silver grillz caps";
    }

    let promptPosition = "fitted on teeth";
    if (position === "Góra") promptPosition = "fitted strictly on top teeth row";
    if (position === "Dół") promptPosition = "fitted strictly on bottom teeth row";

    const fullPrompt = `${promptMaterial} ${promptPosition}, high polish metal jewelry, perfectly fitted on teeth, realistic reflection`;

    const response = await fetch("https://fal.run/fal-ai/flux/dev/inpainting", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: image,
        mask_url: mask,
        prompt: fullPrompt,
        strength: 0.85,
        guidance_scale: 3.5,
        num_inference_steps: 25
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
