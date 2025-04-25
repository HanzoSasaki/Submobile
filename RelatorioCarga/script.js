const TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSLMvW_H4myKI7V-V8jdljuss8Ck-bfHlGEsiTF04CBwvmTd6MM0XFTi_6lEce69ZZhlb7pmaxN_xh1/pub?output=tsv";

fetch(TSV_URL)
  .then(response => response.text())
  .then(tsv => {
    const linhas = tsv.trim().split('\n').map(linha => linha.split('\t'));
    const cabecalho = linhas[0];

    const idxData = cabecalho.findIndex(col => col.toLowerCase().includes("data"));
    const idxLucro = cabecalho.findIndex(col => col.toLowerCase().includes("lucro"));
    const idxValor = cabecalho.findIndex(col => col.toLowerCase().includes("valor"));

    if (idxData === -1 || idxValor === -1 || idxLucro === -1) {
      throw new Error('Coluna "Data", "Valor" ou "Lucro" não encontrada.');
    }

    const totaisPorDia = {};

    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i];
      const dataCompleta = linha[idxData]?.trim();
      if (!dataCompleta) continue;

      const data = dataCompleta.split(' ')[0];
      const valor = parseFloat(linha[idxValor]?.replace(',', '.'));
      if (isNaN(valor)) continue;

      const lucro = parseFloat(linha[idxLucro]?.replace(',', '.')) || 0;

      if (!totaisPorDia[data]) {
        totaisPorDia[data] = { total: 0, count: 0, margem: 0 };
      }

      totaisPorDia[data].total += valor;
      totaisPorDia[data].margem += lucro;
      totaisPorDia[data].count += 1;
    }

    // Gerar tabela
    let htmlTotais = "<table><thead><tr><th>Data</th><th>Total Carregado</th><th>Margem Bruta</th><th>Total de Itens</th></tr></thead><tbody>";
    Object.keys(totaisPorDia).sort().forEach(data => {
      const { total, count, margem } = totaisPorDia[data];
      htmlTotais += `
        <tr>
          <td>${data}</td>
          <td>R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td>R$ ${margem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td>${count}</td>
        </tr>
      `;
    });
    htmlTotais += "</tbody></table>";

    document.getElementById("resumoTotais").innerHTML = htmlTotais;

    // Gerar gráfico
    const datas = Object.keys(totaisPorDia).sort();
    const totais = datas.map(data => totaisPorDia[data].total);
    const margens = datas.map(data => totaisPorDia[data].margem);

    const ctx = document.getElementById('graficoComparativo').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: datas,
        datasets: [
          {
            label: 'Total Carregado (R$)',
            data: totais,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Margem Bruta (R$)',
            data: margens,
            backgroundColor: 'rgba(255, 206, 86, 0.7)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Comparativo de Valores por Dia'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'R$ ' + context.raw.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'R$ ' + value.toLocaleString('pt-BR');
              }
            }
          }
        }
      }
    });
  })
  .catch(err => {
    console.error(err);
    document.getElementById("resumoTotais").innerHTML = '<div class="erro">Erro ao carregar os dados.</div>';
  });
