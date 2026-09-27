/* Calculadora de Fruição LP
   Descrição: No sistema você informa a data de início para a LP. O sistema calcula sozinho:
   total de dias, término da fruição e prazo para abertura do processom tendo como opcionao uma consulta sobre a validade do quinquênio também*/

const MS_DIA = 24 * 60 * 60 * 1000;
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_ALERTA = 15;   // faltando até 15 dias para o limite: amarelo
const ICONES = { ok: '🟢', atencao: '🟡', vencido: '🔴' };

const porId = (id) => document.getElementById(id);


/* As contas são feitas em UTC para que fuso horário não mudem o resultado. */

function dataValida(iso) {                   // só aceita datas completas, entre 1900 e 2100
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const ano = Number(iso.slice(0, 4));
    return ano >= 1900 && ano <= 2100;
}

function isoParaData(iso) {                   // "2026-11-11" -> Date
    const [ano, mes, dia] = iso.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
}

function formatarDataBR(data) {               // Date -> "11/11/2026"
    const [ano, mes, dia] = data.toISOString().slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
}

function somarDias(data, dias) {
    return new Date(data.getTime() + dias * MS_DIA);
}

function diferencaEmDias(inicio, fim) {
    return Math.round((fim - inicio) / MS_DIA);
}

function hojeIso() {                          // data de hoje no formato do input date
    const h = new Date();
    const mes = String(h.getMonth() + 1).padStart(2, '0');
    const dia = String(h.getDate()).padStart(2, '0');
    return `${h.getFullYear()}-${mes}-${dia}`;
}

function agoraTexto() {                       // "21/09/2026 15:48"
    return new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '');
}

function textoDias(n) {
    return `${n} ${n === 1 ? 'dia' : 'dias'}`;
}

function lerNumero(id) { 
    const campo = porId(id);
    const valor = parseInt(campo.value, 10) || 0;
    return Math.min(Math.max(valor, Number(campo.min)), Number(campo.max));
}


// ---------- Regra do prazo de abertura ----------
// Regra administrativa: o processo deve ser aberto até o último dia do mês, referente a 2 meses antes do mês que o servidor quer fruir

function calcularLimiteAbertura(inicio) {
    return new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() - 2, 0));
}

function avaliarPrazo(inicio, referencia) {
    const limite = calcularLimiteAbertura(inicio);
    const restantes = diferencaEmDias(referencia, limite);

    let classe, status, detalhe;
    if (restantes < 0) {
        classe = 'vencido';
        status = 'Prazo expirado';
        detalhe = `Já se passaram ${textoDias(-restantes)} da data limite`;
    } else if (restantes <= DIAS_ALERTA) {
        classe = 'atencao';
        status = 'Dentro do prazo, mas próximo ao vencimento.';
        detalhe = restantes === 0 ? 'Hoje é o último dia para abrir!' : `restam apenas ${textoDias(restantes)} até a data limite`;
    } else {
        classe = 'ok';
        status = 'Dentro do prazo';
        detalhe = `Você ainda tem ${textoDias(restantes)} até a data limite`;
    }

    return { limite, classe, status, detalhe };
}

// ---------- Cálculo automático ----------
let consultaAtual = null;

