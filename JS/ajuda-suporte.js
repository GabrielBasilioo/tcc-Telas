const SUPORTE_URL = "https://blpueqrzgqypkabjnvlu.supabase.co/functions/v1/chat-suport";
const SUPORTE_KEY = "sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg";

const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");
const messages = document.getElementById("messages");
const composer = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");

let aguardando = false;

function addMsg(texto, tipo) {
    const el = document.createElement("div");
    el.className = "msg " + tipo;
    el.textContent = texto;
    messages.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    return el;
}

function addDigitando() {
    const el = document.createElement("div");
    el.className = "msg bot typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    messages.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    return el;
}

function ajustarCampo() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
    sendBtn.disabled = aguardando || !input.value.trim();
}

async function enviar(texto) {
    texto = texto.trim();
    if (!texto || aguardando) return;

    welcome.classList.add("hidden");
    addMsg(texto, "user");
    input.value = "";
    aguardando = true;
    ajustarCampo();

    const digitando = addDigitando();

    try {
        const res = await fetch(SUPORTE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPORTE_KEY
            },
            body: JSON.stringify({ message: texto })
        });

        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        digitando.remove();
        addMsg(data.reply || "Não consegui responder agora. Tente de novo.", "bot");

    } catch (erro) {
        console.error("Erro no atendimento:", erro);
        digitando.remove();
        addMsg("Não consegui me conectar agora. Verifique sua internet e tente de novo.", "bot error");
    }

    aguardando = false;
    ajustarCampo();
    input.focus();
}

composer.addEventListener("submit", (e) => {
    e.preventDefault();
    enviar(input.value);
});

input.addEventListener("input", ajustarCampo);

// Enter envia, Shift+Enter quebra linha
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviar(input.value);
    }
});

document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => enviar(chip.textContent));
});