const shippingFees = {
  "Até 300 g": { full: 19.95, outros: 31.45 },
  "De 300 g a 500 g": { full: 21.45, outros: 34.05 },
  "De 500 g a 1 kg": { full: 22.45, outros: 36.05 },
  "De 1 kg a 2 kg": { full: 23.45, outros: 42.85 },
  "De 2 kg a 3 kg": { full: 24.95, outros: 55.40 },
  "De 3 kg a 4 kg": { full: 26.95, outros: 59.20 },
  "De 4 kg a 5 kg": { full: 28.45, outros: 61.80 },
  "De 5 kg a 9 kg": { full: 44.45, outros: 69.15 },
  "De 9 kg a 13 kg": { full: 65.95, outros: 94.90 },
  "De 13 kg a 17 kg": { full: 73.45, outros: 125.05 },
  "De 17 kg a 23 kg": { full: 85.95, outros: 140.55 },
  "De 23 kg a 30 kg": { full: 98.95, outros: 146.70 },
  "De 30 kg a 40 kg": { full: 109.45, outros: 150.00 },
  "De 40 kg a 50 kg": { full: 116.95, outros: 155.85 },
  "De 50 kg a 60 kg": { full: 124.95, outros: 167.10 },
  "De 60 kg a 70 kg": { full: 141.45, outros: 181.70 },
  "De 70 kg a 80 kg": { full: 156.95, outros: 194.85 },
  "De 80 kg a 90 kg": { full: 174.95, outros: 207.70 },
  "De 90 kg a 100 kg": { full: 199.95, outros: 228.05 },
  "De 100 kg a 125 kg": { full: 223.45, outros: 244.30 },
  "De 125 kg a 150 kg": { full: 237.45, outros: 260.45 },
  "Maior que 150 kg": { full: 249.45, outros: 273.05 }
};

// Popular faixas de peso
const selIntervalo = document.getElementById('intervaloEnvio');
Object.keys(shippingFees).forEach(key => {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = key;
  selIntervalo.appendChild(opt);
});

let precoBase = 0;

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function calcularBase() {
  // Reset warnings
  document.getElementById('avisoCalculo').style.display = 'none';

  // Valores de entrada
  const tipo = document.getElementById('tipoML').value;
  const custo = parseFloat(document.getElementById('custo').value) || 0;
  const taxaPedido = parseFloat(document.getElementById('taxaPedido').value) || 0;
  const percOp = (parseFloat(document.getElementById('percOperacional').value) || 0) / 100;
  const margemDesejada = (parseFloat(document.getElementById('margem').value) || 0) / 100;
  const comissao = tipo === 'comum' ? 0.14 : 0.18;
  const imposto = 0.065;

  // Validação
  const totalPercent = comissao + imposto + percOp + margemDesejada;
  if (totalPercent >= 1) {
      document.getElementById('avisoCalculo').innerHTML =
          `❌ Soma de porcentagens ultrapassa 100% (${(totalPercent * 100).toFixed(1)}%)`;
      document.getElementById('avisoCalculo').style.display = 'block';
      return;
  }

  // Cálculo preciso
  precoBase = (custo + taxaPedido) / (1 - totalPercent);

  // Exibir resultados
  const resultadoHTML = `
<div class="result-item">
<span>Preço Base:</span>
<span class="result-value">${formatCurrency(precoBase)}</span>
</div>
<div class="result-item">
<span>Tipo:</span>
<span>${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</span>
</div>
<table class="data-table">
<thead>
  <tr><th>Item</th><th>Valor</th><th>%</th></tr>
</thead>
<tbody>
  <tr><td>Custo</td><td>${formatCurrency(custo)}</td><td>-</td></tr>
  <tr><td>Taxa Pedido</td><td>${formatCurrency(taxaPedido)}</td><td>-</td></tr>
  <tr><td>Comissão</td><td>${formatCurrency(precoBase * comissao)}</td><td>${(comissao * 100).toFixed(1)}%</td></tr>
  <tr><td>Impostos</td><td>${formatCurrency(precoBase * imposto)}</td><td>6.5%</td></tr>
  <tr><td>Operacional</td><td>${formatCurrency(precoBase * percOp)}</td><td>${(percOp * 100).toFixed(1)}%</td></tr>
  <tr><td>Margem Líquida</td><td>${formatCurrency(precoBase * margemDesejada)}</td><td>${(margemDesejada * 100).toFixed(1)}%</td></tr>
</tbody>
</table>
`;

  document.getElementById('resultadoBase').innerHTML = resultadoHTML;
  document.getElementById('areaFrete').style.display = precoBase > 79 ? 'block' : 'none';
}

function calcularComFrete() {
  const intervalo = document.getElementById('intervaloEnvio').value;
  const metodo = document.getElementById('metodoEnvio').value;
  const frete = shippingFees[intervalo][metodo];

  // Recalcular com frete
  const tipo = document.getElementById('tipoML').value;
  const custo = parseFloat(document.getElementById('custo').value) || 0;
  const taxaPedido = parseFloat(document.getElementById('taxaPedido').value) || 0;
  const percOp = (parseFloat(document.getElementById('percOperacional').value) || 0) / 100;
  const margemDesejada = (parseFloat(document.getElementById('margem').value) || 0) / 100;
  const comissao = tipo === 'comum' ? 0.14 : 0.18;
  const imposto = 0.065;

  const totalPercent = comissao + imposto + percOp + margemDesejada;
  const precoFinal = (custo + taxaPedido + frete) / (1 - totalPercent);

  // Exibir resultados
  const resultadoHTML = `
<div class="result-item">
<span>Preço Final:</span>
<span class="result-value">${formatCurrency(precoFinal)}</span>
</div>
<div class="result-item">
<span>Frete (${metodo}):</span>
<span>${formatCurrency(frete)}</span>
</div>
<div class="result-item">
<span>Margem Líquida:</span>
<span>${(margemDesejada * 100).toFixed(1)}%</span>
</div>
`;

  document.getElementById('resultadoFinal').innerHTML = resultadoHTML;

  // Aviso de frete
  const avisoFrete = document.getElementById('avisoFrete');
  if (frete > 0.6 * precoFinal) {
      avisoFrete.innerHTML = '⚠️ Frete muito alto! Considere revisar o método de envio';
      avisoFrete.style.display = 'block';
  } else {
      avisoFrete.style.display = 'none';
  }
}