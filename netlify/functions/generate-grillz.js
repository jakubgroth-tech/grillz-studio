const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, material, position } = JSON.parse(event.body);

    if (!image) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Brak przesłanego zdjęcia w żądaniu.' }) 
      };
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Brak klucza FAL_KEY w zmiennych środowiskowych Netlify.' }) 
      };
    }

    // --- KROK 1: Konwersja Base64 na plik binarny i wysyłka do oficjalnego CDN fal.ai ---
    const base64Clean = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Clean, 'base64');

    // Inicjalizacja uploadu w fal.ai CDN
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
        body: JSON.stringify({ error: `Błąd CDN FAL (Upload Init): ${JSON.stringify(uploadInitData)}` })
      };
    }

    // Wgranie bajtów obrazu do tymczasowego magazynu FAL
    const uploadPutRes = await fetch(uploadInitData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: imageBuffer
    });

    if (!uploadPutRes.ok) {
      return {
        statusCode: uploadPutRes.status,
        body: JSON.stringify({ error: 'Nie udało się przesłać pliku graficznego do magazynu FAL.' })
      };
    }

    const publicImageUrl = uploadInitData.file_url;

    // --- KROK 2: Dwuetapowy Inpainting (wykrycie zębów + wygenerowanie biżuterii) ---
    const materialPrompt = material === 'gold' ? '14k polished gold' : '925 sterling silver';
    const promptText = `solid metallic ${materialPrompt} grillz fitted over ${position}, hyperrealistic dental jewelry, perfectly matching smile, 8k resolution`;

    // Wywołanie stabilnego endpointu fal-ai/flux-general/inpainting
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
        body: JSON.stringify({ error: 'Model FAL nie zwrócił adresu wygenerowanego obrazu.', raw: inpaintData })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ image: resultUrl })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Błąd wykonywania funkcji: ${err.message}` })
    };
  }
};
