
    // ---- Proteção da página: só entra quem está logado ----
    const SUPABASE_URL = 'https://blpueqrzgqypkabjnvlu.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_b3ObyBNc_RiI5yoq8klo-Q_aSfOYVAg';

    let supabaseClient = null;
    try{
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      supabaseClient.auth.getSession().then(({ data }) => {
        if(!data.session){
          window.location.href = 'login.html';
        }
      });
    } catch(err){
      console.error('Não foi possível conectar ao Supabase:', err);
    }

    // ---- Painel de filtros ----
    const filterOverlay = document.getElementById('filterOverlay');
    const openFilter = document.getElementById('openFilter');
    const closeFilter = document.getElementById('closeFilter');
    const filterBadge = document.getElementById('filterBadge');
    const applyFilters = document.getElementById('applyFilters');
    const clearFilters = document.getElementById('clearFilters');
    const distanceRange = document.getElementById('distanceRange');
    const distanceValue = document.getElementById('distanceValue');

    const selected = {
      tipo: null,
      animais: new Set(),
      servicos: new Set()
  };

    openFilter.addEventListener('click', () => filterOverlay.classList.add('open'));
    closeFilter.addEventListener('click', () => filterOverlay.classList.remove('open'));
    filterOverlay.addEventListener('click', (e) => {
      if(e.target === filterOverlay) filterOverlay.classList.remove('open');
    });

    document.querySelectorAll('.chip-row').forEach(row => {
      const group = row.dataset.group;
  
      row.querySelectorAll('.chip').forEach(chip => {
  
          chip.addEventListener('click', () => {
  
              const value = chip.dataset.value;
  
              // Animais e serviços permitem selecionar vários
              if (group === 'animais' || group === 'servicos') {
  
                  if (selected[group].has(value)) {
  
                      selected[group].delete(value);
                      chip.classList.remove('selected');
  
                  } else {
  
                      selected[group].add(value);
                      chip.classList.add('selected');
  
                  }
  
              }
  
              // Tipo permite apenas uma opção
              else {
  
                  const alreadySelected = chip.classList.contains('selected');
  
                  row.querySelectorAll('.chip')
                      .forEach(c => c.classList.remove('selected'));
  
                  if (!alreadySelected) {
  
                      chip.classList.add('selected');
                      selected[group] = value;
  
                  } else {
  
                      selected[group] = null;
  
                  }
              }
          });
      });
  });

    distanceRange.addEventListener('input', () => {
      distanceValue.textContent = distanceRange.value + ' km';
    });

    function countActiveFilters() {
      let count = 0;
  
      if (selected.tipo) count++;
      count += selected.animais.size;
      count += selected.servicos.size;
  
      return count;
  }

  applyFilters.addEventListener('click', () => {

    const count = countActiveFilters();

    filterBadge.style.display = count > 0 ? 'flex' : 'none';
    filterBadge.textContent = count;

    filterOverlay.classList.remove('open');

    aplicarFiltrosMapa();
});
clearFilters.addEventListener('click', () => {

  // Limpa as seleções
  selected.tipo = null;
  selected.animais.clear();
  selected.servicos.clear();

  // Remove o visual de selecionado de todos os chips
  document
      .querySelectorAll('.chip')
      .forEach(chip => {
          chip.classList.remove('selected');
      });

  // Volta a distância para 10 km
  distanceRange.value = 10;
  distanceValue.textContent = '10 km';

  // Remove o contador
  filterBadge.style.display = 'none';
  filterBadge.textContent = '0';

  // Mostra novamente todos os marcadores
  if (mapa && marcadores.length > 0) {
    marcadores.forEach(marcador => {
        marcador.addTo(mapa);
    });
  }

  // Fecha o painel
  filterOverlay.classList.remove('open');
});







let mapa;
let marcadores = [];

let localizacaoUsuario = null;
let marcadorUsuario = null;

