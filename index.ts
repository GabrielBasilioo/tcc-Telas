// Edge Function: excluir-conta
// Deploy com "Verify JWT" DESLIGADO (o token é validado aqui dentro).
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// apaga todos os arquivos de uma pasta do Storage
async function limparPasta(bucket: string, pasta: string) {
  const { data } = await admin.storage.from(bucket).list(pasta, { limit: 1000 });
  if (data && data.length) {
    await admin.storage.from(bucket).remove(data.map((f) => `${pasta}/${f.name}`));
  }
}

async function tentar(nome: string, fn: () => PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await fn();
  if (error) console.warn(nome, error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u.user) return json({ erro: "não autorizado" }, 401);
  const id = u.user.id;

  const { data: pets } = await admin.from("pets").select("id").eq("user_id", id);
  const petIds = (pets ?? []).map((p) => p.id);

  if (petIds.length) await tentar("likes dos meus pets", () => admin.from("likes").delete().in("pet_id", petIds));
  await tentar("likes", () => admin.from("likes").delete().eq("user_id", id));
  await tentar("mensagens enviadas", () => admin.from("messages").delete().eq("sender_id", id));
  await tentar("mensagens recebidas", () => admin.from("messages").delete().eq("receiver_id", id));
  await tentar("seguindo", () => admin.from("followers").delete().eq("follower_id", id));
  await tentar("seguidores", () => admin.from("followers").delete().eq("following_id", id));
  await tentar("push", () => admin.from("push_subscriptions").delete().eq("user_id", id));
  await tentar("pets", () => admin.from("pets").delete().eq("user_id", id));

  await limparPasta("videos", id);
  // Se a foto de perfil fica em outro bucket, adicione: await limparPasta("NOME_DO_BUCKET", id);

  await tentar("perfil", () => admin.from("profiles").delete().eq("id", id));

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return json({ erro: error.message }, 500);

  return json({ ok: true });
});