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

        const nameResponse = await runAIModel(env, env.NAME_GENERATION_MODEL, constructNamePrompt(gender, race));
        const generatedName = processNameResponse(nameResponse);

        console.log(`✅ Generated Name: "${generatedName}"`);

        return createSuccessResponse({ name: generatedName }, allowedOrigin);

    } catch (error) {
        console.error("⚠️ Name generation failed:", error);
        return createErrorResponse(error.message, 500, allowedOrigin);
    }
}

async function handlePromptEnhancer(request, env, allowedOrigin) {
    try {
        const { prompt = "A mighty dwarf paladin", style = "fantasy", mood = "epic", details = {} } = await request.json();
        console.log(`🎨 Enhancing prompt: "${prompt}" with style: ${style}, mood: ${mood}`);

        const systemPrompt = constructEnhancerPrompt(style, mood, details);
        const aiResponse = await runAIModel(env, env.PROMPT_ENHANCER_MODEL, systemPrompt, prompt);
        const enhancedPrompt = processEnhancerResponse(aiResponse, prompt, style, mood);

        console.log(`✅ Enhanced Prompt: "${enhancedPrompt}"`);

        return createSuccessResponse({
            enhanced_prompt: enhancedPrompt,
            original_prompt: prompt,
            style: style,
            mood: mood,
            word_count: enhancedPrompt.split(/\s+/).length
        }, allowedOrigin);
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

// Utility Functions

async function runAIModel(env, model, systemPrompt, userPrompt = "") {
    return await env.AI.run(model || "@cf/mistral/mistral-7b-instruct-v0.1", {
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.6
    });
}

function constructNamePrompt(gender, race) {
    return `You are an expert in fantasy RPG name generation. Generate **one unique** first and last name for an RPG character.
            - Do NOT provide explanations, alternative names, or extra words.
            - Output ONLY the name in the format: "Firstname Lastname".`;
}

function processNameResponse(response) {
    if (!response || !response.response) {
        throw new Error("AI failed to generate a name.");
    }
    let generatedName = response.response.trim();
    const nameParts = generatedName.split(/\s+/);
    return nameParts.length > 2 ? `${nameParts[0]} ${nameParts[1]}` : generatedName;
}

function constructEnhancerPrompt(style, mood, details) {
    const styleGuides = {
        fantasy: "digital painting, high contrast, soft shadows, fantasy concept art, trending on ArtStation",
        cyberpunk: "neon lighting, high contrast, cyberpunk aesthetic, futuristic, trending on ArtStation",
        medieval: "oil painting style, historical accuracy, detailed armor and clothing, dramatic lighting",
        ethereal: "soft dreamy lighting, pastel colors, magical atmosphere, ethereal glow, particle effects"
    };

    const moodLighting = {
        epic: "dramatic backlighting, golden hour, god rays",
        dark: "low-key lighting, deep shadows, moody atmosphere",
        peaceful: "soft ambient lighting, gentle highlights, balanced exposure",
        mysterious: "foggy atmosphere, partial lighting, deep shadows with highlights"
    };

    const systemPrompt = `You are an expert in crafting concise, visually detailed AI image generation prompts.
                          Your task is to enhance the given prompt into a SINGLE PARAGRAPH (max 80 words) that describes ONLY the visual elements.
                          INCLUDE:
                          - Character: specific facial features, expression, pose
                          - Attire: detailed description of armor/clothing, focus on textures and materials
                          - Lighting: ${moodLighting[mood] || "cinematic lighting with depth"}
                          - Style: ${styleGuides[style] || "Digital painting, high contrast"}
                          DO NOT INCLUDE:
                          - Backstory or narrative elements
                          - Multiple paragraphs
                          - Non-visual descriptions
                          - Generic phrases like "in this image"
                          FORMAT:
                          - Single, concise paragraph
                          - Focus on specific visual adjectives
                          - Start with the main subject immediately`;

    const customDetails = details.customInstructions ? `\n\nAlso incorporate these specific elements: ${details.customInstructions}` : "";
    const examplePrompt = `\n\nEXAMPLE:
                           Input: "Warrior with sword"
                           Output: "Battle-hardened warrior with chiseled jawline and piercing blue eyes, wielding an ancestral longsword with intricate gold filigree. Heavy plate armor with ornate lion motifs, illuminated by dramatic sunset backlighting creating a golden outline. Photorealistic textures, 8K detail, digital painting."`;

    return systemPrompt + customDetails + examplePrompt;
}

function processEnhancerResponse(response, prompt, style, mood) {
    if (!response || !response.response) {
        throw new Error("AI failed to enhance the prompt.");
    }
    let enhancedPrompt = response.response.trim().replace(/^(Output:|Enhanced prompt:|Result:)/i, "").trim();
    const qualityTerms = ["8k", "ultra-high resolution", "photorealistic", "artstation"];
    if (!qualityTerms.some(term => enhancedPrompt.toLowerCase().includes(term))) {
        enhancedPrompt += " Ultra-high resolution, 8K quality, photorealistic textures, trending on ArtStation.";
    }
    return enhancedPrompt;
}

function createSuccessResponse(data, allowedOrigin) {
    return new Response(JSON.stringify(data), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

async function processImageResponse(response) {
    if (response instanceof Response && response.body) {
        const imageBuffer = await response.arrayBuffer();
        return Buffer.from(imageBuffer).toString('base64');
    } else {
        throw new Error("Unexpected response format from image generation API");
    }
}
