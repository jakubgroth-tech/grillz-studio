exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { image, material, position } = JSON.parse(event.body);

    if (!image) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Brak zdjęcia' }) };
    }

    let promptMaterial = "14k polished yellow gold custom grillz caps";
    if (material && material.toLowerCase().includes("srebro")) {
      promptMaterial = "polished 925 sterling silver custom grillz caps";
    }

    let promptPosition = "on teeth";
    if (position === "Górny łuk (Top)") promptPosition = "fitted on upper top teeth only";
    if (position === "Dolny łuk (Bottom)") promptPosition = "fitted on lower bottom teeth only";

    const fullPrompt = `${promptMaterial} ${promptPosition}, dental jewelry, realistic metallic reflections, perfect fit on teeth`;

    // Używamy endpointu inpaintingu zamiast zwykłego image-to-image
    const response = await fetch("https://fal.run/fal-ai/flux/dev/inpainting", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: image,
        prompt: fullPrompt,
        // Maskę na zęby (na razie wskazujemy automatyczne wykrywanie ust, w kolejnym kroku dodamy rysowanie)
        mask_prompt: "teeth, mouth, open mouth showing teeth",
        strength: 0.85,
        num_inference_steps: 30
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
