export default {
    async fetch(request: Request, env) {
        try {
            if (request.method === "GET") {
                return new Response(JSON.stringify({
                    message: "Welcome to the Army of Me Image Generator! Now using `flux-1-schnell`."
                }), { status: 200, headers: { "Content-Type": "application/json" } });
            }

            // Parse the incoming request
            const { prompt = "A portrait of a person" } = await request.json().catch(() => ({}));

            console.log(`🔍 Prompt: "${prompt}"`);

            // Call the flux-1-schnell model
            const response = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt });

            if (!response || response.length === 0) {
                console.error("⚠️ Flux-1-Schnell returned empty data!");
                return new Response(JSON.stringify({
                    error: "Flux-1-Schnell returned no image data.",
                    fallback: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AA..."
                }), { status: 500 });
            }

            console.log(`✅ Received ${response.length} bytes.`);

            // Convert binary response to Base64
            const base64 = btoa(String.fromCharCode(...new Uint8Array(response)));
            const imageData = `data:image/png;base64,${base64}`;

            return new Response(JSON.stringify({ image_url: imageData }), {
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error("❌ Error generating image:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
} satisfies ExportedHandler;
