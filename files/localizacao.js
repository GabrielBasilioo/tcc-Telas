let me, coords = null, mapa, pino;   // coords: { lat, lng, fonte, acc }
const CAMPOS = ['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf'];
const PADRAO = [-23.5505, -46.6333];
const ROTULO = {
    gps: c => `Ponto pelo GPS (precisão ~${Math.round(c.acc || 0)} m)`,
    endereco: () => 'Ponto pelo endereço. Confira e ajuste o pino se precisar.',
    cep: () => 'Ponto aproximado pelo CEP. Informe o número ou ajuste o pino.',
    cidade: () => 'Só achamos a cidade. Ajuste o pino no local exato.',
    manual: () => 'Ponto ajustado por você ✔',
    salvo: () => 'Ponto salvo anteriormente.'
};
const v = id => $(id).value.trim();

function mascaraCep(x) {
    x = x.replace(/\D/g, '').slice(0, 8);
    return x.length > 5 ? x.slice(0, 5) + '-' + x.slice(5) : x;
}

// ---------- mapa ----------
function iniciarMapa(lat, lng, zoom) {
    mapa = L.map('mapa').setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(mapa);
    mapa.on('click', e => definirPonto(e.latlng.lat, e.latlng.lng, 'manual'));
    setTimeout(() => mapa.invalidateSize(), 300);
}

function definirPonto(lat, lng, fonte, zoom, acc) {
    coords = { lat, lng, fonte, acc };
    if (!pino) {
        pino = L.marker([lat, lng], { draggable: true }).addTo(mapa);
        pino.on('dragend', () => { const p = pino.getLatLng(); definirPonto(p.lat, p.lng, 'manual'); });
    } else pino.setLatLng([lat, lng]);
    if (zoom) mapa.setView([lat, lng], zoom);
    $('precisao').textContent = ROTULO[fonte](coords);
}

// ---------- busca de coordenadas ----------
async function nominatim(params) {
    const qs = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'br', ...params });
    const d = await (await fetch('https://nominatim.openstreetmap.org/search?' + qs)).json();
    return d[0] ? { lat: +d[0].lat, lng: +d[0].lon } : null;
}

async function geocodificar() {
    const rua = v('rua'), num = v('numero'), bairro = v('bairro'), cid = v('cidade'), uf = v('uf');
    const cep = v('cep').replace(/\D/g, '');
    const local = `${cid} - ${uf}, Brasil`;
    try {
        let p;
        if (rua && num) {
            if ((p = await nominatim({ street: `${num} ${rua}`, city: cid }))) return { ...p, fonte: 'endereco', zoom: 18 };
            if ((p = await nominatim({ q: `${rua} ${num}, ${bairro}, ${local}` }))) return { ...p, fonte: 'endereco', zoom: 18 };
        }
        if (cep.length === 8) {
            try {
                const d = await (await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`)).json();
                const c = d.location && d.location.coordinates;
                if (c && c.latitude && c.longitude) return { lat: +c.latitude, lng: +c.longitude, fonte: 'cep', zoom: 17 };
            } catch {}
        }
        if (rua && (p = await nominatim({ q: `${rua}, ${bairro}, ${local}` }))) return { ...p, fonte: 'cep', zoom: 17 };
        if (cid && (p = await nominatim({ q: local }))) return { ...p, fonte: 'cidade', zoom: 13 };
    } catch (e) { console.warn('Geocodificação:', e); }
    return null;
}

async function marcarNoMapa() {
    if (coords && (coords.fonte === 'manual' || coords.fonte === 'gps')) return;   // respeita ajuste do usuário
    $('precisao').textContent = 'Procurando no mapa...';
    const p = await geocodificar();
    if (p) definirPonto(p.lat, p.lng, p.fonte, p.zoom);
    else $('precisao').textContent = 'Não achamos o ponto. Toque no mapa para marcar.';
}

// ---------- CEP ----------
$('cep').addEventListener('input', e => {
    e.target.value = mascaraCep(e.target.value);
    if (e.target.value.length === 9) buscarCep(e.target.value.replace('-', ''));
});

async function buscarCep(cep) {
    try {
        const d = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
        if (d.erro) return toast('CEP não encontrado.');
        $('rua').value = d.logradouro || '';
        $('bairro').value = d.bairro || '';
        $('cidade').value = d.localidade || '';
        $('uf').value = d.uf || '';
        if (coords && coords.fonte !== 'manual') coords = null;
        await marcarNoMapa();
        $('numero').focus();
    } catch { toast('Não foi possível buscar o CEP.'); }
}

$('numero').addEventListener('change', () => { if (coords && coords.fonte === 'endereco') coords = null; marcarNoMapa(); });
$('raio').addEventListener('input', () => $('raioVal').textContent = $('raio').value + ' km');

// ---------- GPS ----------
$('gps').onclick = () => {
    if (!navigator.geolocation) return toast('Localização não disponível.');
    toast('Obtendo localização...');
    navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        definirPonto(lat, lng, 'gps', 18, accuracy);
        try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`);
            const a = (await r.json()).address || {};
            if (a.postcode) $('cep').value = mascaraCep(a.postcode);
            $('rua').value = a.road || '';
            $('numero').value = a.house_number || '';
            $('bairro').value = a.suburb || a.neighbourhood || '';
            $('cidade').value = a.city || a.town || a.village || '';
            const uf = (a['ISO3166-2-lvl4'] || '').split('-')[1];
            if (uf) $('uf').value = uf;
        } catch {}
        toast('Localização capturada. Confira o pino e salve.');
    }, () => toast('Permissão de localização não concedida.'),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
};

// ---------- salvar ----------
$('salvar').onclick = async () => {
    if (v('cep').replace(/\D/g, '').length !== 8) return toast('Informe um CEP válido.');
    if (!v('cidade') || v('uf').length !== 2) return toast('Informe cidade e UF.');

    $('salvar').disabled = true;
    if (!coords) await marcarNoMapa();

    const dados = {
        cep: v('cep'), rua: v('rua'), numero: v('numero'), complemento: v('complemento'),
        bairro: v('bairro'), cidade: v('cidade'), uf: v('uf').toUpperCase(),
        raio: Number($('raio').value),
        lat: coords ? coords.lat : null, lng: coords ? coords.lng : null,
        fonte: coords ? coords.fonte : null
    };
    localStorage.setItem('pettok-local', JSON.stringify(dados));
    const erro = await salvarPerfil(me.id, { localizacao: dados });
    $('salvar').disabled = false;
    if (erro) { console.error('Erro ao salvar localização:', erro); return toast('Salvo só neste aparelho: ' + erro.message); }
    toast('Localização salva!');
};

// ---------- início ----------
(async () => {
    me = await usuario();
    if (!me) return;
    const l = (await lerPerfil(me.id, 'localizacao')).localizacao;
    let loc = l && Object.keys(l).length ? l : null;
    if (!loc) { try { loc = JSON.parse(localStorage.getItem('pettok-local')); } catch {} }

    if (loc && loc.lat != null) iniciarMapa(loc.lat, loc.lng, 17);
    else iniciarMapa(PADRAO[0], PADRAO[1], 11);

    if (!loc) return;
    CAMPOS.forEach(c => $(c).value = loc[c] || '');
    $('raio').value = loc.raio || 10;
    $('raioVal').textContent = $('raio').value + ' km';
    if (loc.lat != null) definirPonto(loc.lat, loc.lng, loc.fonte === 'manual' ? 'manual' : 'salvo');
    localStorage.setItem('pettok-local', JSON.stringify(loc));
})();
