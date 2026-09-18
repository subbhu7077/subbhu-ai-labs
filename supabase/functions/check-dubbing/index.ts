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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) throw new Error("Unauthorized");

    const { jobId } = await req.json();
    if (!jobId) throw new Error("Missing jobId");

    const { data: job, error: jobErr } = await supabaseClient
      .from("generations")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (jobErr || !job) throw new Error("Job not found");

    if (job.status === "completed" || job.status === "failed") {
      return new Response(JSON.stringify(job), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
    const pollRes = await fetch(`https://api.elevenlabs.io/v1/dubbing/${job.provider_job_id}`, {
      headers: { "xi-api-key": elevenKey || "" }
    });

    if (!pollRes.ok) {
      throw new Error("Unable to check status from ElevenLabs");
    }

    const pollData = await pollRes.json();
    const currentStatus = pollData.status; // "dubbing", "dubbed", "failed"

    if (currentStatus === "dubbed") {
      // Fetch dubbed video stream and store in Supabase Storage permanently
      const fileRes = await fetch(`https://api.elevenlabs.io/v1/dubbing/${job.provider_job_id}/audio/${job.target_language}`, {
        headers: { "xi-api-key": elevenKey || "" }
      });
      
      const dubbedBlob = await fileRes.blob();
      const outputPath = `${user.id}/dubbed_${Date.now()}_${job.target_language}.mp4`;

      await supabaseClient.storage.from("outputs").upload(outputPath, dubbedBlob, {
        contentType: "video/mp4",
        upsert: true
      });

      const { data: pubUrlData } = supabaseClient.storage.from("outputs").getPublicUrl(outputPath);
      const finalUrl = pubUrlData.publicUrl;

      // Update generation record
      await supabaseClient.from("generations").update({
        status: "completed",
        output_file: finalUrl,
        completed_at: new Date().toISOString()
      }).eq("id", job.id);

      return new Response(JSON.stringify({ status: "completed", output_file: finalUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } else if (currentStatus === "failed") {
      // Safe refund
      await supabaseClient.rpc("refund_credits_atomic", {
        p_user_id: user.id,
        p_amount: 10,
        p_description: "Refund: Dubbing job failed during processing"
      });

      await supabaseClient.from("generations").update({
        status: "failed",
        error_message: pollData.error || "Dubbing processing failed on ElevenLabs."
      }).eq("id", job.id);

      return new Response(JSON.stringify({ status: "failed", error: "Dubbing failed. Credits refunded." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // In progress
    return new Response(JSON.stringify({ status: "processing", progress: pollData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
