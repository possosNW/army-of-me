export default {
    async fetch(request: Request, env) {
        const allowedOrigin = "https://littlebigparty.duckdns.org";

        // Handle CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": allowedOrigin,
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }

        try {
            const url = new URL(request.url);

            if (request.method === "GET") {
                return new Response(JSON.stringify({
                    message: "Welcome to the Army of Me AI Service! Use POST requests for name generation, prompt enhancement, or image generation."
                }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": allowedOrigin
                    }
                });
            }

            if (url.pathname === "/generate-name") {
                return await handleNameGeneration(request, env, allowedOrigin);
            }

            if (url.pathname === "/prompt-enhancer") {
                return await handlePromptEnhancer(request, env, allowedOrigin);
            }

            if (url.pathname === "/generate-image") {
                return await handleImageGeneration(request, env, allowedOrigin);
            }

            return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
                status: 404,
                headers: { "Access-Control-Allow-Origin": allowedOrigin }
            });

        } catch (error) {
            console.error("❌ Unexpected error:", error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Access-Control-Allow-Origin": allowedOrigin }
            });
        }
    }
} satisfies ExportedHandler;

async function handleNameGeneration(request, env, allowedOrigin) {
    try {
        // Parse request body with defaults
        const { race = "human", gender = "male" } = await request.json();

        console.log(`📛 Generating name for a ${gender} ${race} NPC...`);

        // Use Mistral-7B for name generation with additional randomness tweaks
        const nameResponse = await env.AI.run("@cf/mistral/mistral-7b-instruct-v0.1", {
            messages: [
                { role: "system", content: "You are an expert fantasy RPG name generator. Generate highly unique and immersive names. Do NOT provide introductions, explanations, or context—just the name." },
                { role: "user", content: `Generate a highly unique fantasy name for a ${gender} ${race}. The name should be completely distinct from previous outputs and should not be a common name.` }
            ],
            max_tokens: 12,  // Allowing slightly longer names
            temperature: 1.2, // Increased randomness for unique names
            top_p: 0.75       // Reducing top_p slightly to allow more diverse results
        });

        console.log("🛠 AI Response:", nameResponse);

        // Validate AI response
        if (!nameResponse || !nameResponse.response) {
            console.error("⚠️ AI failed to generate a name.");
            return new Response(JSON.stringify({ error: "Failed to generate a name." }), { status: 500 });
        }

        // Extract and clean up generated name
        let generatedName = nameResponse.response.trim();
        generatedName = generatedName.replace(/^(Introducing |Here’s a name: |The name is )/, "").trim();

        console.log(`✅ Generated Name: "${generatedName}"`);

        return new Response(JSON.stringify({ name: generatedName }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin,
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });

    } catch (error) {
        console.error("⚠️ Name generation failed:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Access-Control-Allow-Origin": allowedOrigin }
        });
    }
}

async function handlePromptEnhancer(request: Request, env, allowedOrigin: string) {
    try {
        const { prompt } = await request.json();
        if (!prompt) throw new Error("No prompt provided.");

        console.log(`📝 Enhancing prompt using Mistral-7B: "${prompt}"`);

        // Use Mistral-7B to enhance prompt
        const enhancedResponse = await env.AI.run(
            "@cf/mistral/mistral-7b-instruct-v0.1",
            {
                messages: [
                    { role: "system", content: "Enhance this prompt for a highly detailed fantasy-style AI-generated portrait." },
                    { role: "user", content: prompt }
                ]
            }
        );

        if (!enhancedResponse || !enhancedResponse.choices || !enhancedResponse.choices[0]?.message?.content) {
            throw new Error("Failed to generate enhanced prompt.");
        }

        const enhancedPrompt = enhancedResponse.choices[0].message.content;

        console.log(`✅ Enhanced prompt: "${enhancedPrompt}"`);
        return new Response(JSON.stringify({ enhancedPrompt }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin
            }
        });

    } catch (error) {
        console.error("⚠️ Prompt enhancement failed:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Access-Control-Allow-Origin": allowedOrigin }
        });
    }
}

async function handleImageGeneration(request: Request, env, allowedOrigin: string) {
    try {
        const { prompt = "A fantasy portrait of a human warrior" } = await request.json();
        console.log(`🎨 Enhancing prompt before image generation: "${prompt}"`);

        // Step 1: Enhance the prompt
        const enhancedResponse = await env.AI.run(
            "@cf/mistral/mistral-7b-instruct-v0.1",
            {
                messages: [
                    { role: "system", content: "Enhance this prompt for a highly detailed fantasy-style AI-generated portrait." },
                    { role: "user", content: prompt }
                ]
            }
        );

        const enhancedPrompt = enhancedResponse?.choices?.[0]?.message?.content || prompt;
        console.log(`✅ Final prompt used for image: "${enhancedPrompt}"`);

        // Step 2: Generate the image with the enhanced prompt
        const response = await env.AI.run(
            "@cf/stabilityai/stable-diffusion-xl-base-1.0",
            { prompt: enhancedPrompt, width: 1024, height: 1024 }
        );

        if (!response || response.length === 0) {
            console.error("⚠️ AI model returned empty response.");
            return new Response(JSON.stringify({
                error: "AI model returned no data."
            }), {
                status: 500,
                headers: { "Access-Control-Allow-Origin": allowedOrigin }
            });
        }

        console.log(`✅ Response size: ${response.length} bytes`);

        return new Response(response, {
            headers: {
                "Content-Type": "image/png",
                "Access-Control-Allow-Origin": allowedOrigin
            }
        });

    } catch (error) {
        console.error("⚠️ Image generation failed:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Access-Control-Allow-Origin": allowedOrigin }
        });
    }
}
