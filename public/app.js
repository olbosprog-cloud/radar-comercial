let currentDataMode = 'MOCK';
let currentViewMode = 'table';
let selectedConfigMode = 'MOCK';
let allLeads = [];
let selectedLeadIds = new Set();
let cachedSegments = [];
let cachedCities = [];

// Localização GPS do Usuário
let isGpsActive = false;
let userLatitude = null;
let userLongitude = null;
let selectedRadiusKm = 3;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) window.lucide.createIcons();
  await loadConfig();
  await loadLocationsAndSegments();
  await loadLeads();
  await loadKanbanMetrics();
});

function refreshIcons() {
  if (window.lucide) {
    setTimeout(() => window.lucide.createIcons(), 50);
  }
}

// -------------------------------------------------------------
// CARREGAMENTO DINÂMICO DE CIDADES, SETORES E SEGMENTOS
// -------------------------------------------------------------
async function loadLocationsAndSegments() {
  try {
    // 1. Carrega Segmentos Comerciais e Atividades
    const segRes = await fetch('/api/segments');
    const segJson = await segRes.json();
    if (segJson.success && segJson.segments) {
      cachedSegments = segJson.segments;
      populateSegmentsDropdown(cachedSegments);
    }

    // 2. Carrega Cidades de Goiás (padrão)
    await onUfChanged('GO');
  } catch (err) {
    console.error('Erro ao carregar localidades e segmentos:', err);
  }
}

function populateSegmentsDropdown(segments) {
  const segSelect = document.getElementById('filter-segmento');
  if (!segSelect) return;

  segSelect.innerHTML = segments
    .map((s, idx) => `<option value="${s.id}" ${idx === 0 ? 'selected' : ''}>${s.nome}</option>`)
    .join('');

  if (segments.length > 0) {
    onSegmentChanged(segments[0].id);
  }
}

function onSegmentChanged(segmentId) {
  const segment = cachedSegments.find((s) => s.id === segmentId);
  const actSelect = document.getElementById('filter-atividade');
  if (!segment || !actSelect) return;

  actSelect.innerHTML = segment.atividades
    .map((a, idx) => `<option value="${a.id}" data-cnae="${a.cnae}" data-nome="${a.nome}" ${idx === 0 ? 'selected' : ''}>${a.nome}</option>`)
    .join('');

  if (segment.atividades.length > 0) {
    onActivityChanged(segment.atividades[0].id);
  }
}

function onActivityChanged(activityId) {
  const actSelect = document.getElementById('filter-atividade');
  const selectedOpt = actSelect.options[actSelect.selectedIndex];
  if (!selectedOpt) return;

  const cnae = selectedOpt.getAttribute('data-cnae') || '4744-0/01';
  document.getElementById('filter-cnae').value = cnae;

  const cnaeIndicator = document.getElementById('current-cnae-indicator');
  if (cnaeIndicator) {
    cnaeIndicator.textContent = `CNAE ${cnae}`;
  }
}

async function onUfChanged(uf) {
  try {
    const res = await fetch(`/api/locations/cities?uf=${encodeURIComponent(uf)}`);
    const json = await res.json();
    const citySelect = document.getElementById('filter-cidade');
    if (!citySelect) return;

    if (json.success && json.cities && json.cities.length > 0) {
      cachedCities = json.cities;
      citySelect.innerHTML = json.cities
        .map((c, idx) => `<option value="${c.nome}" ${idx === 0 ? 'selected' : ''}>${c.nome}${c.uf === 'GO' && (c.nome === 'Goiânia' || c.nome === 'Aparecida de Goiânia') ? ' ⭐' : ''}</option>`)
        .join('');

      await onCityChanged(json.cities[0].nome);
    } else {
      citySelect.innerHTML = `<option value="Capital">Capital / Principal</option>`;
      await onCityChanged('Capital');
    }
  } catch (err) {
    console.error('Erro ao atualizar cidades da UF:', err);
  }
}

