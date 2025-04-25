// ========================
// CONFIGURAÇÕES GLOBAIS
// ========================
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtvK3X3YMZzQe3M1I5lz6AkpNcdR8RomqEPefP_meogRr3LeZXELjeHajUYf4Cv_lFItd7YFf84NLf/pub?gid=52812241&single=true&output=tsv';

const COLUNAS = {
  DATA:           'DATA',
  LIQ_4P:         '4PSHOPPING LÍQ.',
  BRUTO_4P:       '4PSHOPPING BRUTO',
  LIQ_FAST:       'FASTSHOP LÍQ.',
  BRUTO_FAST:     'FASTSHOP BRUTO',
  LIQ_ARMAZEM:    'ARMAZEN LÍQ.',
  BRUTO_ARMAZEM:  'ARMAZEN BRUTO',
  TOTAL_BRUTO:    'TOTAL BRUTO',
  TOTAL_LIQUIDO:  'TOTAL LÍQ.',
  CUSTO:          'CUSTO',
  PAGOS:          'PAGOS'
};

let todosDados = [];
let flatpickrInstance = null;

// ========================
// INICIALIZAÇÃO
// ========================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await carregarDados();
    configurarFlatpickr();
    const hoje = new Date();
    aplicarFiltro(hoje, hoje);
  } catch (err) {
    console.error('Erro na inicialização:', err);
    alert('Não foi possível carregar os dados.');
  }
});

// ========================
// FUNÇÃO: carregarDados
// ========================
async function carregarDados() {
  mostrarCarregando(); // Exibe o carregamento
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const tsv = await response.text();
    const parsed = await new Promise((res, rej) => {
      Papa.parse(tsv, {
        delimiter: '\t',
        header: true,
        skipEmptyLines: true,
        complete: r => res(r.data),
        error: e => rej(e)
      });
    });
    todosDados = parsed.map(processarLinha).filter(d => d);
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    alert('Não foi possível carregar os dados.');
  } finally {
    esconderCarregando(); // Esconde o carregamento após a finalização
  }
}

// Função para mostrar o carregamento
function mostrarCarregando() {
  document.getElementById('loading').style.display = 'flex';
}

// Função para esconder o carregamento
function esconderCarregando() {
  document.getElementById('loading').style.display = 'none';
}

// ========================
// FUNÇÃO: processarLinha
// ========================
function processarLinha(linha) {
  const raw = linha[COLUNAS.DATA];
  if (!raw) return null;
  const [d, m, y] = raw.split(/[-/]/).map(Number);
  // Cria a data no horário local para evitar deslocamentos de timezone
  const dataObj = new Date(y, m - 1, d);
  if (isNaN(dataObj)) return null;
  const parseBRL = s => parseFloat(s.replace('R$', '').replace(/\s/g,'').replace(/\./g,'').replace(',','.')) || 0;
  return {
    data: dataObj,
    liq4P: parseBRL(linha[COLUNAS.LIQ_4P]),
    bruto4P: parseBRL(linha[COLUNAS.BRUTO_4P]),
    liqFast: parseBRL(linha[COLUNAS.LIQ_FAST]),
    brutoFast: parseBRL(linha[COLUNAS.BRUTO_FAST]),
    liqArmazem: parseBRL(linha[COLUNAS.LIQ_ARMAZEM]),
    brutoArmazem: parseBRL(linha[COLUNAS.BRUTO_ARMAZEM]),
    totalBruto: parseBRL(linha[COLUNAS.TOTAL_BRUTO]),
    totalLiquido: parseBRL(linha[COLUNAS.TOTAL_LIQUIDO]),
    custo: parseBRL(linha[COLUNAS.CUSTO]),
    pagos: parseBRL(linha[COLUNAS.PAGOS])
  };
}

// ========================
// FUNÇÃO: configurarFlatpickr
// ========================
function configurarFlatpickr() {
  flatpickrInstance = flatpickr('#datePicker', {
    mode: 'range',
    dateFormat: 'd/m/Y',
    locale: 'pt',
    onChange: dates => dates.length === 2 && aplicarFiltro(dates[0], dates[1])
  });
}

// ========================
// FUNÇÃO: aplicarFiltro
// ========================
function aplicarFiltro(dataInicio, dataFim) {
  const inicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
  const fim = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate(), 23, 59, 59, 999);
  const filtrados = todosDados.filter(item => item.data >= inicio && item.data <= fim);
  atualizarUI(filtrados);
  atualizarResumoPeriodo(inicio, fim);
}