function obterLocalizacaoUsuario() {

  if (!navigator.geolocation) {
      console.log('Geolocalização não disponível neste dispositivo.');
      return;
  }

  navigator.geolocation.getCurrentPosition(

      (position) => {

          localizacaoUsuario = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
          };

          console.log(
              'Localização:',
              localizacaoUsuario.latitude,
              localizacaoUsuario.longitude
          );

          // Cria marcador da localização do usuário
          if (mapa) {

              if (marcadorUsuario) {
                  mapa.removeLayer(marcadorUsuario);
              }

              marcadorUsuario = L.circleMarker(
                  [
                      localizacaoUsuario.latitude,
                      localizacaoUsuario.longitude
                  ],
                  {
                      radius: 8,
                      color: '#2563eb',
                      fillColor: '#3b82f6',
                      fillOpacity: 1,
                      weight: 3
                  }
              ).addTo(mapa);

              marcadorUsuario.bindPopup('Você está aqui');

          }

      },

      (error) => {

          console.log(
              'Não foi possível obter a localização:',
              error.message
          );

          // O mapa continua funcionando normalmente
          localizacaoUsuario = null;
      },

      {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
      }
  );
}

function calcularDistancia(lat1, lon1, lat2, lon2) {

  const R = 6371; // raio da Terra em km

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
  );

  return R * c;
}

async function carregarInstituicoes() {

    const { data, error } = await supabaseClient
        .from('instituicoes')
        .select('*');

    if (error) {
        console.error('Erro ao carregar instituições:', error);
        return;
    }
    window.instituicoes = data;

    mapa = L.map('map').setView(
        [-23.5505, -46.6333],
        12
    );

    L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            attribution: '&copy; OpenStreetMap contributors'
        }
    ).addTo(mapa);

    data.forEach(instituicao => {

        const marcador = L.marker([
            instituicao.latitude,
            instituicao.longitude
        ]).addTo(mapa);

        marcador.bindPopup(`
            <strong>${instituicao.nome}</strong><br>
            ${instituicao.tipo}<br>
            ${instituicao.endereco || ''}<br><br>

            ${instituicao.descricao || ''}<br><br>

            <a
                href="https://www.google.com/maps/dir/?api=1&destination=${instituicao.latitude},${instituicao.longitude}"
                target="_blank">
                Como chegar
            </a>
        `);

        marcadores.push(marcador);
    });
    obterLocalizacaoUsuario();
}



function aplicarFiltrosMapa() {

  if (!window.instituicoes || !mapa) {
      return;
  }

  const distanciaMaxima = Number(distanceRange.value);

  window.instituicoes.forEach((instituicao, index) => {

      let mostrar = true;

      // =========================
      // FILTRO DE TIPO
      // =========================

      if (
          selected.tipo &&
          instituicao.tipo !== selected.tipo
      ) {
          mostrar = false;
      }


      // =========================
      // FILTRO DE ANIMAIS
      // =========================

      if (selected.animais.size > 0) {

          const possuiAnimal =
              (
                  selected.animais.has('caes') &&
                  instituicao.aceita_caes
              ) ||
              (
                  selected.animais.has('gatos') &&
                  instituicao.aceita_gatos
              ) ||
              (
                  selected.animais.has('outros') &&
                  instituicao.aceita_outros
              );

          if (!possuiAnimal) {
              mostrar = false;
          }
      }


      // =========================
      // FILTRO DE SERVIÇOS
      // =========================

      if (selected.servicos.size > 0) {

          if (
              selected.servicos.has('adocao') &&
              !instituicao.oferece_adocao
          ) {
              mostrar = false;
          }

          if (
              selected.servicos.has('doacoes') &&
              !instituicao.recebe_doacoes
          ) {
              mostrar = false;
          }
      }


      // =========================
      // FILTRO DE DISTÂNCIA
      // =========================

      if (localizacaoUsuario) {

          const distancia = calcularDistancia(
              localizacaoUsuario.latitude,
              localizacaoUsuario.longitude,
              instituicao.latitude,
              instituicao.longitude
          );

          console.log(
              instituicao.nome,
              distancia.toFixed(2) + ' km'
          );

          if (distancia > distanciaMaxima) {
              mostrar = false;
          }
      }


      // =========================
      // MOSTRAR / ESCONDER MARCADOR
      // =========================

      const marcador = marcadores[index];

      if (!marcador) {
          return;
      }

      if (mostrar) {
          marcador.addTo(mapa);
      } else {
          mapa.removeLayer(marcador);
      }

  });
}

carregarInstituicoes();