async function onCityChanged(cityName) {
  const uf = document.getElementById('filter-uf').value;
  const sectorSelect = document.getElementById('filter-bairro');
  const badge = document.getElementById('sectors-count-badge');
  if (!sectorSelect) return;

  sectorSelect.innerHTML = '<option value="TODOS">Carregando setores...</option>';

  try {
    const res = await fetch(`/api/locations/sectors?city=${encodeURIComponent(cityName)}&uf=${encodeURIComponent(uf)}`);
    const json = await res.json();

    if (json.success && json.sectors && json.sectors.length > 0) {
      if (badge) badge.textContent = `${json.sectors.length} setores disponíveis`;

      const options = json.sectors
        .map((s) => `<option value="${s}">${s}</option>`)
        .join('');

      sectorSelect.innerHTML = `
        <option value="TODOS" selected>Todos os Setores (${cityName})</option>
        ${options}
      `;
    } else {
      if (badge) badge.textContent = 'Cidade inteira';
      sectorSelect.innerHTML = `
        <option value="TODOS" selected>Todos os Bairros (${cityName})</option>
        <option value="Centro">Centro Comercial</option>
        <option value="Área Sul">Zona Sul</option>
        <option value="Área Norte">Zona Norte</option>
      `;
    }
  } catch (err) {
    console.error('Erro ao buscar setores da cidade:', err);
    sectorSelect.innerHTML = '<option value="TODOS">Todos os Setores (Cidade Inteira)</option>';
  }
}

// -------------------------------------------------------------
// CONFIGURAÇÕES E ALTERNÂNCIA DE MODOS
// -------------------------------------------------------------
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const json = await res.json();
    if (json.success && json.data) {
      currentDataMode = json.data.data_mode;
      updateModeButtonsUI(currentDataMode);
      document.getElementById('cfg-whatsapp-template').value = json.data.default_whatsapp_template || '';
      if (json.data.google_places_api_key_masked) {
        document.getElementById('cfg-google-key').placeholder = `Chave configurada: ${json.data.google_places_api_key_masked}`;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }
}

function updateModeButtonsUI(mode) {
  const modes = ['mock', 'free', 'prod'];
  modes.forEach((m) => {
    const btn = document.getElementById(`btn-mode-${m}`);
    if (btn) {
      btn.className = 'px-2.5 py-1 rounded-md transition font-medium text-slate-400 hover:text-white';
    }
  });

  const activeId = mode === 'MOCK' ? 'mock' : mode === 'FREE' ? 'free' : 'prod';
  const activeBtn = document.getElementById(`btn-mode-${activeId}`);
  if (activeBtn) {
    activeBtn.className = 'px-2.5 py-1 rounded-md transition font-bold bg-emerald-600 text-white shadow';
  }

  const indicator = document.getElementById('active-mode-label');
  if (indicator) indicator.textContent = mode;
}

async function switchDataMode(newMode) {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_mode: newMode }),
    });
    const json = await res.json();
    if (json.success) {
      currentDataMode = newMode;
      updateModeButtonsUI(newMode);
    }
  } catch (err) {
    alert('Erro ao alternar modo: ' + err.message);
  }
}

function openConfigModal() {
  selectedConfigMode = currentDataMode;
  selectConfigMode(currentDataMode);
  document.getElementById('modal-config').classList.remove('hidden');
}

function closeConfigModal() {
  document.getElementById('modal-config').classList.add('hidden');
}

function selectConfigMode(mode) {
  selectedConfigMode = mode;
  ['mock', 'free', 'prod'].forEach((m) => {
    const el = document.getElementById(`cfg-mode-${m}`);
    if (el) el.classList.remove('border-emerald-500', 'bg-emerald-950/30');
  });

  const active = mode === 'MOCK' ? 'mock' : mode === 'FREE' ? 'free' : 'prod';
  const el = document.getElementById(`cfg-mode-${active}`);
  if (el) el.classList.add('border-emerald-500', 'bg-emerald-950/30');
}

async function saveConfigurations() {
  const googleKey = document.getElementById('cfg-google-key').value;
  const whatsappTemplate = document.getElementById('cfg-whatsapp-template').value;

  const payload = {
    data_mode: selectedConfigMode,
    default_whatsapp_template: whatsappTemplate,
  };
  if (googleKey && googleKey.trim()) {
    payload.google_places_api_key = googleKey.trim();
  }

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) {
      currentDataMode = selectedConfigMode;
      updateModeButtonsUI(currentDataMode);
      closeConfigModal();
      alert('Configurações salvas com sucesso!');
    }
  } catch (err) {
    alert('Erro ao salvar: ' + err.message);
  }
}

