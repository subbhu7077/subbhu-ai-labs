import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) throw new Error("Unauthorized user");

    const body = await req.json();
    const { inputFilePath, sourceLang, targetLang, numSpeakers } = body;

    if (!inputFilePath || !targetLang) {
      throw new Error("Missing input video or target language.");
    }

    // 2. Fetch admin pricing config
    const { data: configRow } = await supabaseClient
      .from("app_config")
      .select("value")
      .eq("key", "dubbing_config")
      .single();
    const creditCost = configRow?.value?.credit_cost || 10;

    // 3. Deduct credits atomically
    const { data: deductRes, error: rpcErr } = await supabaseClient.rpc("deduct_credits_atomic", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_description: `Dubbing to ${targetLang}`
    });
    if (rpcErr || !deductRes?.success) {
      return new Response(JSON.stringify({ error: deductRes?.message || "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Retrieve original uploaded video from Supabase Storage
    const { data: fileBlob, error: downloadErr } = await supabaseClient.storage
      .from("uploads")
      .download(inputFilePath);
    if (downloadErr || !fileBlob) throw new Error("Could not retrieve source file from storage.");

    // 5. Send to Official ElevenLabs Dubbing API
    const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenKey) {
      // Refund credits
      await supabaseClient.rpc("refund_credits_atomic", {
        p_user_id: user.id,
        p_amount: creditCost,
        p_description: "Refund: ElevenLabs API Key not configured"
      });
      throw new Error("ElevenLabs is not configured on server.");
    }

    const formData = new FormData();
    formData.append("file", fileBlob, "video.mp4");
    formData.append("target_lang", targetLang);
    if (sourceLang && sourceLang !== "auto") {
      formData.append("source_lang", sourceLang);
    }
    if (numSpeakers && parseInt(numSpeakers) > 0) {
      formData.append("num_speakers", numSpeakers.toString());
    }

    const elevenResponse = await fetch("https://api.elevenlabs.io/v1/dubbing", {
      method: "POST",
      headers: { "xi-api-key": elevenKey },
      body: formData,
    });

    const elevenData = await elevenResponse.json();
    if (!elevenResponse.ok) {
      // Refund on immediate provider rejection
      await supabaseClient.rpc("refund_credits_atomic", {
        p_user_id: user.id,
        p_amount: creditCost,
        p_description: `Refund: Provider error ${elevenData?.detail?.message || "Dub request failed"}`
      });
      throw new Error(elevenData?.detail?.message || "Failed to start dubbing on ElevenLabs");
    }

    const dubbingId = elevenData.dubbing_id;

    // 6. Record in generations table
    const { data: jobRecord, error: dbErr } = await supabaseClient
      .from("generations")
      .insert({
        user_id: user.id,
        tool_type: "ai-dubbing",
        source_language: sourceLang || "auto",
        target_language: targetLang,
        input_file: inputFilePath,
        status: "processing",
        provider: "elevenlabs",
        provider_job_id: dubbingId,
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    return new Response(JSON.stringify({ 
      success: true, 
      jobId: jobRecord.id, 
      dubbingId: dubbingId,
      remainingCredits: deductRes.remaining_credits
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