function atualizar() {
    // Lê os valores originais da Fruição
    let meses = lerNumero('qtd-meses');
    let dias = lerNumero('qtd-dias');
    let total = meses * 30 + dias;

    if (total > 90) {
        mostrarAviso('O limite máximo permitido por solicitação é de 90 dias (3 meses).');
        meses = 3; dias = 0;
        porId('qtd-meses').value = meses;
        porId('qtd-dias').value = dias;
        total = 90;
    }

    porId('badge-total').textContent = `${total} ${total === 1 ? 'dia total' : 'dias totais'}`;

    const inicioIso = porId('data-inicio').value;
    const isFruicaoValida = dataValida(inicioIso);
    let dataInicioStr = '', terminoStr = '', dataRetornoStr = '', dataLimiteStr = '';
    let terminoDataObj = null;
    let classePrazo = 'neutro';

    // --- 2. LÓGICA DA FRUIÇÃO (Só roda se tiver data) ---
    if (isFruicaoValida) {
        const inicio = isoParaData(inicioIso);
        terminoDataObj = total > 0 ? somarDias(inicio, total - 1) : null;
        terminoStr = terminoDataObj ? formatarDataBR(terminoDataObj) : '';
        porId('badge-termino').textContent = `Término: ${terminoStr || '--/--/----'}`;
        
        let retornoData = terminoDataObj ? somarDias(terminoDataObj, 1) : null;
        let obsRetorno = '';
        if (retornoData) {
            if (retornoData.getUTCDay() === 6) { retornoData = somarDias(retornoData, 2); }
            else if (retornoData.getUTCDay() === 0) { retornoData = somarDias(retornoData, 1); }
        }
        
        const dataHoje = new Date();
        const referencia = new Date(Date.UTC(dataHoje.getFullYear(), dataHoje.getMonth(), dataHoje.getDate()));
        const prazo = avaliarPrazo(inicio, referencia);
        classePrazo = prazo.classe;

        dataInicioStr = formatarDataBR(inicio);
        dataLimiteStr = formatarDataBR(prazo.limite);
        dataRetornoStr = retornoData ? formatarDataBR(retornoData) + obsRetorno : '';

        // Atualiza painel principal
        porId('resultado').className = `resultado ${prazo.classe}`;
        porId('res-limite').textContent = dataLimiteStr;
        porId('res-status').textContent = `${ICONES[prazo.classe]} ${prazo.status}`;
        porId('res-status').hidden = false;
        porId('res-total').textContent = textoDias(total);
        porId('res-inicio').textContent = dataInicioStr;
        porId('res-termino').textContent = terminoStr || '--/--/----';
        porId('res-retorno').textContent = dataRetornoStr || '--/--/----';
        porId('res-detalhes').hidden = false;
        porId('res-vazio').hidden = true;
        
    } else {
        // Se fruição vazia, deixa o topo neutro e limpo (SEM usar 'return')
        porId('badge-termino').textContent = 'Término: --/--/----';
        porId('resultado').className = 'resultado neutro';
        porId('res-limite').textContent = '--/--/----';
        porId('res-status').hidden = true;
        porId('res-detalhes').hidden = true;
        porId('res-vazio').textContent = 'Informe a data de início da fruição para ver o prazo.';
        porId('res-vazio').hidden = false;
    }

    // --- LÓGICA DO QUINQUÊNIO  ---
    const chkQuinquenio = porId('chk-quinquenio').checked;
    const dataQuinquenioIso = porId('data-quinquenio').value;
    const isQuinquenioValido = chkQuinquenio && dataValida(dataQuinquenioIso);
    
    let textoPeriodo = '', textoSituacao = '', textoDisponivel = '';

   if (isQuinquenioValido) {
        // A data digitada é o marco inicial do ciclo seguinte (ex: 01/05/2020)
        const dataDigitada = isoParaData(dataQuinquenioIso);
        
        //  O término real do quinquênio é o dia ANTERIOR à data digitada (ex: 30/04/2020)
        const fimQ = new Date(dataDigitada.getTime());
        fimQ.setUTCDate(fimQ.getUTCDate() - 1);
        
        // O início do quinquênio: retrocede 5 anos a partir do término real
        const inicioQ = new Date(fimQ.getTime());
        inicioQ.setUTCFullYear(inicioQ.getUTCFullYear() - 5);
        // Avança 1 dia para fechar o ciclo exato (ex: 01/05/2015)
        inicioQ.setUTCDate(inicioQ.getUTCDate() + 1);

        const limiteLei = new Date(Date.UTC(2015, 11, 30)); 
        textoPeriodo = `${formatarDataBR(inicioQ)} a ${formatarDataBR(fimQ)}`;
        const hojeUTC = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
        
        // Para a regra especial da PGE, usamos a data digitada ou o fim real
        const marcoEspecialInicio = new Date(Date.UTC(2011, 0, 1));
        const marcoEspecialFim = new Date(Date.UTC(2017, 9, 13));
        const isRegraEspecial = (fimQ.getTime() >= marcoEspecialInicio.getTime() && fimQ.getTime() <= marcoEspecialFim.getTime());
        
        porId('icone-regra-especial').hidden = true;

        if (hojeUTC.getTime() <= dataDigitada.getTime()) {
            textoSituacao = '🟡 Em formação (Quinquênio incompleto)';
            textoDisponivel = formatarDataBR(dataDigitada);
            porId('res-q-disponivel').textContent = textoDisponivel;
            porId('lbl-q-disponivel').hidden = false;
            porId('res-q-disponivel').hidden = false;
        } 
        else if (isRegraEspecial) {
            textoSituacao = '🔴 Prescrito desde 14/10/2022';
            porId('lbl-q-disponivel').hidden = true;
            porId('res-q-disponivel').hidden = true;
            porId('icone-regra-especial').hidden = false;
        }
        else if (fimQ.getTime() <= limiteLei.getTime()) {
            textoSituacao = '🟢 Direito Adquirido (Sem expiração)';
            porId('lbl-q-disponivel').hidden = true;
            porId('res-q-disponivel').hidden = true;
        } 
        else {
            // Expiração legal
            const expQ = new Date(Date.UTC(dataDigitada.getUTCFullYear() + 5, dataDigitada.getUTCMonth(), dataDigitada.getUTCDate()));
            
            if (hojeUTC.getTime() > expQ.getTime()) {
                textoSituacao = `🔴 Prescrito desde ${formatarDataBR(expQ)}`;
            } else {
                if (terminoDataObj && terminoDataObj.getTime() > expQ.getTime()) {
                    textoSituacao = `🟡 Válido até ${formatarDataBR(expQ)} (Atenção: A fruição solicitada ultrapassa esta data!)`;
                } else {
                    textoSituacao = `🟢 Válido até ${formatarDataBR(expQ)}`;
                }
            }
            porId('lbl-q-disponivel').hidden = true;
            porId('res-q-disponivel').hidden = true;
        }

        porId('res-q-periodo').textContent = textoPeriodo;
        porId('res-q-situacao').textContent = textoSituacao;
        porId('bloco-quinquenio-resultado').hidden = false;
    } else {
        porId('bloco-quinquenio-resultado').hidden = true;
        porId('icone-regra-especial').hidden = true;
    }

  // --- 4. HABILITAÇÃO DOS BOTÕES E MONTAGEM DA CÓPIA ---
    const temAlgoValido = isFruicaoValida || isQuinquenioValido;
    
    // Habilita os botões sempre que houver qualquer dado válido na tela, sem restrições
    habilitarBotoes(temAlgoValido);

    const linhas = [];
    const nomeServidor = porId('nome-servidor').value.trim();
    if (nomeServidor) linhas.push(['Servidor(a)', nomeServidor]);

    if (isFruicaoValida) {
        linhas.push(['Data da fruição', dataInicioStr]);
        if (total > 0) {
            linhas.push(['Período solicitado', textoDias(total)]);
            linhas.push(['Término da fruição', terminoStr]);
            linhas.push(['Retorno ao trabalho', dataRetornoStr]);
        }
        linhas.push(['Data limite para abertura', dataLimiteStr]);
    }

    if (isQuinquenioValido) {
        if (isFruicaoValida) linhas.push(['---------------------------', '']);
        linhas.push(['Período Aquisitivo', textoPeriodo]);
        linhas.push(['Situação Legal', textoSituacao]); 
        if (textoDisponivel) linhas.push(['Disponível a partir de', textoDisponivel]);
    }

    consultaAtual = linhas.length > 0 
        ? linhas.map(([rotulo, valor]) => valor === '' ? rotulo : `${rotulo}: ${valor}`).join('\n') 
        : null;
}

