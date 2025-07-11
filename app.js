// ========== PWA Instalação ==========
let deferredPrompt;
const btnInstall = document.getElementById('btn-install');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.style.display = 'inline-block';
});
btnInstall?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt = null;
    btnInstall.style.display = 'none';
  }
});
// ========== Tema escuro/claro ==========
const html = document.documentElement;
const btnTheme = document.getElementById('btn-theme');
function setTheme(theme) {
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
    btnTheme.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    html.removeAttribute('data-theme');
    btnTheme.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
}
btnTheme.onclick = () => setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
if (localStorage.getItem('theme') === 'dark') setTheme('dark');

// ========== Gestão de Produtos ==========
function getProdutos() {
  return JSON.parse(localStorage.getItem('produtos') || "[]");
}
function setProdutos(lista) {
  localStorage.setItem('produtos', JSON.stringify(lista));
}
function renderProdutos() {
  const lista = getProdutos();
  const div = document.getElementById('lista-produtos');
  const select = document.getElementById('produto-select');
  div.innerHTML = '';
  select.innerHTML = `<option value="">Escolha um produto</option>`;
  lista.forEach((prod, idx) => {
    div.innerHTML += `
      <div class="produto-item">
        <span><b>${prod.nome}</b> | Estoque: ${prod.estoque ?? 0}</span>
        <button onclick="removerProduto(${idx})">Excluir</button>
      </div>
    `;
    select.innerHTML += `<option value="${idx}">${prod.nome}</option>`;
  });
}
window.removerProduto = function(idx) {
  let lista = getProdutos();
  lista.splice(idx, 1);
  setProdutos(lista);
  renderProdutos();
};
document.getElementById('form-produto').onsubmit = function(e) {
  e.preventDefault();
  let nome = document.getElementById('nome-produto').value.trim();
  let estoque = parseInt(document.getElementById('estoque-produto').value) || 0;
  if (!nome) return alert('Nome do produto obrigatório!');
  let lista = getProdutos();
  lista.push({ nome, estoque });
  setProdutos(lista);
  renderProdutos();
  this.reset();
};
renderProdutos();

// Preenche produto selecionado
document.getElementById('produto-select').onchange = function() {
  let idx = this.value;
  if (idx === '') return;
  let produto = getProdutos()[idx];
  if (produto) {
    document.getElementById('custo').value = produto.custo ?? '';
  }
};

// ========== Lógica da Calculadora ==========
window.toggleLucro = function() {
  let tipo = document.querySelector('input[name="tipoLucro"]:checked').value;
  document.getElementById('lucro').style.display = tipo === "fixo" ? "block" : "none";
  document.getElementById('lucro_perc').style.display = tipo === "percentual" ? "block" : "none";
};
toggleLucro();

function calcular({ custo, frete, outros, taxa_mkt, comissao, imposto, tipoLucro, lucro, lucro_perc }) {
  let custoTotal = custo + frete + outros;
  let somaTaxas = taxa_mkt + comissao + imposto;
  let lucroFinal = 0;
  if (tipoLucro === "fixo") {
    lucroFinal = lucro;
  } else {
    lucroFinal = custoTotal * (lucro_perc / 100);
  }
  let precoVenda = (custoTotal + lucroFinal) / (1 - somaTaxas);
  let valorTaxas = precoVenda * somaTaxas;
  let lucroLiquido = precoVenda - custoTotal - valorTaxas;
  return {
    precoVenda, lucroLiquido, custoTotal, valorTaxas,
    resumo: {
      custo, frete, outros, taxa_mkt, comissao, imposto, tipoLucro, lucro, lucro_perc
    }
  };
}

// Histórico e relatórios
function getHistorico() {
  return JSON.parse(localStorage.getItem('historico') || "[]");
}
function setHistorico(lista) {
  localStorage.setItem('historico', JSON.stringify(lista));
}
function addHistorico(obj) {
  let lista = getHistorico();
  lista.unshift(obj);
  if (lista.length > 30) lista.length = 30;
  setHistorico(lista);
}
function renderResumoMensal() {
  let hist = getHistorico();
  let meses = {};
  hist.forEach(h => {
    let d = new Date(h.data);
    let key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!meses[key]) meses[key] = { vendas:0, lucro:0, custos:0 };
    meses[key].vendas += h.precoVenda;
    meses[key].lucro += h.lucroLiquido;
    meses[key].custos += h.custoTotal;
  });
  let html = `<h4>Resumo mensal:</h4>`;
  for (let m in meses) {
    html += `
      <div><b>${m}</b> - Total vendas: <b>R$${meses[m].vendas.toFixed(2)}</b> | 
      Lucro: <b>R$${meses[m].lucro.toFixed(2)}</b> | Custos: <b>R$${meses[m].custos.toFixed(2)}</b></div>
    `;
  }
  document.getElementById('resumo-mensal').innerHTML = html;
}
function renderGraficos() {
  let hist = getHistorico().reverse();
  if (!hist.length) return;
  let labels = hist.map((h, i) => h.produto ? h.produto : `#${i+1}`);
  let lucro = hist.map(h => h.lucroLiquido);
  let preco = hist.map(h => h.precoVenda);
  if (window.graficoLucro) window.graficoLucro.destroy();
  if (window.graficoPreco) window.graficoPreco.destroy();
  let ctx1 = document.getElementById('grafico-lucro').getContext('2d');
  let ctx2 = document.getElementById('grafico-preco').getContext('2d');
  window.graficoLucro = new Chart(ctx1, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Lucro Líquido', data: lucro }] }
  });
  window.graficoPreco = new Chart(ctx2, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Preço Venda', data: preco }] }
  });
}

