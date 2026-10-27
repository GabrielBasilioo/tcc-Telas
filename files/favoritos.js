const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const grupo = s => { s = norm(s); return /cao|cachorr|dog/.test(s) ? 'cachorro' : /gat|cat/.test(s) ? 'gato' : 'outro'; };
const CORACAO = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.8 5 6.1 5c2 0 3.3 1 3.9 2.2h4C14.6 6 15.9 5 17.9 5c3.3 0 5.2 3.4 3.7 6.8C19.5 16.4 12 21 12 21Z"/></svg>';
let me, itens = [], filtro = 'todos';

function tempo(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 3600) return 'agora há pouco';
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    if (s < 2592000) return `há ${Math.floor(s / 86400)} d`;
    return 'em ' + new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function cartao(i) {
    const p = i.pet;
    const m = p.media_type && p.media_type.startsWith('video')
        ? `<video class="fav-thumb" src="${esc(p.media_url)}#t=0.1" muted preload="metadata"></video>`
        : `<img class="fav-thumb" src="${esc(p.media_url)}" alt="">`;
    const meta = [p.raca, p.idade != null && p.idade !== '' ? `${p.idade} anos` : '', p.genero].filter(Boolean).map(esc).join(' · ');
    const tags = [p.vacinado && 'Vacinado', p.castrado && 'Castrado', p.microchipado && 'Microchipado']
        .filter(Boolean).map(t => `<span class="tag">${t}</span>`).join('');
    return `<div class="fav-item" data-id="${esc(p.id)}">${m}
        <div class="fav-info">
            <div class="fav-name">${esc(p.nome)}</div>
            <div class="fav-meta">${meta}</div>
            ${tags ? `<div class="fav-tags">${tags}</div>` : ''}
            ${i.data ? `<div class="fav-time">Curtido ${tempo(i.data)}</div>` : ''}
        </div>
        <button class="fav-remove" data-id="${esc(p.id)}" aria-label="Remover dos favoritos">${CORACAO}</button>
    </div>`;
}

function render() {
    const lista = itens.filter(i => filtro === 'todos' || i.grupo === filtro);
    const el = $('lista');
    if (!lista.length) {
        el.innerHTML = `<div class="empty"><div style="font-size:40px;margin-bottom:8px">🐾</div>${
            itens.length ? 'Nenhum pet nessa categoria.' : 'Você ainda não curtiu nenhum pet.<br>Curta no feed para ele aparecer aqui.'}</div>`;
        return;
    }
    const dias = i => i.data ? (Date.now() - new Date(i.data)) / 864e5 : Infinity;
    const temData = lista.some(i => i.data);
    const faixas = temData
        ? [['Esta semana', i => dias(i) <= 7], ['Este mês', i => dias(i) > 7 && dias(i) <= 30], ['Anteriores', i => dias(i) > 30]]
        : [['Todos os favoritos', () => true]];
    el.innerHTML = faixas.map(([t, f]) => {
        const l = lista.filter(f);
        return l.length ? `<div class="sec-title">${t} · ${l.length}</div>${l.map(cartao).join('')}` : '';
    }).join('');
}

$('abas').addEventListener('click', e => {
    const b = e.target.closest('.filter-tab');
    if (!b) return;
    document.querySelectorAll('.filter-tab').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    filtro = b.dataset.f;
    render();
});

$('lista').addEventListener('click', async e => {
    const rm = e.target.closest('.fav-remove');
    if (rm) {
        e.stopPropagation();
        const id = rm.dataset.id;
        const { error } = await sbc.from('likes').delete().eq('user_id', me.id).eq('pet_id', id);
        if (error) { console.error(error); return toast('Não foi possível remover.'); }
        itens = itens.filter(i => String(i.pet.id) !== String(id));
        render();
        return toast('Removido dos favoritos.');
    }
    const it = e.target.closest('.fav-item');
    if (it) location.href = 'feed.html?pet=' + encodeURIComponent(it.dataset.id);
});

(async () => {
    me = await usuario();
    if (!me) return;
    const { data: lk, error } = await sbc.from('likes').select('*').eq('user_id', me.id);
    if (error) { $('lista').innerHTML = '<div class="empty">Não foi possível carregar seus favoritos.</div>'; return; }

    const ids = [...new Set((lk || []).map(l => l.pet_id))];
    if (ids.length) {
        const { data: pets } = await sbc.from('pets').select('*').in('id', ids);
        const porId = {};
        (pets || []).forEach(p => porId[p.id] = p);
        itens = (lk || []).filter(l => porId[l.pet_id])
            .map(l => ({ pet: porId[l.pet_id], data: l.created_at || null, grupo: grupo(porId[l.pet_id].especie) }))
            .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
    }
    render();
})();
