exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, material, position } = JSON.parse(event.body);

    if (!image) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Brak przesłanego zdjęcia.' }) 
      };
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Brak klucza FAL_KEY w zmiennych Netlify.' }) 
      };
    }

    // Konwersja Base64 na bufer binarny
    const base64Clean = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Clean, 'base64');

    // 1. Inicjalizacja uploadu w CDN fal.ai za pomocą natywnego fetch()
    const uploadInitRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file_name: 'input_teeth.png',
        content_type: 'image/png'
      })
    });

    const uploadInitData = await uploadInitRes.json();
    
    if (!uploadInitRes.ok) {
      return {
        statusCode: uploadInitRes.status,
        body: JSON.stringify({ error: `Błąd inicjalizacji CDN FAL: ${JSON.stringify(uploadInitData)}` })
      };
    }

    // 2. Wysłanie pliku do magazynu FAL
    const uploadPutRes = await fetch(uploadInitData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: imageBuffer
    });

    if (!uploadPutRes.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Nie udało się przesłać pliku do magazynu FAL.' })
      };
    }

    const publicImageUrl = uploadInitData.file_url;

    // 3. Wywołanie modelu Inpainting z automatycznym maskowaniem zębów
    const materialPrompt = material === 'gold' ? '14k polished gold' : '925 sterling silver';
    const promptText = `solid metallic ${materialPrompt} grillz fitted over ${position}, hyperrealistic dental jewelry, perfectly matching smile, 8k resolution`;

    const inpaintRes = await fetch('https://fal.run/fal-ai/flux-general/inpainting', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: publicImageUrl,
        mask_prompt: "teeth, mouth, human teeth",
        prompt: promptText,
        strength: 0.85,
        guidance_scale: 7.5
      })
    });

    const inpaintData = await inpaintRes.json();

    if (!inpaintRes.ok) {
      return {
        statusCode: inpaintRes.status,
        body: JSON.stringify({ 
          error: `Błąd FAL AI (${inpaintRes.status}): ${inpaintData.detail || JSON.stringify(inpaintData)}` 
        })
      };
    }

    const resultUrl = inpaintData.images && inpaintData.images[0] ? inpaintData.images[0].url : null;

    if (!resultUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Model FAL nie zwrócił obrazu.', raw: inpaintData })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ image: resultUrl })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Błąd kodu funkcji: ${err.message}` })
    };
  }
};
