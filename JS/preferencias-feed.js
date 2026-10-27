// Ordena os pets do feed pelas preferências salvas (nada é escondido).
// Uso no feed.js:  lista = await PetTokPrefs.ordenar(lista, supabaseClient);
window.PetTokPrefs = (() => {
    const n = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const esp = s => { s = n(s); return /cao|cachorr|dog/.test(s) ? 'cachorro' : /gat|cat/.test(s) ? 'gato' : 'outro'; };
    const gen = s => { s = n(s); return s.startsWith('f') ? 'femea' : s.startsWith('m') ? 'macho' : ''; };
    const faixa = i => { i = Number(i); if (isNaN(i)) return ''; return i <= 1 ? 'filhote' : i <= 4 ? 'jovem' : i <= 8 ? 'adulto' : 'idoso'; };

    function carregar() { try { return JSON.parse(localStorage.getItem('pettok-prefs')) || {}; } catch { return {}; } }

    async function sincronizar(sb) {
        try {
            const { data: u } = await sb.auth.getUser();
            if (!u.user) return;
            const { data } = await sb.from('profiles').select('preferencias').eq('id', u.user.id).maybeSingle();
            if (data && data.preferencias) localStorage.setItem('pettok-prefs', JSON.stringify(data.preferencias));
        } catch {}
    }

    function nota(p, pr) {
        let s = 0;
        if ((pr.especie || []).includes(esp(p.especie))) s += 3;
        if ((pr.genero || []).includes(gen(p.genero))) s += 2;
        if ((pr.idade || []).includes(faixa(p.idade))) s += 2;
        ['vacinado', 'castrado', 'microchipado'].forEach(k => { if (pr[k] && p[k]) s += 1; });
        return s;
    }

    async function ordenar(lista, sb) {
        if (sb) await sincronizar(sb);
        const pr = carregar();
        return lista.map((p, i) => ({ p, i, s: nota(p, pr) }))
            .sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.p);
    }

    return { carregar, sincronizar, nota, ordenar };
})();