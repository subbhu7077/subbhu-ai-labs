/**
 * Supabase Frontend Client Architecture
 * Direct Database & Storage Mode (100% Reliable without Edge deployment dependencies)
 */
const SUPABASE_URL = "https://pgvxbfvyzklqokehtxkx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kD5UMF5T7pYqNl4js1V4vg_egYZQW_k";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const BackendAPI = {
  // 1. AUTHENTICATION
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
      .single();
  },

  // 2. STORAGE UPLOAD
  uploadMedia: async (file, userId) => {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    
    const { data, error } = await supabaseClient.storage
      .from('uploads')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;
    return data.path;
  },

  // 3. GENERATION QUEUE & SERVER-SIDE CREDIT DEDUCTION VIA RPC
  startGeneration: async (toolType, filePath) => {
    const user = await BackendAPI.getUser();
    if (!user) throw new Error("Please log in to use AI tools.");

    const cost = toolType.includes("video") ? 5 : 1;

    // Server-side atomic credit deduction
    const { data: deductRes, error: rpcError } = await supabaseClient.rpc("deduct_credits_atomic", {
      p_user_id: user.id,
      p_amount: cost,
      p_description: `Run ${toolType}`
    });

    if (rpcError) throw new Error(rpcError.message);
    if (!deductRes || !deductRes.success) {
      throw new Error(deductRes?.message || "Insufficient credits. Please recharge.");
    }

    // Insert generation row in database
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
      status: generation.status,
      remaining_credits: deductRes.remaining_credits
    };
  },

  // 4. STATUS & HISTORY
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
