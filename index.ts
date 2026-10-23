// Edge Function: send-push
// Chamada por Database Webhooks (INSERT em likes, messages e followers)
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,          // ex.: mailto:voce@email.com
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  const { table, record: r } = await req.json();
  if (!r) return new Response("sem registro", { status: 200 });

  let destino = "", remetente = "", tipo = "", tag = "", url = "";
  let titulo = "PetTok 🐾", corpo = "";

  if (table === "likes") {
    const { data: pet } = await admin.from("pets").select("user_id").eq("id", r.pet_id).maybeSingle();
    if (!pet) return new Response("pet não encontrado");
    destino = pet.user_id; remetente = r.user_id; tipo = "like";
    tag = "l" + (r.id ?? `${r.user_id}-${r.pet_id}`);
    url = `feed.html?pet=${r.pet_id}`;
  } else if (table === "messages") {
    destino = r.receiver_id; remetente = r.sender_id; tipo = "message";
    tag = "m" + r.id; url = `chat.html?usuario=${r.sender_id}`;
    corpo = r.content ?? "";
  } else if (table === "followers") {
    destino = r.following_id; remetente = r.follower_id; tipo = "follow";
    tag = "f" + (r.id ?? r.follower_id); url = `perfil.html?id=${r.follower_id}`;
  } else {
    return new Response("tabela ignorada");
  }

  if (!destino || destino === remetente) return new Response("nada a enviar");

  const { data: quem } = await admin.from("profiles")
    .select("username, avatar_url, imagem_url").eq("id", remetente).maybeSingle();
  const nome = quem?.username || "Alguém";

  if (tipo === "like") { titulo = "Nova curtida 🐾"; corpo = `${nome} curtiu seu pet`; }
  if (tipo === "message") { titulo = nome; }
  if (tipo === "follow") { titulo = "Novo seguidor 🐾"; corpo = `${nome} começou a seguir você`; }

  const payload = JSON.stringify({
    title: titulo, body: corpo, tag, url, tipo, de: remetente,
    icon: quem?.imagem_url || quem?.avatar_url || "IMG/logo.png",
  });

  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", destino);

  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 86400, urgency: "high" },
      );
    } catch (e: any) {
      // inscrição morta (app desinstalado, permissão revogada): remove
      if (e.statusCode === 404 || e.statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.error("Falha no push:", e.statusCode, e.body);
      }
    }
  }));

  return new Response("ok");
});