function habilitarBotoes(ativo) {
    porId('btn-copiar').disabled = !ativo;
    porId('btn-baixar').disabled = !ativo;
}

// Recalcula sempre que algum campo muda
['nome-servidor', 'data-inicio', 'qtd-meses', 'qtd-dias', 'data-quinquenio'].forEach((id) => {
    porId(id).addEventListener('input', atualizar);
});

// Listener para a caixinha (Checkbox) do Quinquênio
porId('chk-quinquenio').addEventListener('change', (e) => {
    porId('box-quinquenio').hidden = !e.target.checked;
    atualizar();
});

// Ao sair do campo numérico, corrige valores fora do limite
['qtd-meses', 'qtd-dias'].forEach((id) => {
    porId(id).addEventListener('change', () => {
        porId(id).value = lerNumero(id);
        atualizar();
    });
});

// Botões − e +
document.querySelectorAll('.btn-passo').forEach((botao) => {
    botao.addEventListener('click', () => {
        const campo = porId(botao.dataset.alvo);
        const novo = (parseInt(campo.value, 10) || 0) + Number(botao.dataset.delta);
        if (novo >= Number(campo.min) && novo <= Number(campo.max)) {
            campo.value = novo;
            atualizar();
        }
    });
});

porId('btn-refazer').addEventListener('click', () => {
    // 1. Limpa os campos da Fruição
    porId('nome-servidor').value = '';
    porId('data-inicio').value = '';
    porId('qtd-meses').value = 1;
    porId('qtd-dias').value = 0;    
    
    // 2. Limpa e esconde os campos e resultados do Quinquênio
    porId('chk-quinquenio').checked = false;
    porId('box-quinquenio').hidden = true;
    porId('data-quinquenio').value = '';
    porId('bloco-quinquenio-resultado').hidden = true;
    porId('icone-regra-especial').hidden = true;
    porId('res-q-periodo').textContent = '';
    porId('res-q-situacao').textContent = '';
    porId('res-q-disponivel').textContent = '';
    porId('lbl-q-disponivel').hidden = true;

    // 3. Atualiza a tela e foca no primeiro campo
    atualizar();
    porId('nome-servidor').focus();
});


