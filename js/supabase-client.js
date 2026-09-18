/**
 * Supabase Frontend Client Architecture
 * Connected to SUBBHU AI LABS Instance
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

  // 2. STORAGE UPLOAD (Secure Private Upload)
  uploadMedia: async (file, userId) => {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    
    const { data, error } = await supabaseClient.storage
      .from('uploads')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;
    return data.path;
  },

  // 3. GENERATION ORCHESTRATION
  startGeneration: async (toolType, filePath) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error("Please log in to use AI tools.");

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-generation`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tool_type: toolType, input_path: filePath })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to start generation");
    return data;
  },

  // 4. TRIGGER WORKER (Serverless Processing)
  triggerProcessing: async (generationId, isVideo = false) => {
    const funcName = isVideo ? 'process-video' : 'process-image';
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${funcName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generation_id: generationId })
    });
    return await res.json();
  },

  // 5. STATUS CHECKING
  checkStatus: async (generationId) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/check-generation?id=${generationId}`);
    return await res.json();
  },

  // 6. GENERATION HISTORY
  getHistory: async (userId) => {
    return await supabaseClient
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  },

  // 7. DELETE TASK
  deleteGeneration: async (id) => {
    return await supabaseClient
      .from('generations')
      .delete()
      .eq('id', id);
  }
};

window.BackendAPI = BackendAPI;