// ========== Evento principal do formulário ==========
document.getElementById('calc-form').onsubmit = function(e) {
  e.preventDefault();
  let produtoIdx = document.getElementById('produto-select').value;
  let produtoNome = produtoIdx !== '' ? (getProdutos()[produtoIdx].nome) : '';
  let custo = parseFloat(document.getElementById('custo').value) || 0;
  let frete = parseFloat(document.getElementById('frete').value) || 0;
  let outros = parseFloat(document.getElementById('outros').value) || 0;
  let taxa_mkt = (parseFloat(document.getElementById('taxa_mkt').value) || 0) / 100;
  let comissao = (parseFloat(document.getElementById('comissao').value) || 0) / 100;
  let imposto = (parseFloat(document.getElementById('imposto').value) || 0) / 100;
  let tipoLucro = document.querySelector('input[name="tipoLucro"]:checked').value;
  let lucro = parseFloat(document.getElementById('lucro').value) || 0;
  let lucro_perc = parseFloat(document.getElementById('lucro_perc').value) || 0;
  let resultado = calcular({ custo, frete, outros, taxa_mkt, comissao, imposto, tipoLucro, lucro, lucro_perc });
  document.getElementById('resultado').innerHTML = `
    <b>Preço de venda ideal:</b> R$ ${resultado.precoVenda.toFixed(2)}<br>
    <b>Lucro líquido:</b> R$ ${resultado.lucroLiquido.toFixed(2)}<br>
    <b>Custo total:</
    <b>Custo total:</b> R$ ${resultado.custoTotal.toFixed(2)}<br>
    <b>Valor das taxas:</b> R$ ${resultado.valorTaxas.toFixed(2)}<br>
    <small>Simulação para: <b>${produtoNome || '(sem produto)'}</b></small>
  `;
  // Salvar histórico
  addHistorico({
    produto: produtoNome,
    data: new Date().toISOString(),
    precoVenda: resultado.precoVenda,
    lucroLiquido: resultado.lucroLiquido,
    custoTotal: resultado.custoTotal
  });
  renderGraficos();
  renderResumoMensal();
};

renderGraficos();
renderResumoMensal();

// ========== Simulador de Preço Mínimo ==========
document.getElementById('btn-preco-minimo').onclick = function() {
  let custo = parseFloat(document.getElementById('custo').value) || 0;
  let frete = parseFloat(document.getElementById('frete').value) || 0;
  let outros = parseFloat(document.getElementById('outros').value) || 0;
  let taxa_mkt = (parseFloat(document.getElementById('taxa_mkt').value) || 0) / 100;
  let comissao = (parseFloat(document.getElementById('comissao').value) || 0) / 100;
  let imposto = (parseFloat(document.getElementById('imposto').value) || 0) / 100;
  let somaTaxas = taxa_mkt + comissao + imposto;
  let custoTotal = custo + frete + outros;
  let lucroMin = prompt('Qual lucro mínimo desejado? (em R$)');
  lucroMin = parseFloat(lucroMin) || 0;
  let precoMinimo = (custoTotal + lucroMin) / (1 - somaTaxas);
  let valorTaxas = precoMinimo * somaTaxas;
  let lucroFinal = precoMinimo - custoTotal - valorTaxas;
  document.getElementById('simulador-minimo').innerHTML = `
    <b>Preço mínimo para lucro de R$${lucroMin.toFixed(2)}:</b> <span style="color:var(--roxo)"><b>R$ ${precoMinimo.toFixed(2)}</b></span>
    <br><b>Lucro líquido real:</b> R$ ${lucroFinal.toFixed(2)}<br>
    <b>Taxas totais:</b> R$ ${valorTaxas.toFixed(2)}
  `;
};

// ========== PWA Service Worker ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js');
  });
}