// ---------- Copiar resultado ----------
async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
    } catch (erro) {
        // Plano B para navegadores que bloqueiam a área de transferência
        const area = document.createElement('textarea');
        area.value = texto;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
    }
    mostrarAviso('Resultado copiado.');
}

let temporizadorAviso;
function mostrarAviso(mensagem) {
    const aviso = porId('aviso');
    aviso.textContent = mensagem;
    aviso.classList.add('visivel');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove('visivel'), 2200);
}

porId('btn-copiar').addEventListener('click', () => {
    if (consultaAtual) copiarTexto(consultaAtual);
});


// ---------- Baixar resultado (PDF / Impressão) ----------
porId('btn-baixar').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && window.innerWidth < 650) {
        // Empacota os dados atuais para enviar para a nova aba
        const params = new URLSearchParams({
            print: 'true',
            nome: porId('nome-servidor').value,
            inicio: porId('data-inicio').value,
            m: porId('qtd-meses').value,
            d: porId('qtd-dias').value,
            chk: porId('chk-quinquenio').checked,
            dq: porId('data-quinquenio').value
        });
        
        // Abre a nova aba já passando os dados na URL
        chrome.tabs.create({ url: `index.html?${params.toString()}` });
    } else {
        window.print();
    }
});

window.addEventListener('beforeprint', () => {
    const nome = porId('nome-servidor').value.trim();
    const identificacao = nome ? `<br>Servidor(a): ${nome}` : '';
    porId('impressao-cabecalho').innerHTML = `<span class="texto-simulador">Calculadora de Fruição — Emitido em ${agoraTexto()}</span>${identificacao}`;
});

// ---------- Inicialização e Verificação de Impressão ----------
const urlParams = new URLSearchParams(window.location.search);

// Resgata os dados da URL e preenche os campos (Serve tanto para Impressão quanto Tela Cheia)
if (urlParams.has('inicio') || urlParams.has('nome')) {
    porId('nome-servidor').value = urlParams.get('nome') || '';
    porId('data-inicio').value = urlParams.get('inicio') || '';
    porId('qtd-meses').value = urlParams.get('m') || '1';
    porId('qtd-dias').value = urlParams.get('d') || '0';
    
    const chkMarcado = urlParams.get('chk') === 'true';
    porId('chk-quinquenio').checked = chkMarcado;
    porId('box-quinquenio').hidden = !chkMarcado;
    porId('data-quinquenio').value = urlParams.get('dq') || '';
}

// Separa a ação de Imprimir da ação normal/Tela cheia
if (urlParams.get('print') === 'true') {
    atualizar();
    // Aciona a impressão após um breve intervalo para o CSS carregar
    setTimeout(() => window.print(), 500);
} else {
    // Esconde o botão se a página já estiver numa aba completa (tela cheia)
    if (window.innerWidth > 800) {
        const btnExpandir = porId('btn-expandir');
        if (btnExpandir) btnExpandir.style.display = 'none';
    } else {
        // Se estiver no painel lateral, o botão funciona para abrir uma nova aba
        porId('btn-expandir')?.addEventListener('click', () => {
            // Pega os dados atuais para não perder o que já foi digitado
            const params = new URLSearchParams({
                nome: porId('nome-servidor').value,
                inicio: porId('data-inicio').value,
                m: porId('qtd-meses').value,
                d: porId('qtd-dias').value,
                chk: porId('chk-quinquenio').checked,
                dq: porId('data-quinquenio').value
            });
            chrome.tabs.create({ url: `index.html?${params.toString()}` });
            // Fecha automaticamente o painel lateral
            window.close();
        });
    }
    
    // Atualiza para gerar os cálculos com base nos dados resgatados
    atualizar();
}