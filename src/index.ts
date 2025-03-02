export default {
    async fetch(request, env) {
        const allowedOrigin = env.ALLOWED_ORIGIN || "https://littlebigparty.duckdns.org";

        if (request.method === "OPTIONS") {
            return handlePreflightRequest(allowedOrigin);
        }

        try {
            const url = new URL(request.url);

            if (request.method === "GET") {
                return handleGetRequest(allowedOrigin);
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

            if (url.pathname === "/generate-enhanced-image") {
                return await handleEnhancedImageGeneration(request, env, allowedOrigin);
            }

            return createErrorResponse("Invalid endpoint", 404, allowedOrigin);

        } catch (error) {
            console.error("❌ Unexpected error:", error);
            return createErrorResponse(error.message, 500, allowedOrigin);
        }
    }
} satisfies ExportedHandler;

function handlePreflightRequest(allowedOrigin) {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

function handleGetRequest(allowedOrigin) {
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

function createErrorResponse(message, statusCode, allowedOrigin) {
    return new Response(JSON.stringify({ error: message }), {
        status: statusCode,
        headers: { "Access-Control-Allow-Origin": allowedOrigin }
    });
}

async function handleNameGeneration(request, env, allowedOrigin) {
    try {
        const { race = "human", gender = "male" } = await request.json();
        console.log(`📛 Generating name for a ${gender} ${race} NPC...`);

        const nameResponse = await env.AI.run(env.NAME_GENERATION_MODEL || "@cf/mistral/mistral-7b-instruct-v0.1", {
            messages: [
                {
                    role: "system",
                    content: `You are an expert in fantasy RPG name generation. Generate **one unique** first and last name for an RPG character.
                              - Do NOT provide explanations, alternative names, or extra words.
                              - Output ONLY the name in the format: "Firstname Lastname".`
                },
                { role: "user", content: `Provide a full fantasy name (first and last) for a ${gender} ${race}.` }
            ],
            max_tokens: 12,
            temperature: 1.2,
            top_p: 0.75
        });

        console.log("🛠 AI Raw Response:", nameResponse);

        if (!nameResponse || !nameResponse.response) {
            console.error("⚠️ AI failed to generate a name.");
            return createErrorResponse("Failed to generate a name.", 500, allowedOrigin);
        }

        let generatedName = nameResponse.response.trim();
        const nameParts = generatedName.split(/\s+/);
        if (nameParts.length > 2) {
            generatedName = `${nameParts[0]} ${nameParts[1]}`;
        }

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
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}

async function handlePromptEnhancer(request, env, allowedOrigin) {
    try {
        const { prompt = "A mighty dwarf paladin", style = "cinematic" } = await request.json();
        console.log(`🎨 Enhancing prompt: "${prompt}" with style: "${style}"`);

        // Define styles and enhancing words
        const styles = {
            "cinematic": "cinematic film still of {prompt}, highly detailed, high budget Hollywood movie, cinemascope, moody, epic, gorgeous, film grain",
            "anime": "anime artwork of {prompt}, anime style, key visual, vibrant, studio anime, highly detailed",
            "photographic": "cinematic photo of {prompt}, 35mm photograph, film, professional, 4k, highly detailed",
            "comic": "comic of {prompt}, graphic illustration, comic art, graphic novel art, vibrant, highly detailed",
            "lineart": "line art drawing {prompt}, professional, sleek, modern, minimalist, graphic, line art, vector graphics",
            "pixelart": "pixel-art {prompt}, low-res, blocky, pixel art style, 8-bit graphics",
        };

        const words = [
            "aesthetic", "astonishing", "beautiful", "breathtaking", "composition", "contrasted",
            "epic", "moody", "enhanced", "exceptional", "fascinating", "flawless", "glamorous",
            "glorious", "illumination", "impressive", "improved", "inspirational", "magnificent",
            "majestic", "hyperrealistic", "smooth", "sharp", "focus", "stunning", "detailed",
            "intricate", "dramatic", "high", "quality", "perfect", "light", "ultra", "highly",
            "radiant", "satisfying", "soothing", "sophisticated", "stylish", "sublime", "terrific",
            "touching", "timeless", "wonderful", "unbelievable", "elegant", "awesome", "amazing",
            "dynamic", "trendy"
        ];

        const wordPairs = ["highly detailed", "high quality", "enhanced quality", "perfect composition", "dynamic light"];

        // Function to find and order pairs
        function findAndOrderPairs(s, pairs) {
            const wordsArray = s.split(/\s+/);
            const foundPairs = [];
            pairs.forEach(pair => {
                const pairWords = pair.split(/\s+/);
                if (pairWords.every(word => wordsArray.includes(word))) {
                    foundPairs.push(pair);
                    pairWords.forEach(word => {
                        const index = wordsArray.indexOf(word);
                        if (index > -1) {
                            wordsArray.splice(index, 1);
                        }
                    });
                }
            });
            wordsArray.forEach((word, index) => {
                pairs.forEach(pair => {
                    if (pair.includes(word)) {
                        wordsArray.splice(index, 1);
                    }
                });
            });
            return `${foundPairs.join(", ")}, ${wordsArray.join(", ")}`.trim();
        }

        // Apply style to the prompt
        let enhancedPrompt = styles[style].replace("{prompt}", prompt);

        // Enhance the prompt with additional words
        enhancedPrompt += `, ${words.join(", ")}`;

        // Order and format the words in the prompt
        enhancedPrompt = findAndOrderPairs(enhancedPrompt, wordPairs);

        console.log(`✅ Enhanced Prompt: "${enhancedPrompt}"`);

        return new Response(JSON.stringify({ enhanced_prompt: enhancedPrompt }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin
            }
        });

    } catch (error) {
        console.error("⚠️ Prompt enhancement failed:", error);
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}

async function handleImageGeneration(request, env, allowedOrigin) {
    try {
        const { prompt = "A fantasy portrait of a human warrior" } = await request.json();
        console.log(`🎨 Generating image with prompt: "${prompt}"`);

        const response = await env.AI.run(env.IMAGE_GENERATION_MODEL || "@cf/stabilityai/stable-diffusion-xl-base-1.0", {
            prompt: prompt,
            width: 1024,
            height: 1024
        });

        if (!response || response.length === 0) {
            console.error("⚠️ AI model returned empty response.");
            return createErrorResponse("AI model returned no data.", 500, allowedOrigin);
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
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}

async function handleEnhancedImageGeneration(request, env, allowedOrigin) {
    try {
        const [req1, req2] = request.body.tee();
        const { prompt = "A fantasy portrait of a human warrior" } = await new Response(req1).json();

        console.log(`🎨 Enhancing prompt before image generation: "${prompt}"`);

        const enhancerResponse = await handlePromptEnhancer(new Request(request, { body: req2 }), env, allowedOrigin);
        const { enhanced_prompt } = await enhancerResponse.json();

        const finalPrompt = enhanced_prompt || prompt;
        console.log(`✅ Final prompt used for image: "${finalPrompt}"`);

        return await handleImageGeneration(new Request(request, { body: JSON.stringify({ prompt: finalPrompt }) }), env, allowedOrigin);

    } catch (error) {
        console.error("⚠️ Enhanced image generation failed:", error);
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}
