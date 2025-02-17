export default {
    async fetch(request: Request, env) {
        try {
            if (request.method === "GET") {
                return new Response(JSON.stringify({
                    message: "Welcome to the Army of Me Image Generator! Now using `flux-schnell` for improved speed!"
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }

            // Parse JSON body with fallback prompt
            const { prompt = "A fantasy portrait of a human warrior in armor", width = 512, height = 512 } = await request.json().catch(() => ({}));

            console.log(`Prompt: "${prompt}", Dimensions: ${width}x${height}`);

            // Validate dimensions
            const safeWidth = Math.max(512, Math.min(width, 1024));
            const safeHeight = Math.max(512, Math.min(height, 1024));

            // Call the AI model
            const inputs = { prompt, width: safeWidth, height: safeHeight };
            const response = await env.AI.run("@cf/flux-schnell/image-generation", inputs);

            // Check response
            if (!response || response.length === 0) {
                console.error(`Flux-Schnell returned empty response for prompt: "${prompt}"`);
                return new Response(JSON.stringify({
                    error: `Flux-Schnell returned no data for prompt: "${prompt}"`,
                    fallback_image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AA..."
                }), { status: 500 });
            }

            console.log(`Flux-Schnell returned ${response.length} bytes of data.`);

            // Convert binary PNG to Base64
            const bytes = new Uint8Array(response);
            let binaryString = '';
            for (let i = 0; i < bytes.length; i++) {
                binaryString += String.fromCharCode(bytes[i]);
            }
            const base64Image = btoa(binaryString);
            const dataUri = `data:image/png;base64,${base64Image}`;

            // Respond with base64-encoded PNG image
            return new Response(JSON.stringify({ image_url: dataUri }), {
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error("Unexpected error during flux-schnell image generation:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
} satisfies ExportedHandler;
