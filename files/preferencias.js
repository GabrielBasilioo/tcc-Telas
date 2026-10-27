const OPC = {
    especie: [['cachorro', 'Cães'], ['gato', 'Gatos'], ['outro', 'Outros']],
    genero: [['macho', 'Macho'], ['femea', 'Fêmea']],
    idade: [['filhote', 'Filhote (até 1)'], ['jovem', 'Jovem (2–4)'], ['adulto', 'Adulto (5–8)'], ['idoso', 'Idoso (9+)']]
};
const VAZIO = { especie: [], genero: [], idade: [], vacinado: false, castrado: false, microchipado: false };
let me, prefs = JSON.parse(JSON.stringify(VAZIO));

function desenhar() {
    [['especie', 'gEspecie'], ['genero', 'gGenero'], ['idade', 'gIdade']].forEach(([k, id]) => {
        $(id).innerHTML = OPC[k].map(([v, t]) =>
            `<button type="button" class="chip${prefs[k].includes(v) ? ' on' : ''}" data-k="${k}" data-v="${v}">${t}</button>`).join('');
    });
    document.querySelectorAll('.tgl').forEach(el => el.classList.toggle('on', !!prefs[el.dataset.k]));
}

document.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) {
        const { k, v } = chip.dataset, a = prefs[k];
        a.includes(v) ? a.splice(a.indexOf(v), 1) : a.push(v);
        chip.classList.toggle('on');
        return;
    }
    const t = e.target.closest('.tgl');
    if (t) { prefs[t.dataset.k] = !prefs[t.dataset.k]; t.classList.toggle('on'); }
});

$('salvar').onclick = async () => {
    localStorage.setItem('pettok-prefs', JSON.stringify(prefs));   // já vale neste aparelho
    $('salvar').disabled = true;
    const erro = await salvarPerfil(me.id, { preferencias: prefs });
    $('salvar').disabled = false;
    if (erro) { console.error('Erro ao salvar preferências:', erro); return toast('Salvo só neste aparelho: ' + erro.message); }
    toast('Preferências salvas!');
};

$('limpar').onclick = () => { prefs = JSON.parse(JSON.stringify(VAZIO)); desenhar(); };

(async () => {
    me = await usuario();
    if (!me) return;
    const db = (await lerPerfil(me.id, 'preferencias')).preferencias;
    let origem = db && Object.keys(db).length ? db : null;
    if (!origem) { try { origem = JSON.parse(localStorage.getItem('pettok-prefs')); } catch {} }
    prefs = Object.assign(JSON.parse(JSON.stringify(VAZIO)), origem || {});
    desenhar();
})();