// ========================
// ATUALIZAÇÃO DA UI
// ========================
function atualizarUI(dados) {
  atualizarCards(dados);
  atualizarTabela(dados);
  atualizarResumoFinanceiro(dados);
}

function atualizarCards(dados) {
  const totalCusto = dados.reduce((sum, i) => sum + i.custo, 0);
  const soma = dados.reduce((a, i) => ({
    liq4P: a.liq4P + i.liq4P,
    bruto4P: a.bruto4P + i.bruto4P,
    liqFast: a.liqFast + i.liqFast,
    brutoFast: a.brutoFast + i.brutoFast,
    liqArmazem: a.liqArmazem + i.liqArmazem,
    brutoArmazem: a.brutoArmazem + i.brutoArmazem
  }), {liq4P: 0, bruto4P: 0, liqFast: 0, brutoFast: 0, liqArmazem: 0, brutoArmazem: 0});
  document.getElementById('cards').innerHTML = `
    <div class="card"><h3>4P Shopping</h3>
      <p>Líquido: ${formatarMoeda(soma.liq4P)}</p>
      <p>Bruto: ${formatarMoeda(soma.bruto4P)}</p>
   
    </div>
    <div class="card"><h3>Fast Shop</h3>
      <p>Líquido: ${formatarMoeda(soma.liqFast)}</p>
      <p>Bruto: ${formatarMoeda(soma.brutoFast)}</p>
     
    </div>
    <div class="card"><h3>Armazém</h3>
      <p>Líquido: ${formatarMoeda(soma.liqArmazem)}</p>
      <p>Bruto: ${formatarMoeda(soma.brutoArmazem)}</p>
     
    </div>`;
}

function atualizarTabela(dados) {
  const rows = dados.map(i => `<tr>
    <td>${i.data.toLocaleDateString('pt-BR')}</td>
    <td>${formatarMoeda(i.liq4P)}</td>
    <td>${formatarMoeda(i.bruto4P)}</td>
    <td>${formatarMoeda(i.liqFast)}</td>
    <td>${formatarMoeda(i.brutoFast)}</td>
    <td>${formatarMoeda(i.liqArmazem)}</td>
    <td>${formatarMoeda(i.brutoArmazem)}</td>
    <td>${formatarMoeda(i.custo)}</td>
    <td>${formatarMoeda(i.pagos)}</td>
  </tr>`).join('');
  document.getElementById('dataTable').innerHTML = `
    <thead><tr>
      <th>Data</th><th>4P Líq.</th><th>4P Bruto</th>
      <th>Fast Líq.</th><th>Fast Bruto</th>
      <th>Armazém Líq.</th><th>Armazém Bruto</th>
      <th>Custo</th><th>Pagamentos</th>
    </tr></thead><tbody>${rows}</tbody>`;
}

function atualizarResumoFinanceiro(dados) {
  const totalBruto = dados.reduce((s, i) => s + i.totalBruto, 0);
  const totalLiquido = dados.reduce((s, i) => s + i.totalLiquido, 0);
  const totalCusto = dados.reduce((s, i) => s + i.custo, 0);
  const resultado = totalBruto - totalCusto;
  const classe = resultado >= 0 ? 'profit' : 'loss';
  const texto = resultado >= 0 ? 'Lucro' : 'Prejuízo';
  document.getElementById('profitLoss').innerHTML = `
    <div class="card">
      <h3>Resumo Financeiro</h3>
      <p>Total Bruto: ${formatarMoeda(totalBruto)}</p>
      <p>Total Líquido: ${formatarMoeda(totalLiquido)}</p>
      <p>Total Custo: ${formatarMoeda(totalCusto)}</p>
      <p class="${classe}">Resultado: ${formatarMoeda(Math.abs(resultado))} (${texto})</p>
    </div>`;
}

function atualizarResumoPeriodo(inicio, fim) {
  const fmt = d => d.toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' });
  const texto = inicio.getTime() === fim.getTime()
    ? `Dia ${fmt(inicio)}`
    : `Período ${fmt(inicio)} – ${fmt(fim)}`;
  document.getElementById('selectedRange').textContent = texto;
}

function formatarMoeda(v) {
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
}

// Exemplo para adicionar classes baseadas nos valores
document.querySelectorAll('td:nth-child(n+2)').forEach(cell => {
  const value = parseFloat(cell.innerText.replace('R$', '').replace(/\s/g, '').replace(',', '.'));
  if (value < 0) {
    cell.classList.add('negative');
  } else {
    cell.classList.add('positive');
  }
});
