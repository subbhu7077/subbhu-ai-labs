/**
 * Supabase Frontend Client Architecture
 * High Performance & Low Latency
 */
const SUPABASE_URL = "https://pgvxbfvyzklqokehtxkx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kD5UMF5T7pYqNl4js1V4vg_egYZQW_k";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const BackendAPI = {
  signUp: async (email, password, username) => {
    return await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
  },

  signIn: async (email, password) => {
    return await supabaseClient.auth.signInWithPassword({ email, password });
  },

  signOut: async () => {
    return await supabaseClient.auth.signOut();
  },

  getUser: async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  getProfile: async (userId) => {
    return await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
  },

  uploadMedia: async (file, userId) => {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${ext}`;
    
    const { data, error } = await supabaseClient.storage
      .from('uploads')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (error) throw error;
    return data.path;
  },

  startGeneration: async (toolType, filePath) => {
    const user = await BackendAPI.getUser();
    if (!user) throw new Error("Please log in to use AI tools.");

    const cost = toolType.includes("video") ? 5 : 1;

    // Fast atomic deduction
    const { data: deductRes, error: rpcError } = await supabaseClient.rpc("deduct_credits_atomic", {
      p_user_id: user.id,
      p_amount: cost,
      p_description: `Run ${toolType}`
    });

    if (rpcError) throw new Error(rpcError.message);
    if (!deductRes || !deductRes.success) {
      throw new Error(deductRes?.message || "Insufficient credits.");
    }

    // Insert task in generations table
    const { data: generation, error: genError } = await supabaseClient
      .from("generations")
      .insert({
        user_id: user.id,
        tool_type: toolType,
        input_url: filePath,
        status: "queued"
      })
      .select()
      .single();

    if (genError) throw new Error(genError.message);

    return {
      success: true,
      generation_id: generation.id,
      remaining_credits: deductRes.remaining_credits
    };
  },

  getHistory: async (userId) => {
    return await supabaseClient
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  },

  deleteGeneration: async (id) => {
    return await supabaseClient
      .from('generations')
      .delete()
      .eq('id', id);
  }
};

window.BackendAPI = BackendAPI;
