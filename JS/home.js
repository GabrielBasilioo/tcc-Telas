
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

    const selected = { tipo: null, porte: null, idade: null, saude: new Set() };

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

          if(group === 'saude'){
            // múltipla escolha
            if(selected.saude.has(value)){
              selected.saude.delete(value);
              chip.classList.remove('selected');
            } else {
              selected.saude.add(value);
              chip.classList.add('selected');
            }
          } else {
            // escolha única por grupo
            const alreadySelected = chip.classList.contains('selected');
            row.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
            if(!alreadySelected){
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

    function countActiveFilters(){
      let count = 0;
      if(selected.tipo) count++;
      if(selected.porte) count++;
      if(selected.idade) count++;
      count += selected.saude.size;
      return count;
    }

    applyFilters.addEventListener('click', () => {
      const count = countActiveFilters();
      filterBadge.style.display = count > 0 ? 'flex' : 'none';
      filterBadge.textContent = count;
      filterOverlay.classList.remove('open');

      // Isso aqui é onde, futuramente, os filtros são usados para
      // consultar a tabela de pets no Supabase e atualizar os pins do mapa.
      console.log('Filtros aplicados:', {
        tipo: selected.tipo,
        porte: selected.porte,
        idade: selected.idade,
        saude: Array.from(selected.saude),
        distanciaKm: distanceRange.value
      });
    });

    clearFilters.addEventListener('click', () => {
      selected.tipo = null;
      selected.porte = null;
      selected.idade = null;
      selected.saude.clear();
      document.querySelectorAll('.chip.selected').forEach(c => c.classList.remove('selected'));
      distanceRange.value = 10;
      distanceValue.textContent = '10 km';
      filterBadge.style.display = 'none';
    });