// -------------------------------------------------------------
// LOCALIZAÇÃO GPS E BUSCA AO REDOR
// -------------------------------------------------------------
function toggleGpsLocation() {
  if (isGpsActive) {
    disableGpsLocation();
    return;
  }

  if (!navigator.geolocation) {
    alert('Geolocalização não é suportada por este navegador/dispositivo.');
    return;
  }

  const btnLabel = document.getElementById('gps-btn-label');
  const btnToggle = document.getElementById('btn-gps-toggle');
  btnLabel.textContent = 'Obtendo localização GPS...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLatitude = position.coords.latitude;
      userLongitude = position.coords.longitude;
      isGpsActive = true;

      btnToggle.className = 'px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition border border-emerald-500 bg-emerald-600 text-white shadow-md';
      btnLabel.textContent = '📍 Localização GPS Ativa';

      const badge = document.getElementById('gps-status-badge');
      const coordsText = document.getElementById('gps-coords-text');
      const radiusContainer = document.getElementById('gps-radius-container');

      if (badge) badge.classList.remove('hidden');
      if (radiusContainer) radiusContainer.classList.remove('hidden');
      if (coordsText) coordsText.textContent = `Raio de ${selectedRadiusKm}km`;

      const searchBtnText = document.getElementById('btn-search-text');
      if (searchBtnText) searchBtnText.textContent = `Buscar Comércios a ${selectedRadiusKm}km de Mim`;

      refreshIcons();
    },
    (err) => {
      console.warn('Erro ao obter GPS:', err);
      btnLabel.textContent = 'Buscar ao Redor da Minha Localização (GPS)';
      alert('Não foi possível obter sua localização. Permita o acesso ao GPS no navegador do celular ou computador.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

function disableGpsLocation() {
  isGpsActive = false;
  userLatitude = null;
  userLongitude = null;

  const btnToggle = document.getElementById('btn-gps-toggle');
  const btnLabel = document.getElementById('gps-btn-label');
  const badge = document.getElementById('gps-status-badge');
  const radiusContainer = document.getElementById('gps-radius-container');

  if (btnToggle) {
    btnToggle.className = 'px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 shadow';
  }
  if (btnLabel) btnLabel.textContent = 'Buscar ao Redor da Minha Localização (GPS)';
  if (badge) badge.classList.add('hidden');
  if (radiusContainer) radiusContainer.classList.add('hidden');

  const searchBtnText = document.getElementById('btn-search-text');
  if (searchBtnText) searchBtnText.textContent = 'Buscar & Enriquecer Lojistas';
  refreshIcons();
}

function selectRadius(km) {
  selectedRadiusKm = km;
  [1, 2, 3, 5, 10].forEach((r) => {
    const btn = document.getElementById(`btn-radius-${r}`);
    if (btn) {
      if (r === km) {
        btn.className = 'px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 text-white shadow';
      } else {
        btn.className = 'px-2.5 py-1 rounded text-xs font-medium transition text-slate-400 hover:text-white';
      }
    }
  });

  const coordsText = document.getElementById('gps-coords-text');
  if (coordsText) coordsText.textContent = `Raio de ${selectedRadiusKm}km`;

  const searchBtnText = document.getElementById('btn-search-text');
  if (searchBtnText) searchBtnText.textContent = `Buscar Comércios a ${selectedRadiusKm}km de Mim`;
}

// -------------------------------------------------------------
// BUSCA E ENRIQUECIMENTO DE LEADS
// -------------------------------------------------------------
async function handleSearch(event) {
  event.preventDefault();

  const uf = document.getElementById('filter-uf').value;
  const cidade = document.getElementById('filter-cidade').value;
  const bairro = document.getElementById('filter-bairro').value;
  const cnae = document.getElementById('filter-cnae').value;
  const porte = document.getElementById('filter-porte').value;
  const limite = document.getElementById('filter-limite').value;

  const segSelect = document.getElementById('filter-segmento');
  const actSelect = document.getElementById('filter-atividade');
  const segmento = segSelect.options[segSelect.selectedIndex]?.text || '';
  const atividade = actSelect.options[actSelect.selectedIndex]?.getAttribute('data-nome') || '';

  const progressBar = document.getElementById('search-progress');
  const barFill = document.getElementById('progress-bar-fill');
  const barPercent = document.getElementById('progress-percent');
  const statusText = document.getElementById('progress-status-text');
  const btnSearch = document.getElementById('btn-search');

  btnSearch.disabled = true;
  progressBar.classList.remove('hidden');

  barFill.style.width = '30%';
  barPercent.textContent = '30%';
  statusText.innerHTML = isGpsActive
    ? `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-emerald-400"></i> Buscando ${atividade || 'comércios'} ao seu redor (raio ${selectedRadiusKm}km)...`
    : `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-emerald-400"></i> Buscando ${atividade} em ${cidade} (${bairro === 'TODOS' ? 'Geral' : bairro})...`;
  refreshIcons();

  const timer1 = setTimeout(() => {
    barFill.style.width = '65%';
    barPercent.textContent = '65%';
    statusText.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-emerald-400"></i> Enriquecendo telefones, WhatsApp e reputação no mapa...';
    refreshIcons();
  }, 400);

  try {
    const payload = {
      uf,
      cidade: isGpsActive ? 'Localização Atual' : cidade,
      bairro: isGpsActive ? undefined : bairro,
      cnae,
      segmento,
      atividade,
      termo_atividade: atividade,
      porte,
      limite,
      auto_enrich: true,
    };

    if (isGpsActive && userLatitude && userLongitude) {
      payload.latitude = userLatitude;
      payload.longitude = userLongitude;
      payload.raio_km = selectedRadiusKm;
    }

    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    clearTimeout(timer1);

    barFill.style.width = '100%';
    barPercent.textContent = '100%';
    statusText.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i> ${json.total || 0} lojistas encontrados e enriquecidos!`;
    refreshIcons();

    setTimeout(() => {
      progressBar.classList.add('hidden');
      btnSearch.disabled = false;
    }, 700);

    if (json.success) {
      await loadLeads();
      await loadKanbanMetrics();
    } else {
      alert('Erro na busca: ' + json.error);
    }
  } catch (err) {
    clearTimeout(timer1);
    progressBar.classList.add('hidden');
    btnSearch.disabled = false;
    alert('Erro de conexão: ' + err.message);
  }
}

// -------------------------------------------------------------
// LISTAGEM, TABELA E KANBAN
// -------------------------------------------------------------
function setViewMode(mode) {
  currentViewMode = mode;
  const btnTable = document.getElementById('btn-view-table');
  const btnKanban = document.getElementById('btn-view-kanban');
  const viewTable = document.getElementById('view-table');
  const viewKanban = document.getElementById('view-kanban');

  if (mode === 'table') {
    btnTable.className = 'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-slate-800 text-white';
    btnKanban.className = 'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 text-slate-400 hover:text-white';
    viewTable.classList.remove('hidden');
    viewKanban.classList.add('hidden');
  } else {
    btnKanban.className = 'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-slate-800 text-white';
    btnTable.className = 'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 text-slate-400 hover:text-white';
    viewKanban.classList.remove('hidden');
    viewTable.classList.add('hidden');
    renderKanban();
  }
  refreshIcons();
}

async function loadLeads() {
  try {
    const res = await fetch('/api/leads?limit=300');
    const json = await res.json();
    if (json.success) {
      allLeads = json.leads || [];
      renderTable(allLeads);
      if (currentViewMode === 'kanban') {
        renderKanban();
      }
    }
  } catch (err) {
    console.error('Erro ao carregar leads:', err);
  }
}

async function loadKanbanMetrics() {
  try {
    const res = await fetch('/api/leads/kanban');
    const json = await res.json();
    if (json.success && json.metrics) {
      const m = json.metrics;
      document.getElementById('metric-novo-lead').textContent = m.NOVO_LEAD || 0;
      document.getElementById('metric-primeiro-contato').textContent = m.PRIMEIRO_CONTATO || 0;
      document.getElementById('metric-em-negociacao').textContent = m.EM_NEGOCIACAO || 0;
      document.getElementById('metric-cliente-fechado').textContent = m.CLIENTE_FECHADO || 0;
      document.getElementById('metric-descartado').textContent = m.DESCARTADO || 0;

      ['NOVO_LEAD', 'PRIMEIRO_CONTATO', 'EM_NEGOCIACAO', 'CLIENTE_FECHADO', 'DESCARTADO'].forEach((col) => {
        const countEl = document.getElementById(`count-kanban-${col}`);
        if (countEl) countEl.textContent = m[col] || 0;
      });
    }
  } catch (err) {
    console.error('Erro ao carregar métricas:', err);
  }
}

function renderTable(leads) {
  const tbody = document.getElementById('leads-table-body');
  const emptyState = document.getElementById('table-empty-state');

  if (!leads || leads.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  tbody.innerHTML = leads
    .map((lead) => {
      const stars = lead.rating ? `⭐ ${lead.rating.toFixed(1)} (${lead.total_reviews || 0})` : 'Sem reviews';
      const isChecked = selectedLeadIds.has(lead.id) ? 'checked' : '';

      return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="p-3">
          <input type="checkbox" onchange="toggleSelectLead('${lead.id}', this)" ${isChecked} class="rounded bg-slate-800 border-slate-700 text-emerald-500">
        </td>
        <td class="p-3">
          <div class="font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
            <span>${lead.nome_fantasia || lead.razao_social}</span>
            ${lead.distancia_formatada ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30" title="Distância estimada">📍 ${lead.distancia_formatada}</span>` : ''}
            ${lead.origem_fonte === 'BRASIL_API' ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" title="Comércio Real Oficial">Loja Real ✅</span>' : ''}
            ${lead.site_url ? `<a href="${lead.site_url}" target="_blank" class="text-slate-500 hover:text-emerald-400" title="Acessar site"><i data-lucide="globe" class="w-3 h-3"></i></a>` : ''}
          </div>
          <div class="text-[11px] text-slate-400 truncate max-w-xs">${lead.razao_social}</div>
          ${lead.anotacoes ? `<div class="text-[10px] text-amber-300/90 mt-0.5 flex items-center gap-1"><i data-lucide="tag" class="w-2.5 h-2.5"></i> ${lead.anotacoes}</div>` : ''}
        </td>
        <td class="p-3">
          <div class="font-mono text-slate-300 text-[11px]">${lead.cnpj}</div>
          <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">${lead.porte}</span>
        </td>
        <td class="p-3">
          <div class="text-slate-100 font-medium">${lead.bairro || 'Setor Central'}</div>
          <div class="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span>${lead.municipio} - ${lead.uf} ${lead.logradouro ? `• ${lead.logradouro}` : ''}</span>
            ${lead.latitude && lead.longitude ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${lead.latitude},${lead.longitude}" target="_blank" class="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium" title="Abrir rota no Google Maps"><i data-lucide="navigation" class="w-3 h-3"></i> Rota</a>` : ''}
          </div>
        </td>
        <td class="p-3">
          <div class="text-amber-400 text-xs font-semibold">${stars}</div>
          <div class="text-[10px] text-slate-500">${lead.cnae_descricao || lead.origem_fonte}</div>
        </td>
        <td class="p-3">
          ${
            lead.whatsapp_url
              ? `<a href="${lead.whatsapp_url}" target="_blank" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition text-xs font-medium">
                  <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp
                </a>`
              : `<span class="text-slate-500 text-[11px]">Sem tel.</span>`
          }
          <div class="text-[11px] text-slate-400 mt-1">${lead.telefone_comercial || ''}</div>
        </td>
        <td class="p-3">
          <select onchange="updateLeadStatus('${lead.id}', this.value)" class="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500">
            <option value="NOVO_LEAD" ${lead.status === 'NOVO_LEAD' ? 'selected' : ''}>Novo Lead</option>
            <option value="PRIMEIRO_CONTATO" ${lead.status === 'PRIMEIRO_CONTATO' ? 'selected' : ''}>Primeiro Contato</option>
            <option value="EM_NEGOCIACAO" ${lead.status === 'EM_NEGOCIACAO' ? 'selected' : ''}>Em Negociação</option>
            <option value="CLIENTE_FECHADO" ${lead.status === 'CLIENTE_FECHADO' ? 'selected' : ''}>Fechado ✅</option>
            <option value="DESCARTADO" ${lead.status === 'DESCARTADO' ? 'selected' : ''}>Descartado</option>
          </select>
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openNotesModal('${lead.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Editar anotação">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="deleteLead('${lead.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition" title="Excluir">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join('');

  refreshIcons();
}

function renderKanban() {
  const columns = {
    NOVO_LEAD: document.getElementById('kanban-col-NOVO_LEAD'),
    PRIMEIRO_CONTATO: document.getElementById('kanban-col-PRIMEIRO_CONTATO'),
    EM_NEGOCIACAO: document.getElementById('kanban-col-EM_NEGOCIACAO'),
    CLIENTE_FECHADO: document.getElementById('kanban-col-CLIENTE_FECHADO'),
    DESCARTADO: document.getElementById('kanban-col-DESCARTADO'),
  };

  Object.values(columns).forEach((col) => {
    if (col) col.innerHTML = '';
  });

  allLeads.forEach((lead) => {
    const col = columns[lead.status] || columns.NOVO_LEAD;
    if (!col) return;

    const card = document.createElement('div');
    card.className = 'bg-slate-950 border border-slate-800/90 rounded-xl p-3 shadow-md hover:border-slate-700 transition space-y-2';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-1">
        <h4 class="font-bold text-white text-xs leading-tight">${lead.nome_fantasia || lead.razao_social}</h4>
        <div class="flex items-center gap-1 flex-shrink-0">
          ${lead.distancia_formatada ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">📍 ${lead.distancia_formatada}</span>` : ''}
          <span class="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-400">${lead.porte}</span>
        </div>
      </div>
      <p class="text-[11px] text-slate-400">${lead.bairro || 'Centro'}, ${lead.municipio}</p>
      ${lead.rating ? `<div class="text-[10px] text-amber-400 font-medium">⭐ ${lead.rating.toFixed(1)} (${lead.total_reviews || 0} reviews)</div>` : ''}
      
      ${lead.anotacoes ? `<div class="text-[10px] bg-slate-900 border border-slate-800 p-1.5 rounded text-amber-300/80 italic">"${lead.anotacoes}"</div>` : ''}

      <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        ${
          lead.whatsapp_url
            ? `<a href="${lead.whatsapp_url}" target="_blank" class="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="message-circle" class="w-3 h-3"></i> WhatsApp
              </a>`
            : `<span class="text-[10px] text-slate-500">Sem tel.</span>`
        }

        <div class="flex items-center gap-1">
          <button onclick="openNotesModal('${lead.id}')" class="p-1 rounded bg-slate-800 text-slate-400 hover:text-white" title="Anotações">
            <i data-lucide="edit-3" class="w-3 h-3"></i>
          </button>
          <select onchange="updateLeadStatus('${lead.id}', this.value)" class="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[10px] text-slate-300">
            <option value="NOVO_LEAD" ${lead.status === 'NOVO_LEAD' ? 'selected' : ''}>Novo</option>
            <option value="PRIMEIRO_CONTATO" ${lead.status === 'PRIMEIRO_CONTATO' ? 'selected' : ''}>Contato</option>
            <option value="EM_NEGOCIACAO" ${lead.status === 'EM_NEGOCIACAO' ? 'selected' : ''}>Negociação</option>
            <option value="CLIENTE_FECHADO" ${lead.status === 'CLIENTE_FECHADO' ? 'selected' : ''}>Fechado</option>
            <option value="DESCARTADO" ${lead.status === 'DESCARTADO' ? 'selected' : ''}>Descartado</option>
          </select>
        </div>
      </div>
    `;
    col.appendChild(card);
  });

  refreshIcons();
}

async function updateLeadStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (json.success) {
      const idx = allLeads.findIndex((l) => l.id === id);
      if (idx !== -1) allLeads[idx].status = newStatus;
      await loadKanbanMetrics();
      if (currentViewMode === 'kanban') renderKanban();
    }
  } catch (err) {
    alert('Erro ao atualizar status: ' + err.message);
  }
}

async function deleteLead(id) {
  if (!confirm('Deseja realmente remover este lead do radar?')) return;

  try {
    const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      allLeads = allLeads.filter((l) => l.id !== id);
      renderTable(allLeads);
      await loadKanbanMetrics();
      if (currentViewMode === 'kanban') renderKanban();
    }
  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
  }
}

// -------------------------------------------------------------
// ANOTAÇÕES RÁPIDAS
// -------------------------------------------------------------
function openNotesModal(id) {
  const lead = allLeads.find((l) => l.id === id);
  if (!lead) return;

  document.getElementById('modal-notes-lead-id').value = id;
  document.getElementById('modal-notes-title').textContent = `Anotações: ${lead.nome_fantasia || lead.razao_social}`;
  document.getElementById('modal-notes-text').value = lead.anotacoes || '';
  document.getElementById('modal-notes').classList.remove('hidden');
}

function closeNotesModal() {
  document.getElementById('modal-notes').classList.add('hidden');
}

async function saveLeadNotes() {
  const id = document.getElementById('modal-notes-lead-id').value;
  const text = document.getElementById('modal-notes-text').value;

  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anotacoes: text }),
    });
    const json = await res.json();
    if (json.success) {
      const idx = allLeads.findIndex((l) => l.id === id);
      if (idx !== -1) allLeads[idx].anotacoes = text;
      closeNotesModal();
      renderTable(allLeads);
      if (currentViewMode === 'kanban') renderKanban();
    }
  } catch (err) {
    alert('Erro ao salvar anotação: ' + err.message);
  }
}

// -------------------------------------------------------------
// ROTEIRIZAÇÃO GOOGLE MAPS
// -------------------------------------------------------------
function toggleSelectLead(id, checkbox) {
  if (checkbox.checked) {
    selectedLeadIds.add(id);
  } else {
    selectedLeadIds.delete(id);
  }
}

function toggleSelectAll(masterCheckbox) {
  const checkboxes = document.querySelectorAll('#leads-table-body input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    cb.checked = masterCheckbox.checked;
  });

  if (masterCheckbox.checked) {
    allLeads.forEach((l) => selectedLeadIds.add(l.id));
  } else {
    selectedLeadIds.clear();
  }
}

async function generatePresencialRoute() {
  const ids = Array.from(selectedLeadIds);

  try {
    const res = await fetch('/api/leads/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_ids: ids }),
    });

    const json = await res.json();
    if (json.success && json.google_maps_url) {
      const confirmOpen = confirm(
        `Rota gerada para ${json.total_pontos} estabelecimentos comerciais!\n\nDeseja abrir a rota no Google Maps agora?`
      );
      if (confirmOpen) {
        window.open(json.google_maps_url, '_blank');
      }
    } else {
      alert('Nenhum dos leads selecionados possui coordenadas de mapa válidas para roteirização.');
    }
  } catch (err) {
    alert('Erro ao gerar rota: ' + err.message);
  }
}

// -------------------------------------------------------------
// IMPORTAÇÃO DE ARQUIVO CSV / JSON
// -------------------------------------------------------------
function openImportModal() {
  document.getElementById('modal-import').classList.remove('hidden');
}

function closeImportModal() {
  document.getElementById('modal-import').classList.add('hidden');
}

async function submitImport() {
  const content = document.getElementById('import-content').value;
  if (!content || !content.trim()) {
    alert('Insira o conteúdo do CSV ou JSON antes de processar.');
    return;
  }

  try {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_text: content }),
    });
    const json = await res.json();
    if (json.success) {
      alert(`Importação concluída! ${json.total_importados} leads importados.`);
      closeImportModal();
      document.getElementById('import-content').value = '';
      await loadLeads();
      await loadKanbanMetrics();
    } else {
      alert('Erro na importação: ' + json.error);
    }
  } catch (err) {
    alert('Erro de conexão: ' + err.message);
  }
}

// -------------------------------------------------------------
// LIMPEZA DE RESULTADOS E RESET DE FILTROS
// -------------------------------------------------------------
async function clearSearchResults() {
  if (!confirm('Deseja limpar todos os estabelecimentos da busca e esvaziar o CRM?')) {
    return;
  }

  try {
    const res = await fetch('/api/leads/clear', { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      allLeads = [];
      selectedLeadIds.clear();
      renderTable([]);
      await loadKanbanMetrics();
      if (currentViewMode === 'kanban') renderKanban();
    }
  } catch (err) {
    alert('Erro ao limpar: ' + err.message);
  }
}

function resetFilters() {
  document.getElementById('filter-uf').value = 'GO';
  onUfChanged('GO');
  if (cachedSegments.length > 0) {
    document.getElementById('filter-segmento').value = cachedSegments[0].id;
    onSegmentChanged(cachedSegments[0].id);
  }
  document.getElementById('filter-porte').value = 'TODOS';
  document.getElementById('filter-limite').value = '15';
}
