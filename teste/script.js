const TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtvK3X3YMZzQe3M1I5lz6AkpNcdR8RomqEPefP_meogRr3LeZXELjeHajUYf4Cv_lFItd7YFf84NLf/pub?gid=52812241&single=true&output=tsv';

let raw = [];
let charts = {};

// Converte "R$ x.xxx,xx" em número
const parseBRL = s => parseFloat(s.replace(/[R$\s.]/g, '').replace(',', '.'));

// Carrega e prepara dados
function loadData(callback) {
  fetch(TSV_URL)
    .then(r => r.text())
    .then(tsv => {
      const lines = tsv.trim().split('\n').slice(1);
      raw = lines.map(l => {
        const [d, l1, b1, l2, b2, l3, b3] = l.split('\t');
        const date = new Date(d.split('-').reverse().join('-'));
        return {
          date,
          values: {
            '4pL': parseBRL(l1), '4pB': parseBRL(b1),
            'fastL': parseBRL(l2), 'fastB': parseBRL(b2),
            'armaL': parseBRL(l3), 'armaB': parseBRL(b3)
          }
        };
      });
      callback();
    })
    .catch(err => console.error('Erro ao carregar TSV:', err));
}

// Cria ou atualiza gráfico
function renderChart(id, type, data, options = {}) {
  if (charts[id]) {
    charts[id].data = data;
    charts[id].options = { responsive: true, animation: { duration: 800 }, ...options };
    charts[id].update();
  } else {
    const ctx = document.getElementById(id).getContext('2d');
    charts[id] = new Chart(ctx, {
      type,
      data,
      options: { responsive: true, animation: { duration: 800 }, ...options }
    });
  }
}

// Filtra pares (label, valor) com valor >= 1
function filterData(labels, values) {
  const fLabels = [], fValues = [];
  labels.forEach((lbl, i) => {
    if (values[i] >= 1) {
      fLabels.push(lbl);
      fValues.push(values[i]);
    }
  });
  return { fLabels, fValues };
}

// Somatório de um array numérico
const sum = arr => arr.reduce((s, v) => s + v, 0);

// Média de um array numérico
const avg = arr => arr.length ? +(sum(arr) / arr.length).toFixed(2) : 0;

// Calcula margem percentual
const calcMargin = (netArr, grossArr) =>
  netArr.map((v, i) => grossArr[i] ? +(v / grossArr[i] * 100).toFixed(2) : 0);

