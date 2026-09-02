exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, material, position } = JSON.parse(event.body);

    if (!image) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Brak zdjęcia.' }) };
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Brak klucza FAL_KEY.' }) };
    }

    const materialText = material === 'gold' ? '14k gold' : '925 silver';
    const promptText = `A close-up portrait of a person smiling, showing realistic ${materialText} grillz on ${position}, photorealistic, 8k`;

    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: promptText,
        image_url: image,
        image_size: "square_hd",
        num_inference_steps: 4,
        enable_safety_checker: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: `FAL Error: ${data.detail || JSON.stringify(data)}` })
      };
    }

    const resultUrl = data.images && data.images[0] ? data.images[0].url : null;

    if (!resultUrl) {
      return { 
        statusCode: 500, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: 'Brak obrazu w odpowiedzi FAL.' }) 
      };
    }

    // TUTAJ DODANY NAGŁÓWEK JSON - TO ROZWIĄZUJE BŁĄD
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: resultUrl })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Błąd: ${err.message}` })
    };
  }
};
