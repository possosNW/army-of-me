export default {
    async fetch(request: Request) {
        try {
            // Parse the incoming JSON
            const { prompt, width = 1024, height = 1024 } = await request.json();

            // Specify the AI model
            const model = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

            // Run the AI model with the provided parameters
            const response = await AI.run(model, { prompt, width, height });

            // Respond with the image URL
            return new Response(JSON.stringify({ image_url: response }), {
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            // Handle any errors gracefully
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
};