// Prepara e desenha todos os gráficos
function drawAll(range) {
  const [start, end] = range;
  const filtered = raw.filter(r => r.date >= start && r.date <= end);
  const datesAll = filtered.map(r => r.date.toLocaleDateString());

  // Extrai arrays de valores
  const mapVal = key => filtered.map(r => r.values[key]);
  const net4p = mapVal('4pL'), gross4p = mapVal('4pB');
  const netFs = mapVal('fastL'), grossFs = mapVal('fastB');
  const netAr = mapVal('armaL'), grossAr = mapVal('armaB');

// 1) Cria um formatter reutilizável
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  
  // Função de callback para ticks
  function tickCallback(value) {
    return currencyFormatter.format(value);
  }
  
  // Função de callback para tooltip
  function tooltipLabel(context) {
    const v = context.parsed.y ?? context.parsed; // v3 vs v2
    return `${context.dataset.label}: ${currencyFormatter.format(v)}`;
  }
  
  // 2) Configurações comuns de options
  const commonOptions = {
    scales: {
      y: {
        ticks: {
          callback: tickCallback
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: tooltipLabel
        }
      }
    }
  };
  
  // 3) Renderize cada gráfico passando as options
  let d1 = filterData(datesAll, net4p), d2 = filterData(datesAll, gross4p);
  renderChart('chart-4p', 'line', {
    labels: d1.fLabels,
    datasets: [
      { label: 'Líquido', data: d1.fValues, fill: false },
      { label: 'Bruto',   data: d2.fValues, fill: false }
    ]
  }, commonOptions);
  
  d1 = filterData(datesAll, netFs); d2 = filterData(datesAll, grossFs);
  renderChart('chart-fast', 'line', {
    labels: d1.fLabels,
    datasets: [
      { label: 'Líquido', data: d1.fValues, fill: false },
      { label: 'Bruto',   data: d2.fValues, fill: false }
    ]
  }, commonOptions);
  
  d1 = filterData(datesAll, netAr); d2 = filterData(datesAll, grossAr);
  renderChart('chart-armazem', 'line', {
    labels: d1.fLabels,
    datasets: [
      { label: 'Líquido', data: d1.fValues, fill: false },
      { label: 'Bruto',   data: d2.fValues, fill: false }
    ]
  }, commonOptions);
  
  // ... e o mesmo para os comparativos de barras:
  
  const commonDates = datesAll.filter((_, i) =>
    net4p[i] >= 1 && netFs[i] >= 1 && netAr[i] >= 1
  );
  const net4c = net4p.filter(v => v >= 1),
        gross4c = gross4p.filter(v => v >= 1);
  const netFSc = netFs.filter(v => v >= 1),
        grossFSc = grossFs.filter(v => v >= 1);
  const netArc = netAr.filter(v => v >= 1),
        grossArc = grossAr.filter(v => v >= 1);
  
  renderChart('chart-net-compare', 'bar', {
    labels: commonDates,
    datasets: [
      { label: '4PShopping', data: net4c },
      { label: 'Fastshop',   data: netFSc },
      { label: 'Armazém',    data: netArc }
    ]
  }, commonOptions);
  
  renderChart('chart-gross-compare', 'bar', {
    labels: commonDates,
    datasets: [
      { label: '4PShopping', data: gross4c },
      { label: 'Fastshop',   data: grossFSc },
      { label: 'Armazém',    data: grossArc }
    ]
  }, commonOptions);
  

  // 3) Participação percentual ao longo do tempo
  const pct = arr => {
    const t = sum(arr);
    return arr.map(v => t ? +(v / t * 100).toFixed(2) : 0);
  };
  renderChart('chart-net-share', 'line', {
    labels: commonDates,
    datasets: [
      { label: '4PShopping %', data: pct(net4c), fill: false },
      { label: 'Fastshop %',   data: pct(netFSc), fill: false },
      { label: 'Armazém %',    data: pct(netArc), fill: false }
    ]
  });
  renderChart('chart-gross-share', 'line', {
    labels: commonDates,
    datasets: [
      { label: '4PShopping %', data: pct(gross4c), fill: false },
      { label: 'Fastshop %',   data: pct(grossFSc), fill: false },
      { label: 'Armazém %',    data: pct(grossArc), fill: false }
    ]
  });

  // ──────────── NOVOS GRÁFICOS ──────────── //

  // 4) Evolução da margem líquida por loja ao longo do tempo
  const margin4c = calcMargin(net4c, gross4c);
  const marginFSc = calcMargin(netFSc, grossFSc);
  const marginArc = calcMargin(netArc, grossArc);
  renderChart('chart-margin-evolution', 'line', {
    labels: commonDates,
    datasets: [
      { label: '4PShopping %', data: margin4c, fill: false },
      { label: 'Fastshop %',   data: marginFSc, fill: false },
      { label: 'Armazém %',    data: marginArc, fill: false }
    ]
  }, {
    scales: {
      y: { min: 0, max: 100, title: { display: true, text: '%' } }
    }
  });

  // 5) Pizza da participação acumulada (Líquido e Bruto)
// calcula total para uso interno no tooltip
const makePieOptions = () => ({
    plugins: {
      tooltip: {
        callbacks: {
          label: ctx => {
            const data = ctx.dataset.data;
            const sum = data.reduce((acc, v) => acc + v, 0);
            const value = ctx.raw;
            const pct  = ((value / sum) * 100).toFixed(2) + '%';
            return `${ctx.label}: ${pct}`;
          }
        }
      }
    }
  });
  
  // dados acumulados
  const totalNet   = [ sum(net4p), sum(netFs),  sum(netAr) ];
  const totalGross = [ sum(gross4p), sum(grossFs), sum(grossAr) ];
  
  // pie líquido com tooltip em %
  renderChart('chart-pie-net', 'pie', {
    labels: ['4PShopping', 'Fastshop', 'Armazém'],
    datasets: [{ data: totalNet }]
  }, makePieOptions());
  
  // pie bruto com tooltip em %
  renderChart('chart-pie-gross', 'pie', {
    labels: ['4PShopping', 'Fastshop', 'Armazém'],
    datasets: [{ data: totalGross }]
  }, makePieOptions());
  

  // 6) Comparativo total Bruto x Líquido por loja (barra lado a lado)

  
  function tickCallback(value) {
    return currencyFormatter.format(value);
  }
  
  function tooltipLabel(context) {
    const v = context.parsed.y ?? context.parsed;
    return `${context.dataset.label}: ${currencyFormatter.format(v)}`;
  }
  

   
  
  renderChart('chart-bruto-vs-liquido', 'bar', {
    labels: ['4PShopping', 'Fastshop', 'Armazém'],
    datasets: [
      { label: 'Bruto',   data: totalGross },
      { label: 'Líquido', data: totalNet   }
    ]
  }, commonOptions);
  

  // 7) Margem líquida média por loja (barra)
  const avgMargins = [
    avg(margin4c),
    avg(marginFSc),
    avg(marginArc)
  ];
  renderChart('chart-margin-average', 'bar', {
    labels: ['4PShopping', 'Fastshop', 'Armazém'],
    datasets: [{ label: 'Margem Líquida Média (%)', data: avgMargins }]
  }, {
    scales: {
      y: { min: 0, max: 100, title: { display: true, text: '%' } }
    }
  });
}

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
  loadData(() => {
    const dates = raw.map(r => r.date);
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    flatpickr('#date-range', {
      mode: 'range',
      dateFormat: 'd-m-Y',
      defaultDate: [min, max],
      onClose: sel => sel.length === 2 && drawAll(sel)
    });
    document.getElementById('date-range').disabled = false;
    drawAll([min, max]);
  });

  document.getElementById('reload-btn')
    .addEventListener('click', () => location.reload());
});
