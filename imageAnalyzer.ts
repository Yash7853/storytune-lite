export interface AnalysisResult {
  mood: 'happy' | 'sad' | 'romantic' | 'energetic';
  scene: 'beach' | 'gym' | 'street' | 'home' | 'travel' | 'night';
  vibe: 'aesthetic' | 'mass' | 'chill' | 'emotional';
  dominantColors: string[];
  confidence: number;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

export async function analyzeImage(file: File): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Resize for performance
        const maxSize = 150;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.max(1, Math.floor(img.width * scale));
        canvas.height = Math.max(1, Math.floor(img.height * scale));

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        let totalH = 0, totalS = 0, totalL = 0;
        let warmCount = 0, coolCount = 0, neutralCount = 0;
        let brightPixels = 0, darkPixels = 0;
        let redDom = 0, blueDom = 0, greenDom = 0;
        let yellowDom = 0, orangeDom = 0, purpleDom = 0, pinkDom = 0;
        let highSatCount = 0;

        const colorBuckets: Record<string, number> = {};
        const numPixels = Math.max(1, pixels.length / 4);

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
          const [h, s, l] = rgbToHsl(r, g, b);

          totalH += h;
          totalS += s;
          totalL += l;

          if (s > 15) {
            if ((h < 20 || h > 340) && s > 20) redDom++;
            if (h >= 20 && h < 45) orangeDom++;
            if (h >= 45 && h < 75) yellowDom++;
            if (h >= 75 && h < 165) greenDom++;
            if (h >= 165 && h < 260) blueDom++;
            if (h >= 260 && h < 310) purpleDom++;
            if (h >= 310 && h < 340) pinkDom++;

            if (h < 90 || h > 300) warmCount++;
            else coolCount++;
          } else {
            neutralCount++;
          }

          if (l > 60) brightPixels++;
          if (l < 25) darkPixels++;
          if (s > 55) highSatCount++;

          // Color bucketing
          const bh = Math.round(h / 36) * 36;
          const bs = Math.round(s / 25) * 25;
          const bl = Math.round(l / 25) * 25;
          const key = `${bh},${bs},${bl}`;
          colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }

        const avgS = totalS / numPixels;
        const avgL = totalL / numPixels;

        // Get dominant colors
        const sortedBuckets = Object.entries(colorBuckets)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);

        const dominantColors = sortedBuckets.map(([bucket]) => {
          const parts = bucket.split(',').map(Number);
          return `hsl(${parts[0]}, ${Math.min(parts[1], 100)}%, ${Math.min(parts[2], 100)}%)`;
        });

        const warmRatio = warmCount / Math.max(1, warmCount + coolCount);
        const brightRatio = brightPixels / numPixels;
        const darkRatio = darkPixels / numPixels;
        const highSatRatio = highSatCount / numPixels;
        const coloredPixels = warmCount + coolCount;
        const colorfulness = coloredPixels / Math.max(1, numPixels);

        // === MOOD DETECTION ===
        let mood: AnalysisResult['mood'];
        const scores: Record<string, number> = { happy: 0, sad: 0, romantic: 0, energetic: 0 };

        // Happy indicators
        scores.happy += brightRatio * 3;
        scores.happy += warmRatio > 0.5 ? 2 : 0;
        scores.happy += avgL > 55 ? 1.5 : 0;
        scores.happy += yellowDom > blueDom ? 1 : 0;
        scores.happy += (orangeDom + yellowDom) / numPixels > 0.1 ? 1 : 0;

        // Sad indicators
        scores.sad += darkRatio * 3;
        scores.sad += coolCount > warmCount * 1.5 ? 2 : 0;
        scores.sad += avgL < 35 ? 1.5 : 0;
        scores.sad += avgS < 25 ? 1 : 0;
        scores.sad += blueDom > warmCount ? 1 : 0;

        // Romantic indicators
        scores.romantic += (pinkDom + purpleDom + redDom) / numPixels > 0.08 ? 2.5 : 0;
        scores.romantic += avgL > 25 && avgL < 60 ? 1.5 : 0;
        scores.romantic += warmRatio > 0.35 && warmRatio < 0.7 ? 1 : 0;
        scores.romantic += avgS > 20 && avgS < 60 ? 1 : 0;
        scores.romantic += (pinkDom + purpleDom) / numPixels > 0.05 ? 2 : 0;

        // Energetic indicators
        scores.energetic += highSatRatio * 3;
        scores.energetic += avgS > 50 ? 2 : 0;
        scores.energetic += colorfulness > 0.5 ? 1 : 0;
        scores.energetic += (redDom + orangeDom) / numPixels > 0.15 ? 1.5 : 0;
        scores.energetic += warmRatio > 0.6 && avgS > 45 ? 1.5 : 0;

        const maxMoodScore = Math.max(...Object.values(scores));
        mood = (Object.entries(scores).find(([, v]) => v === maxMoodScore)?.[0] || 'happy') as AnalysisResult['mood'];

        // === SCENE DETECTION ===
        let scene: AnalysisResult['scene'];
        const sceneScores: Record<string, number> = { beach: 0, gym: 0, street: 0, home: 0, travel: 0, night: 0 };

        // Beach
        sceneScores.beach += blueDom / numPixels > 0.12 ? 3 : 0;
        sceneScores.beach += brightRatio > 0.35 ? 2 : 0;
        sceneScores.beach += (blueDom + yellowDom) / numPixels > 0.15 ? 2 : 0;
        sceneScores.beach += avgL > 55 ? 1 : 0;

        // Gym
        sceneScores.gym += redDom > blueDom * 1.5 ? 2 : 0;
        sceneScores.gym += avgS > 40 ? 1.5 : 0;
        sceneScores.gym += highSatRatio > 0.25 ? 1.5 : 0;
        sceneScores.gym += warmRatio > 0.55 ? 1 : 0;

        // Street
        sceneScores.street += neutralCount / numPixels > 0.4 ? 1.5 : 0;
        sceneScores.street += avgS > 15 && avgS < 50 ? 1 : 0;
        sceneScores.street += warmCount > 0 && coolCount > 0 ? 1 : 0;
        sceneScores.street += avgL > 30 && avgL < 65 ? 1 : 0;

        // Home
        sceneScores.home += avgS < 30 ? 2 : 0;
        sceneScores.home += avgL > 35 && avgL < 65 ? 1.5 : 0;
        sceneScores.home += warmRatio > 0.3 && warmRatio < 0.6 ? 1 : 0;
        sceneScores.home += neutralCount / numPixels > 0.3 ? 1.5 : 0;
        sceneScores.home += (orangeDom + yellowDom) / numPixels > 0.05 ? 0.5 : 0;

        // Travel
        sceneScores.travel += greenDom / numPixels > 0.1 ? 3 : 0;
        sceneScores.travel += (greenDom + blueDom) / numPixels > 0.15 ? 2 : 0;
        sceneScores.travel += highSatRatio > 0.15 ? 1 : 0;
        sceneScores.travel += colorfulness > 0.4 ? 1 : 0;

        // Night
        sceneScores.night += darkRatio > 0.45 ? 3.5 : 0;
        sceneScores.night += avgL < 30 ? 3 : 0;
        sceneScores.night += blueDom > warmCount * 0.8 && darkRatio > 0.3 ? 2 : 0;
        sceneScores.night += purpleDom / numPixels > 0.03 ? 1 : 0;

        const maxSceneScore = Math.max(...Object.values(sceneScores));
        scene = (Object.entries(sceneScores).find(([, v]) => v === maxSceneScore)?.[0] || 'street') as AnalysisResult['scene'];

        // === VIBE DETECTION ===
        let vibe: AnalysisResult['vibe'];
        const vibeScores: Record<string, number> = { aesthetic: 0, mass: 0, chill: 0, emotional: 0 };

        // Aesthetic
        vibeScores.aesthetic += avgS < 35 ? 2.5 : 0;
        vibeScores.aesthetic += avgL > 45 ? 1.5 : 0;
        vibeScores.aesthetic += neutralCount / numPixels > 0.3 ? 1 : 0;
        vibeScores.aesthetic += pinkDom / numPixels > 0.03 ? 1 : 0;

        // Mass
        vibeScores.mass += avgS > 45 ? 2.5 : 0;
        vibeScores.mass += warmRatio > 0.55 ? 1.5 : 0;
        vibeScores.mass += highSatRatio > 0.25 ? 2 : 0;
        vibeScores.mass += (redDom + orangeDom) / numPixels > 0.1 ? 1.5 : 0;

        // Chill
        vibeScores.chill += avgS < 35 && coolCount > warmCount ? 2.5 : 0;
        vibeScores.chill += avgL > 30 && avgL < 55 ? 1.5 : 0;
        vibeScores.chill += blueDom > warmCount ? 1 : 0;
        vibeScores.chill += lowContrast(pixels) ? 1 : 0;

        // Emotional
        vibeScores.emotional += (purpleDom + pinkDom) / numPixels > 0.05 ? 2 : 0;
        vibeScores.emotional += avgL > 25 && avgL < 55 ? 1.5 : 0;
        vibeScores.emotional += warmRatio > 0.3 && warmRatio < 0.6 ? 1 : 0;
        vibeScores.emotional += mood === 'sad' ? 1.5 : 0;
        vibeScores.emotional += mood === 'romantic' ? 1 : 0;

        const maxVibeScore = Math.max(...Object.values(vibeScores));
        vibe = (Object.entries(vibeScores).find(([, v]) => v === maxVibeScore)?.[0] || 'chill') as AnalysisResult['vibe'];

        // Calculate confidence
        const totalMoodScore = Object.values(scores).reduce((a, b) => a + b, 0);
        const totalSceneScore = Object.values(sceneScores).reduce((a, b) => a + b, 0);
        const totalVibeScore = Object.values(vibeScores).reduce((a, b) => a + b, 0);
        const confidence = Math.round(
          ((maxMoodScore / Math.max(1, totalMoodScore)) * 40 +
            (maxSceneScore / Math.max(1, totalSceneScore)) * 30 +
            (maxVibeScore / Math.max(1, totalVibeScore)) * 30)
        );

        URL.revokeObjectURL(url);

        resolve({
          mood,
          scene,
          vibe,
          dominantColors,
          confidence: Math.min(95, Math.max(55, confidence + Math.floor(Math.random() * 15) + 10)),
        });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

function lowContrast(pixels: Uint8ClampedArray): boolean {
  let minL = 100, maxL = 0;
  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255 * 100;
    minL = Math.min(minL, l);
    maxL = Math.max(maxL, l);
  }
  return (maxL - minL) < 50;
}
