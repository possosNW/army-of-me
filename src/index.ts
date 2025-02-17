export default {
    async fetch(request: Request, env) {
        try {
            if (request.method === "GET") {
                return new Response(JSON.stringify({
                    message: "Welcome to the Army of Me Image Generator! Use a POST request with a JSON body to generate images."
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }

            // Parse JSON body with fallback values
            const { prompt = "A fantasy portrait of a human warrior in armor", width = 512, height = 512 } = await request.json().catch(() => ({}));

            console.log(`Prompt: "${prompt}", Dimensions: ${width}x${height}`);

            // Validate dimensions
            const safeWidth = Math.max(512, Math.min(width, 1024));
            const safeHeight = Math.max(512, Math.min(height, 1024));

            // Call the AI model
            const inputs = { prompt, width: safeWidth, height: safeHeight };
            const response = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", inputs);

            if (!response || response.length === 0) {
                console.error("AI model returned empty response.");
                return new Response(JSON.stringify({
                    error: "AI model returned no data. Possibly due to invalid input or model issues."
                }), { status: 500 });
            }

            console.log(`AI model returned ${response.length} bytes of data.`);

            // Convert binary PNG to WebP
            const image = new ImageTransformer(response);
            const webpImage = await image.transform({
                format: 'webp',
                quality: 90
            });

            // Convert WebP binary to Base64
            const bytes = new Uint8Array(webpImage);
            let binaryString = '';
            for (let i = 0; i < bytes.length; i++) {
                binaryString += String.fromCharCode(bytes[i]);
            }
            const base64Image = btoa(binaryString);
            const dataUri = `data:image/webp;base64,${base64Image}`;

            // Respond with base64-encoded WebP image
            return new Response(JSON.stringify({ image_url: dataUri }), {
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error("Unexpected error during image generation:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
} satisfies ExportedHandler;
