/**
 * Tipos utilitários JSDoc para melhor legibilidade/intellisense.
 * Estes comentários não alteram a execução, apenas documentam.
 * @typedef {{
 *   id: string | null,
 *   nome: string,
 *   sobrenome: string,
 *   email: string,
 *   telefone: string,
 *   data_nasc: string,
 *   produto: string | null,
 *   nomeCl: string,
 *   comite: string | null
 * }} ParametrosURL
 * @typedef {{ id: string|number, text: string, status?: string }} OptionItem
 * @typedef {{ label: string, config: { settings: { options?: OptionItem[], possible_types?: string[] } } }} Campo
 */

// Estruturas de produto com sigla e nome por extenso para facilitar matching.
//Formato dos itens: { sigla: 'gv', nome: 'Voluntário Globa' }
const siglaProduto = [
    { sigla: 'gv', nome: 'Voluntário Global', idprograma: 7 },
    { sigla: 'gtast', nome: 'Talento Global Short Term', idprograma: 8 },
    { sigla: 'gtalt', nome: 'Talento Global Mid e Long Term', idprograma: 8 },
    { sigla: 'gte', nome: 'Professor Global', idprograma: 9 }
];
const idiomasDiv = document.getElementById("idiomas");

const cursosDiv = document.getElementById("cursos"); // Renamed from 'cursos'
const atuacaoDiv = document.getElementById("areas-atuacao"); // Renamed from 'atuacao'
const mercadoDiv = document.getElementById("niveis-mercado"); // Renamed from 'mercado'
const idiomaSelecionados = [];

// Global variables for selected IDs (single values, not arrays)
let selectedProductId = null;
let selectedCommitteeId = null;
let selectedCommitteeText = null;
let selectedAdSourceId = null;

let itemID = 0;
let todasOpcoes_idioma;
let campos;
let universidades;
let parametros; // Armazena os parâmetros da URL
let todosProdutos;
let todasAiesecs;
let todasOpcoes_Como_Conheceu;

/**
 * Mapeia produto (texto) para slug usado no set de universidades (gv/gt).
 * @param {string} textoProduto
 * @returns {'gv'|'gt'|'unknown'}
 */
function getProdutoSlug(textoProduto) {
    const slug = String(textoProduto || '').toLowerCase();
    if (slug.includes('gv') || slug.includes('volunt')) return 'gv';
    if (slug.includes('gt') || slug.includes('talento')) return 'gt';
    return 'unknown';
}

/**
 * Retorna array de opções de universidade no formato esperado por buildCombo.
 * @param {'gv'|'gt'|'unknown'} produtoSlug
 * @returns {{id:string|number,text:string}[]}
 */
function getUniversidadesPorProduto(produtoSlug) {
    const optionKey = produtoSlug === 'gv' ? 'ogv' : 'ogt';

    let source = universidades;
    if (universidades?.universidades) {
        source = universidades.universidades;
    }

    if (!source || (typeof source !== 'object' && !Array.isArray(source))) {
        return [];
    }

    const normalizeId = (item, name) => {
        if (!item && !name) return null;

        if (typeof item === 'string') {
            return item;
        }

        const possibleId = item[optionKey] || item[optionKey?.toLowerCase?.()] || item['ogv'] || item['ogt'] || item.id || name;
        if (possibleId == null) return null;
        return String(possibleId).trim();
    };

    const normalizeText = (item, name) => {
        const rawText = item?.nome || item?.text || item?.label || name || '';
        const lower = String(rawText).toLowerCase();

        if (lower.includes('mc bazi')) {
            return 'Aiesec no Brasil';
        }

        return String(rawText).trim();
    };

    let lista = [];

    if (Array.isArray(source)) {
        lista = source
            .filter(u => u && (u.nome || u.text || u.label))
            .map(u => {
                const text = normalizeText(u);
                let id = normalizeId(u, text);

                if (text.toLowerCase().includes('aiesec no brasil')) {
                    id = 'Aiesec no Brasil';
                }

                return {
                    id: id || text,
                    text
                };
            });
    } else {
        lista = Object.entries(source || {})
            .filter(([nome, data]) => nome && data)
            .map(([nome, data]) => {
                const text = normalizeText(data, nome);
                let id = normalizeId(data, nome);

                if (text.toLowerCase().includes('aiesec no brasil')) {
                    id = 'Aiesec no Brasil';
                }

                return {
                    id: id || text,
                    text
                };
            });
    }

    if (!lista.length) {
        lista = [
            { id: 'FIAP', text: 'FIAP' },
            { id: 'USP', text: 'USP' },
            { id: 'Mackenzie', text: 'Mackenzie' },
            { id: 'PUC', text: 'PUC' },
            { id: 'UNESP', text: 'UNESP' },
            { id: 'UNICAMP', text: 'UNICAMP' }
        ];
    }

    if (!lista.some(item => String(item.text).toLowerCase() === 'outra')) {
        lista.push({ id: 'Outra', text: 'Outra' });
    }

    return lista;
}

function getSelectedProductSlug() {
    // Primeiro tenta via selectedProductId e estruturada todosProdutos
    if (selectedProductId && Array.isArray(todosProdutos)) {
        const produto = todosProdutos.find(p => String(p.id) === String(selectedProductId));
        if (produto && produto.text) return getProdutoSlug(produto.text);
    }

    // Fallback: procura no select HTML
    const produtoSelect = document.getElementById('produto');
    if (produtoSelect && produtoSelect.options.length > 0) {
        const selectedOpt = produtoSelect.options[produtoSelect.selectedIndex];
        if (selectedOpt && selectedOpt.text) {
            return getProdutoSlug(selectedOpt.text);
        }
    }

    return 'unknown';
}

function getNomeCLFromUniversidade(universidadeText, produtoSlug) {
    if (!universidadeText || !produtoSlug) return null;

    // Usar a estrutura enviada pelo backend: universidades[universidade]
    const source = universidades?.universidades || universidades;
    if (!source || typeof source !== 'object') return null;

    const normalized = universidadeText.trim().toLowerCase();
    const key = Object.keys(source).find(k => String(k).trim().toLowerCase() === normalized);
    const entry = key ? source[key] : source[universidadeText];
    if (!entry || typeof entry !== 'object') return null;

    const optKey = produtoSlug === 'gv' ? 'ogv' : 'ogt';
    let value = entry[optKey] || entry[optKey.toLowerCase?.()] || entry['ogv'] || entry['ogt'];
    if (value) return String(value).trim();

    // fallback, se for fornecido um objeto com nome-text
    if (entry.nome || entry.text || entry.label) {
        return String(entry.nome || entry.text || entry.label).trim();
    }

    return null;
}

function getAiesecIdFromNome(nomeCL) {
    if (!nomeCL || !Array.isArray(todasAiesecs)) return null;

    const normalized = slugify(String(nomeCL).trim().replace(/\s+/g, ' '));
    const match = todasAiesecs.find(o => {
        const text = String(o.text || o.id || '').trim();
        const slug = slugify(text);
        return slug === normalized || slug.includes(normalized) || normalized.includes(slug);
    });
    return match ? match.id : null;
}

// Helper para construir um combo com filtro (autocomplete)
/**
 * Constrói um componente simples de combo com filtro (autocomplete).
 *
 * Estrutura gerada:
 * <div class="combo">
 *   <input id="{inputId}">
 *   <ul id="{listId}"></ul>
 * </div>
 * <input type="hidden" id="{hiddenId}">
 *
 * @param {{
 *   container: HTMLElement,
 *   inputId: string,
 *   listId: string,
 *   hiddenId: string,
 *   placeholder: string,
 *   options: OptionItem[],
 *   preselectIndex?: number
 * }} params
 * @returns {void}
 */
function buildCombo({
    container,
    inputId,
    listId,
    hiddenId,
    placeholder,
    options,
    preselectIndex = null,
    hasTags = false,
    selecionados = null,
    filterOption = null
}) {

    const html = `
        <div class="combo">
            <input type="text" id="${inputId}" placeholder="${placeholder}" autocomplete="off">
            <ul id="${listId}" style="display:none"></ul>
        </div>
        ${hasTags ? `<div class="tags" id="tags-${hiddenId}"></div>` : ``}
        <input type="hidden" id="${hiddenId}" value="">
    `;
    container.insertAdjacentHTML('beforeend', html);

    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const hidden = document.getElementById(hiddenId);
    const tags = hasTags ? document.getElementById(`tags-${hiddenId}`) : null;

    function hideList() {
        list.style.display = 'none';
    }

    function showList() {
        list.style.display = 'block';
    }

    function closeAllCombos() {
        document.querySelectorAll('.combo ul').forEach(ul => ul.style.display = 'none');
    }

    function atualizarHidden() {
        if (hasTags) {
            hidden.value = selecionados.map(o => o.id).join(',');
        }
    }

    function adicionarTag(opt) {
        if (!hasTags) return;
        if (selecionados.some(o => o.id === opt.id)) return;

        selecionados.push(opt);
        atualizarHidden();

        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = opt.text;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '×';
        btn.onclick = () => {
            const idx = selecionados.findIndex(o => o.id === opt.id);
            if (idx > -1) selecionados.splice(idx, 1);
            tag.remove();
            atualizarHidden();
        };

        tag.appendChild(btn);
        tags.appendChild(tag);
    }

    function render(term = '') {
        const t = term.trim().toLowerCase();
        list.innerHTML = '';

        // Adicionamos (options || []) para garantir que, se options for null/undefined, 
        // ele use um array vazio e não quebre o código.
        const filtradas = (options || []).filter(o => {
            // 1. Filtro por texto (busca)
            if (!o.text.toLowerCase().includes(t)) return false;

            // 2. Se usar tags, remove da lista o que já foi selecionado
            if (hasTags && selecionados.some(s => s.id === o.id)) return false;

            // 3. Aplica um filtro customizado se existir
            if (hasTags && typeof filterOption === 'function') {
                return filterOption(o, selecionados);
            }

            return true;
        });

        if (!filtradas.length) {
            hideList();
            return;
        }

        filtradas.forEach(o => {
            const li = document.createElement('li');
            li.textContent = o.text;

            li.addEventListener('mouseover', () => {
                list.querySelectorAll('li').forEach(e => e.classList.remove('active'));
                li.classList.add('active');
            });

            li.addEventListener('click', () => {
                if (hasTags) {
                    adicionarTag(o);
                    input.value = '';
                } else {
                    input.value = o.text;
                    hidden.value = o.id;

                    // --- ADICIONE ESTAS LINHAS AQUI ---
                    const event = new Event('change', { bubbles: true });
                    hidden.dispatchEvent(event);
                }
                hideList();
            });
            list.appendChild(li);
        });

        showList();
    }

    input.addEventListener('input', () => {
        if (!hasTags) hidden.value = '';
        render(input.value);
    });

    input.addEventListener('focus', () => {
        closeAllCombos();
        render(input.value);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.combo')) hideList();
    });

    if (typeof preselectIndex === 'number' && preselectIndex >= 0 && preselectIndex < options.length) {
        const opt = options[preselectIndex];
        if (hasTags) {
            adicionarTag(opt);
        } else {
            input.value = opt.text;
            hidden.value = opt.id;
        }
    }
}



/**
 * Exibe um modal padronizado de acordo com elementos Bootstrap existentes no DOM.
 * Efeitos colaterais: altera conteúdo/estado de #exampleModalLong e exibe o modal, substitui listeners dos botões.
 * Dependências: window.bootstrap.Modal, elementos com ids exampleModalLong, exampleModalLongTitle, botaoConfirmar, botaoCancelar, DadosAqui.
 */
function showModal(options) {
    /**
     * @typedef {{
     *  title?: string,
     *  message?: string|string[],
     *  type?: 'info'|'error'|'success',
     *  showConfirm?: boolean,
     *  confirmText?: string,
     *  onConfirm?: (ev: MouseEvent) => void,
     *  showCancel?: boolean,
     *  cancelText?: string,
     *  onCancel?: (ev: MouseEvent) => void,
     *  backendError?: unknown
     * }} ModalOptions
     * @type {ModalOptions}
     */
    const {
        title,
        message,
        type = 'info',
        showConfirm = true,
        confirmText = 'Confirmar',
        onConfirm,
        showCancel = true,
        cancelText = 'Cancelar',
        onCancel,
        backendError
    } = options || {};

    // Elementos do modal (estrutura já existente no HTML)
    const modalEl = document.getElementById('exampleModalLong');
    const myModal = new bootstrap.Modal(modalEl);
    const tituloModal = document.getElementById('exampleModalLongTitle');
    const botaoConfirmar = document.getElementById('botaoConfirmar');
    const botaoCancelar = document.getElementById('botaoCancelar');
    const corpo = document.getElementById('DadosAqui');

    // Converte lista de mensagens para texto
    const normalizedMessage = Array.isArray(message) ? message.join('\n') : (message || '');

    // Se veio erro do backend, prioriza sua renderização no corpo
    let backendMsg = '';
    if (backendError) {
        try {
            if (typeof backendError === 'string') {
                backendMsg = backendError;
            } else if (backendError.error) {
                backendMsg = backendError.error;
            } else if (backendError.message) {
                backendMsg = backendError.message;
            } else {
                backendMsg = JSON.stringify(backendError);
            }
        } catch (_) {
            backendMsg = '';
        }
    }

    // Título
    tituloModal.textContent = title || '';

    // Corpo do modal: mensagem principal ou possível mensagem do backend
    corpo.textContent = backendMsg || normalizedMessage;

    // Estado e rótulos dos botões
    botaoConfirmar.style.display = showConfirm ? 'inline-block' : 'none';
    botaoConfirmar.disabled = !showConfirm;
    botaoConfirmar.textContent = confirmText;

    botaoCancelar.style.display = showCancel ? 'inline-block' : 'none';
    botaoCancelar.disabled = !showCancel;
    botaoCancelar.textContent = cancelText;

    // Remove listeners anteriores para evitar múltiplos disparos
    botaoConfirmar.replaceWith(botaoConfirmar.cloneNode(true));
    botaoCancelar.replaceWith(botaoCancelar.cloneNode(true));
    const novoConfirmar = document.getElementById('botaoConfirmar');
    const novoCancelar = document.getElementById('botaoCancelar');

    if (showConfirm && typeof onConfirm === 'function') {
        novoConfirmar.addEventListener('click', ev => {
            onConfirm(ev);
            myModal.hide(); // ✅ fecha só aqui
            novoConfirmar.onclick = null; // ✅ remove listener para evitar múltiplos disparos
        }, { once: true });
    }

    if (showCancel && typeof onCancel === 'function') {
        novoCancelar.addEventListener('click', ev => {
            onCancel(ev);
            myModal.hide(); // opcional
        }, { once: true });
    }

    // Exibe o modal
    myModal.show();
}

// 1. Defina esta função auxiliar no seu script.js
const lerArquivoComoBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        // O reader deve começar a ler ANTES de definir o onload em alguns casos, 
        // mas o padrão correto é configurar os eventos e depois disparar a leitura.
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};
// Inicializa o fluxo principal: busca metadados e monta campos dinâmicos.
// Em caso de erro de rede/parse, exibe modal amigável e permite recarregar.
document.addEventListener("DOMContentLoaded", async () => {
    parametros = await ParamentroURL(); // aguarda a função assíncrona
    const url = 'https://baziaiesec.pythonanywhere.com/metadados-card';

    try {
        // Busca metadados para construção dinâmica de campos
        const response = await fetch(url);
        const data = await response.json();

        // Verificação de segurança mais completa
        // Campos dinamicamente configuráveis vindos do backend (formio like)
        campos = data?.data?.fields;
        universidades = data?.universidades;

        // Verfica se o dado campos é não nulo e com estrutura esperada
        const camposValidos = Array.isArray(campos) && campos.length > 0;
        if (!camposValidos) {
            showModal({
                title: "Erro de conexão",
                message: "Não foi possível carregar os dados necessários do servidor.\nPor favor, recarregue a página e tente novamente.",
                type: "error",
                showConfirm: false,
                showCancel: true,
                cancelText: "Recarregar",
                onCancel: () => {
                    document.getElementById("meuForm").reset();
                    location.reload();
                }
            });

            console.error("A comunicação não foi corretamente estabelecida. Recarregue a página");
            return; // interrompe o fluxo para evitar erro de find em undefined
        }
        // aqui você já pode chamar funções que dependem dos parâmetros

        // Populate global option arrays once, com tolerância a dados faltantes
        const produtoField = campos.find(field => field.label === "Produto");
        const aiesecField = campos.find(field => field.label === "Qual é a AIESEC mais próxima de você?");
        const comoConheceuField = campos.find(field => field.label === "Como você conheceu a AIESEC?");
        const formaAnuncioField = campos.find(field => field.label === "Como?");

        todosProdutos = (produtoField?.config?.settings?.options || [])
            .filter(opcoes => opcoes.status == "active")
            .map(curr => ({ id: curr.id, text: curr.text }));

        todasAiesecs = (aiesecField?.config?.settings?.options || [])
            .filter(opcoes => opcoes.status == "active")
            .map(curr => ({ id: curr.id, text: curr.text.replace(/\s*-\s*/g, " ") }));

        todasOpcoes_Como_Conheceu = (comoConheceuField?.config?.settings?.options || [])
            .filter(opcoes => opcoes.status == "active")
            .map(curr => ({ id: curr.id, text: curr.text }));

        todasopçoes_Tipo_Anuncio = (formaAnuncioField?.config?.settings?.options || [])
            .filter(opcoes => opcoes.status == "active")
            .map(curr => ({ id: curr.id, text: curr.text }));

        // This is the new flow.
        // Pre-fill the form with data from URL and prepare for completion.
        await preencherFormularioComplemento(parametros);

        // Create the optional fields based on the product from the URL.
        criarCamposOpicionais(selectedProductId);

        // Setup password validation and toggle
        alternarVisibilidadeSenha("password", "togglePassword");
        iniciarValidacaoSenha("password", "erro-senha");
        // Add the main submit listener
        document.getElementById('meuForm').addEventListener('submit', handleFormCompletionSubmit);
    } catch (error) {
        showModal({
            title: "Erro de conexão",
            message: "Por favor, Recarregue a Pagina e tente novamente.\nCaso o erro persista contate o email: contato@aiesec.org.br",
            type: "error",
            showConfirm: false,
            showCancel: true,
            cancelText: "Recarregar",
            onCancel: () => {
                document.getElementById("meuForm").reset();
                location.reload();
            }
        });
        console.error("A comunicação não foi corretamente estabelecida. Recarregue a página");
        console.error('Erro ao buscar dados:', error);
    }
});

async function preencherFormularioComplemento(params) {
    const requiredParams = ['id', 'nome', 'sobrenome', 'email', 'telefone', 'produto', 'comite'];
    const missingParams = requiredParams.filter(p => !params[p] || params[p] === 'null');

    if (missingParams.length > 0) {
        const formEl = document.getElementById('meuForm');
        if (formEl) formEl.style.display = 'none'; // Esconde o formulário

        const greetingEl = document.getElementById('greeting');
        if (greetingEl) greetingEl.style.display = 'none'; // Esconde a saudação

        showModal({
            title: "Link de Cadastro Inválido",
            message: `Este link de cadastro está incompleto. Por favor, verifique o link recebido ou entre em contato com o suporte: contato@aiesec.org.br`,
            type: "error",
            showConfirm: false,
            showCancel: false,
        });
        console.error('Parâmetros obrigatórios faltando na URL:', missingParams.join(', '));
        return;
    }

    itemID = params.id; // Set global itemID

    // Set greeting
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        greetingEl.textContent = `Olá, ${params.nome} ${params.sobrenome}!`;
    }

    // Data de Nascimento
    if (params.data_nasc && params.data_nasc !== 'null') {
        const dateParts = params.data_nasc.split('-'); // Expects YYYY-MM-DD
        if (dateParts.length === 3) {
            const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            setDate(date); // This function updates both visible and ISO inputs
        }
    }

    // Produto
    const idProgramaExpa = parseInt(params.produto, 10);
    const productEntry = siglaProduto.find(p => p.idprograma === idProgramaExpa);
    if (productEntry) {
        const product = todosProdutos.find(p => p.text.toLowerCase().includes(productEntry.nome.toLowerCase()));
        if (product) selectedProductId = product.id;
    }

    // Comitê
    if (params.comite) {
        selectedCommitteeId = params.comite;
        const committee = todasAiesecs.find(c => String(c.id) === String(params.comite));
        if (committee) selectedCommitteeText = committee.text;
        else selectedCommitteeText = params.nomeCl; // fallback to name from URL
    }
}

function criarCamposOpicionais(idproduto) {
    idiomasDiv.innerHTML = `
        <label for="combo-input-idioma">Selecione ou digite os idiomas que você sabe falar</label>
        `;
    todasOpcoes_idioma = campos.find(field => field.label === "Quais idiomas você fala?").config.settings.options.filter(opcoes => opcoes.status == "active").map(curr => ({ id: curr.id, text: curr.text }));
    buildCombo({
        container: idiomasDiv,
        inputId: 'combo-input-idioma',
        listId: 'combo-list-idioma',
        hiddenId: 'idiomas',
        placeholder: 'Digite ou selecione',
        options: todasOpcoes_idioma,
        hasTags: true,
        selecionados: idiomaSelecionados,
        filterOption: filtroIdiomas
    });


    idiomasDiv.insertAdjacentHTML('beforeend', '<div class="error-msg" id="erro-idioma">');
    if (idproduto == 1) {
        cursosDiv.innerHTML = `<label for="curso">Curso</label>
        <input type="text" id="curso" placeholder="Informe Seu curso"
                                aria-required="true"
                                aria-describedby="erro-curso" />
                            <span class="error-msg" id="erro-curso" role="alert"
                                aria-live="polite"></span>`
    } else {
        atuacaoDiv.innerHTML = `
    <label for="area-atuacao">Sua Área de Atuação</label>
    <select id="area-atuacao" name="area-atuacao" aria-required="true" aria-describedby="erro-area-atuacao">
        <option value="" disabled selected>Selecione sua área</option>
        <option value="1">Administração</option>
        <option value="2">Direito</option>
        <option value="3">Tecnologia</option>
        <option value="4">Engenharia</option>
        <option value="5">Saúde</option>
        <option value="6">Comunicação</option>
        <option value="7">Ciências Humanas</option>
        <option value="8">Ciências Naturais</option>
    </select>
    <span class="error-msg" id="erro-area-atuacao" role="alert" aria-live="polite"></span>
    `;
        mercadoDiv.innerHTML = `<div class="input-extra">
            <label for="nivel">Nível profissional</label>
            <select id="nivel" name="nivel">
                <option value disabled selected>Selecione o nível</option>
                <option value="1">Estagiário</option>
                <option value="2">Assistente/Auxiliar</option>
                <option value="3">Júnior (JR)</option>
                <option value="4">Pleno (PL)</option>
                <option value="5">Sênior (SR)</option>
                <option value="6">Especialista/Master</option>
                <option value="7">Liderança (Coordenador, Gerente, Diretor)</option>
            </select>
            <span class="error-msg" id="erro-nivel" role="alert" aria-live="polite"></span>
        </div>`
    }
}

function filtroIdiomas(option, selecionados) {
    // option.text = "Português - Básico"
    // selecionados = [{ id, text: "Português - Fluente" }]

    const idiomaBase = option.text.split(' - ')[0];

    return !selecionados.some(sel =>
        sel.text.startsWith(idiomaBase + ' -')
    );
}


function adicionar(item) {
    selecionados.push(item);
    input.value = "";
    lista.innerHTML = "";

    const tag = document.createElement("span");
    tag.textContent = item;

    const btn = document.createElement("button");
    btn.textContent = "×";
    btn.onclick = () => remover(item, tag);

    tag.appendChild(btn);
    tags.appendChild(tag);
}

function remover(item, tag) {
    selecionados = selecionados.filter(i => i !== item);
    tag.remove();
}

// -------------------- Máscara e validação de telefone --------------------
/**
 * Aplica máscara de telefone brasileiro durante a digitação.
 * Formato alvo: (DD) 9 XXXX-XXXX.
 * @param {HTMLInputElement} input
 */
function aplicarMascaraTelefone(input) {
    input.addEventListener('input', function (e) {
        let valor = e.target.value.replace(/\D/g, ''); // remove tudo que não for número
        if (valor.length > 11) valor = valor.substring(0, 11); // limita a 11 dígitos (DDD + 9 + 8 números)

        // Coloca o DDD entre parênteses
        if (valor.length > 2) {
            valor = '(' + valor.substring(0, 2) + ') ' + valor.substring(2);
        }

        // Adiciona o espaço após o 9
        if (valor.length > 6) {
            valor = valor.substring(0, 6) + ' ' + valor.substring(6);
        }

        // Adiciona o traço antes dos últimos 4 números
        if (valor.length > 11) {
            valor = valor.substring(0, 11) + '-' + valor.substring(11);
        }

        e.target.value = valor;
    });
}

// Função para remover a máscara e deixar só números
/**
 * Remove todos os caracteres não numéricos de um telefone formatado.
 * @param {string} valorFormatado
 * @returns {string}
 */
function limparTelefoneFormatado(valorFormatado) {
    return valorFormatado.replace(/\D/g, ''); // remove tudo que não for número
}



/**
 * Valida telefone no blur usando regex do formato (DD) 9 XXXX-XXXX.
 * @param {HTMLInputElement} input
 */
function aplicarValidacaoTelefone(input) {
    input.addEventListener('blur', function (e) {
        const valor = e.target.value.trim();
        const erro = document.getElementById('erro-telefone');
        const regex = /^\(\d{2}\)\s9\s\d{4}-\d{4}$/;

        if (!regex.test(valor)) {
            erro.textContent = "Telefone inválido. Use o formato (DD) 9 XXXX-XXXX";
            camposErro.push("Telefone Inválido")
        } else {
            erro.textContent = "";
        }
    });
}

// -------------------- Pikaday - Data de nascimento --------------------
// Inputs da data
/** @type {HTMLInputElement} */
const inputVisivel = document.getElementById('nascimento'); // mostra DD/MM/YYYY
/** @type {HTMLInputElement} */
const inputISO = document.getElementById('nascimento-iso'); // armazena YYYY-MM-DD 00:00:00

/**
 * Sincroniza campos de data (visível e ISO) e atualiza o calendário.
 * @param {Date} date
 */
function setDate(date) {
    if (date instanceof Date && !isNaN(date)) {
        // Formato brasileiro no input visível
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        inputVisivel.value = `${day}/${month}/${year}`;

        // Formato americano no campo oculto
        inputISO.value = `${year}-${month}-${day} 00:00:00`;

        // Atualiza a marcação do calendário
        picker.setDate(date, true); // true = evita loop de eventos
    }
}

// Inicializa Pikaday
// Instância do componente de calendário (Pikaday)
const picker = new Pikaday({
    field: inputVisivel,
    format: 'DD/MM/YYYY',
    i18n: {
        previousMonth: 'Mês Anterior',
        nextMonth: 'Próximo Mês',
        months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        weekdays: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
        weekdaysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    },
    yearRange: [1900, new Date().getFullYear()],
    toString(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },
    parse(dateString) {
        const [day, month, year] = dateString.split('/').map(Number);
        return new Date(year, month - 1, day);
    },
    onSelect: setDate
});

// Atualização manual pelo input
// Sincroniza digitação manual com o calendário e o campo oculto ISO
inputVisivel.addEventListener('input', () => {
    let valor = inputVisivel.value.replace(/\D/g, ''); // remove tudo que não for número

    if (valor.length > 2 && valor.length <= 4) {
        valor = valor.substring(0, 2) + '/' + valor.substring(2);
    } else if (valor.length > 4) {
        valor = valor.substring(0, 2) + '/' + valor.substring(2, 4) + '/' + valor.substring(4, 8);
    }

    inputVisivel.value = valor;

    // Atualiza a marcação no calendário conforme digita
    if (valor.length === 10) { // formato completo DD/MM/YYYY
        const [day, month, year] = valor.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        if (!isNaN(date)) {
            setDate(date); // atualiza os campos e o calendário
        }
    }
});

function validarDadosOpcionais() {
    let valido = true;
    const camposErro = [];
    const nivelMercadoPermitidos = ["1", "2", "3", "4", "5", "6", "7"];
    const areaAtuacaoPermitidos = ["1", "2", "3", "4", "5", "6", "7", "8"];

    // Função auxiliar para validar na hora e evitar erro de 'null'
    function validarImediato(id, erroId) {
        const input = document.getElementById(id);
        const erro = document.getElementById(erroId);

        if (!input || !erro) return; // Se o campo não existe na tela, ignora

        const valor = input.value.trim();
        if (valor !== "") {
            const regex = /^[A-Za-zÀ-ÿ\s]+$/;
            if (!regex.test(valor)) {
                valido = false;
                erro.textContent = "Use apenas letras e espaços.";
                const label = input.previousElementSibling ? input.previousElementSibling.textContent : id;
                camposErro.push(`${label} inválido`);
            } else {
                erro.textContent = "";
            }
        }
    }

    // 1. Validar Idiomas
    const erroIdioma = document.getElementById('erro-idioma');
    if (erroIdioma) {
        const idIdiomaValidos = todasOpcoes_idioma.map(o => o.id);
        if (idiomaSelecionados.length > 0 && !idiomaSelecionados.every(idioma => idIdiomaValidos.includes(idioma.id))) {
            valido = false;
            erroIdioma.textContent = "Informe uma opção de idioma válido!";
            camposErro.push("Idioma inválido");
        } else {
            erroIdioma.textContent = "";
        }
    }

    // 2. Validar Curso
    validarImediato('curso', 'erro-curso');

    // 3. Validar Nível (Select)
    const nivel = document.getElementById("nivel");
    const erroNivel = document.getElementById('erro-nivel');
    if (nivel && erroNivel) {
        const valorNivel = nivel.value.trim();
        if (valorNivel !== "" && !nivelMercadoPermitidos.includes(valorNivel)) {
            valido = false;
            erroNivel.textContent = "Nível de mercado inválido.";
            camposErro.push("Nível de mercado inválido.");
        } else {
            erroNivel.textContent = "";
        }
    }

    // 4. Validar Área de Atuação (Select)
    const areaAtuacao = document.getElementById("area-atuacao");
    const erroAreaAtuacao = document.getElementById('erro-area-atuacao');
    if (areaAtuacao && erroAreaAtuacao) {
        const valorArea = areaAtuacao.value.trim();
        if (valorArea !== "" && !areaAtuacaoPermitidos.includes(valorArea)) {
            valido = false;
            erroAreaAtuacao.textContent = "Área de atuação inválida.";
            camposErro.push("Área de atuação inválida.");
        } else {
            erroAreaAtuacao.textContent = "";
        }
    }

    if (valido) {
        return true;
    } else {
        showModal({
            title: "Dados incorretos.",
            message: `Por favor, corrija os erros e tente novamente.\n\n${camposErro.map(campo => `- ${campo}`).join('\n')}`,
            type: "error",
            showConfirm: false,
            showCancel: true,
            cancelText: "Corrigir"
        });
        return false; // Retorna false para o btnNext não prosseguir
    }
}

async function handleFormCompletionSubmit(event) {
    event.preventDefault();

    // 1. Validate
    const isPasswordValid = validarSenha(document.getElementById('password').value).senhaValida;
    const areOptionalFieldsValid = validarDadosOpcionais(); // this shows its own modal on error

    if (!isPasswordValid) {
        document.getElementById('erro-senha').textContent = 'Senha inválida. Verifique os requisitos.';
        showModal({ title: "Erro", message: "Sua senha não atende aos requisitos de segurança." });
        return;
    } else {
        document.getElementById('erro-senha').textContent = '';
    }

    if (!areOptionalFieldsValid) {
        return; // Modal is already shown by the function
    }

    // 2. Collect all data
    const data = {
        id: itemID, // from URL
        // Pre-filled data
        nome: parametros.nome,
        sobrenome: parametros.sobrenome,
        emails: [{ email: parametros.email, tipo: 'other' }], // Assuming 'other'
        telefones: [{ numero: limparTelefoneFormatado(parametros.telefone), tipo: 'other' }],
        dataNascimento: document.getElementById('nascimento-iso').value || null,
        idProduto: selectedProductId,
        idComite: selectedCommitteeId,
        nomeCL: selectedCommitteeText,
        idAutorizacao: "1", // from old code
        // New data from user
        senha: document.getElementById('password').value,
        idiomas: idiomaSelecionados?.map(id => id.id) ?? null,
        area_atuacao: parseInt(document.getElementById("area-atuacao")?.value) || null,
        nivel_mercado: parseInt(document.getElementById('nivel')?.value) || null,
        curso: document.getElementById("curso")?.value || null,
        semestre: document.getElementById("semestre")?.value || null,
    };

    // Handle file upload
    const curriculoInput = document.getElementById("curriculo");
    const file = curriculoInput?.files[0];
    if (file) {
        try {
            data.file = await lerArquivoComoBase64(file);
            data.fileName = file.name;
        } catch (e) {
            console.error("Erro ao ler o arquivo:", e);
            showModal({ title: "Erro", message: "Não foi possível processar o seu currículo. Tente novamente sem o arquivo." });
        }
    }

    // 3. Show confirmation modal
    let dadosConfirmacao = `
        <strong>Nome</strong>: ${data.nome} ${data.sobrenome}<br>
        <strong>Email</strong>: ${parametros.email}<br>
        <strong>Telefone</strong>: ${parametros.telefone}<br>
        <strong>Data de Nascimento</strong>: ${document.getElementById('nascimento').value}<br>
        <strong>Senha</strong>: ********<br>
    `;

    if (data.idiomas && data.idiomas.length > 0) {
        dadosConfirmacao += `<strong>Idiomas</strong>: ${idiomaSelecionados.map(i => i.text).join(', ')}<br>`;
    }
    if (data.curso) dadosConfirmacao += `<strong>Curso</strong>: ${data.curso}<br>`;
    if (data.area_atuacao) dadosConfirmacao += `<strong>Área de Atuação</strong>: ${document.querySelector('#area-atuacao option:checked').textContent}<br>`;
    if (data.nivel_mercado) dadosConfirmacao += `<strong>Nível Profissional</strong>: ${document.querySelector('#nivel option:checked').textContent}<br>`;
    if (data.semestre) dadosConfirmacao += `<strong>Semestre</strong>: ${document.querySelector('#semestre option:checked').textContent}<br>`;

    const modal = document.getElementById('exampleModalLong');
    const myModal = new bootstrap.Modal(modal);
    document.getElementById("exampleModalLongTitle").textContent = "Confirme seus dados";
    document.getElementById("DadosAqui").innerHTML = dadosConfirmacao;
    myModal.show();

    const botaoConfirmar = document.getElementById("botaoConfirmar");
    botaoConfirmar.replaceWith(botaoConfirmar.cloneNode(true));
    document.getElementById("botaoConfirmar").addEventListener("click", async () => {
        myModal.hide();
        mostrarSpinner();

        try {
            const response = await fetch("https://baziAiesec.pythonanywhere.com/adicionar-card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const backendError = await response.json().catch(() => null);
                throw { status: response.status, backend: backendError };
            }

            esconderSpinner();
            showModal({
                title: "Cadastro Concluído!",
                message: `Seus dados foram enviados com sucesso.
                Em breve, um membro da AIESEC entrará em contato com você. Fique atento ao seu email e telefone!`,
                type: "success",
                showCancel: false,
                confirmText: "OK",
                onConfirm: () => {
                    window.location.href = 'http://localhost:5500/';
                }
            });

        } catch (err) {
            esconderSpinner();
            showModal({
                title: "Falha ao Enviar",
                message: "Ocorreu um erro ao enviar seus dados. Por favor, tente novamente.",
                type: "error",
                showConfirm: false,
                showCancel: true,
                cancelText: "Tentar Novamente",
                backendError: err?.backend,
            });
        }
    }, { once: true });
}
// ============================================================================
// -------------------- FUNÇÕES DE CONTROLE DO SPINNER ------------------------
// ============================================================================

/**
 * Exibe um spinner de carregamento centralizado na tela.
 * 
 * - Cria dinamicamente o elemento HTML do spinner (não precisa existir no HTML).
 * - Bloqueia a interação com o fundo (usando overlay sem interferir no Bootstrap).
 * - Pode ser reutilizado em qualquer parte do código.
 */
function mostrarSpinner() {
    // Verifica se já existe um spinner ativo para evitar duplicação
    if (document.getElementById('spinner-overlay')) return;

    // Cria o overlay escuro
    const overlay = document.createElement('div');
    overlay.id = 'spinner-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = '#ffffff';
    overlay.style.opacity = '0.5';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '2000'; // acima do modal

    // Cria o spinner em si
    const spinner = document.createElement('div');
    spinner.className = 'spinner-border';
    spinner.role = 'status';

    // Cria o texto de carregamento
    const texto = document.createElement('p');
    texto.textContent = 'Enviando dados, aguarde...';
    texto.style.color = '#000';
    texto.style.marginTop = '15px';
    texto.style.fontSize = '1.1rem';
    texto.style.fontWeight = '500';

    // Adiciona ao overlay
    overlay.appendChild(spinner);
    overlay.appendChild(texto);

    // Insere o overlay no body
    document.body.appendChild(overlay);
}

/**
 * Remove o spinner da tela, caso esteja visível.
 * 
 * - É seguro chamar várias vezes (faz checagem antes de remover).
 */
function esconderSpinner() {
    const overlay = document.getElementById('spinner-overlay');
    if (overlay) overlay.remove();
}


// Função genérica para traduzir palavras usando LibreTranslate
/**
 * Traduz termos comuns por dicionário local (fallback para o original).
 * @param {string[]} palavras
 * @returns {Promise<Array<{ original: string, traduzido: string }>>}
 */
async function traduzirPalavras(palavras) {
    // 1. Tabela interna de termos comuns (manual, sem JSON externo)
    const dicionarioBase = {
        home: "Casa",
        main: "Principal",
        mobile: "Celular",
        other: "Outro",
        private_fax: "Fax Privado",
        work: "Trabalho",
        work_fax: "Fax do Trabalho"
    };

    // 2. Traduz cada palavra
    const traducao = palavras.map(palavra => {
        const limpa = palavra.toLowerCase().trim();
        // tenta tradução direta
        if (dicionarioBase[limpa]) {
            return { original: palavra, traduzido: dicionarioBase[limpa] };
        }
        // caso não ache, tenta deduzir algo
        if (limpa.includes('fax')) return { original: palavra, traduzido: 'Fax' };
        if (limpa.includes('phone')) return { original: palavra, traduzido: 'Telefone' };
        // fallback
        return { original: palavra, traduzido: palavra };
    });

    return traducao;
}

/**
     * Alterna a visibilidade de um campo de senha ao clicar no ícone.
     *
     * @param {string} idSenha - ID do input do tipo password.
     * @param {string} idToggle - ID do elemento que contém o ícone (Bootstrap Icon).
     *
     * @returns {void}
     */
function alternarVisibilidadeSenha(idSenha, idToggle) {
    // Obtém o campo de senha pelo ID
    /** @type {HTMLInputElement | null} */
    const campoSenha = document.getElementById(idSenha);

    // Obtém o container do ícone
    /** @type {HTMLElement | null} */
    const containerToggle = document.getElementById(idToggle);

    // Se algum dos elementos não existir, interrompe a execução
    if (!campoSenha || !containerToggle) return;

    // Obtém o ícone <i> dentro do container
    /** @type {HTMLElement | null} */
    const icone = containerToggle.querySelector("i");

    if (!icone) return;

    // Listener de clique no ícone
    containerToggle.addEventListener("click", () => {
        const senhaEstaOculta = campoSenha.type === "password";

        // Alterna o tipo do input
        campoSenha.type = senhaEstaOculta ? "text" : "password";

        // Alterna os ícones do Bootstrap
        icone.classList.toggle("bi-eye");
        icone.classList.toggle("bi-eye-slash");
    });

    // Evita perda de foco ou seleção de texto ao clicar no ícone
    icone.addEventListener("mousedown", evento => evento.preventDefault());
    containerToggle.addEventListener("mousedown", evento => evento.preventDefault());
}

/**
 * Lê e normaliza parâmetros relevantes da URL.
 * @returns {Promise<ParametrosURL>}
 */
async function ParamentroURL() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || null;
    const nome = decodeURIComponent(params.get('nome') || '');
    const sobrenome = decodeURIComponent(params.get('sobrenome') || '');
    const email = decodeURIComponent(params.get('email') || '');
    const telefone = decodeURIComponent(params.get('telefone') || '');
    const data_nasc = decodeURIComponent(params.get('data_nasc') || '');
    const produto = params.get('produto') || null; // idProdutoExpa
    const nomeCl = decodeURIComponent(params.get('nomeCl') || '');
    const comite = params.get('comite') || null;

    return {
        id, nome, sobrenome, email, telefone, data_nasc, produto, nomeCl, comite
    };
}
/**
 * Converte string para slug: minúsculas, sem acentos, com hífens e barras.
 * @param {string} texto
 * @returns {string}
 */
function slugify(texto) {
    return texto
        .toLowerCase()                       // tudo minúsculo
        .normalize("NFD")                    // separa letras dos acentos
        .replace(/[\u0300-\u036f]/g, "")     // remove acentos
        .replace(/\s+/g, "-")                // substitui espaços por hífen
        .replace(/[^a-z0-9-/]/g, "")         // mantém letras, números, hífen e barra
        .replace(/-+/g, "-")                 // evita múltiplos hífens
        .replace(/\/+/g, "/")                // evita múltiplas barras
        .replace(/^[-/]+|[-/]+$/g, "");      // remove hífens ou barras no início/fim
}

/**
     * Valida uma senha com base em regras de segurança.
     *
     * @param {string} senha - Senha digitada pelo usuário.
     * @returns {{
     *   tamanhoMinimo: boolean,
     *   letraMaiuscula: boolean,
     *   letraMinuscula: boolean,
     *   numero: boolean,
     *   caractereEspecial: boolean,
     *   senhaValida: boolean
     * }}
     */
function validarSenha(senha) {
    const naoEstaVazia = senha.length > 0;

    const regras = {
        naoEstaVazia: naoEstaVazia,
        tamanhoMinimo: senha.length >= 8,
        letraMaiuscula: /[A-Z]/.test(senha),
        letraMinuscula: /[a-z]/.test(senha),
        numero: /\d/.test(senha),
        caractereEspecial: /[!@#$%^&*(),.?":{}|<>]/.test(senha)
    };


    return {
        ...regras,
        senhaValida: Object.values(regras).every(Boolean)
    };
}

/**
     * Inicializa a validação da senha em tempo real.
     *
     * @param {string} idSenha - ID do input de senha.
     * @param {string} idFeedback - ID do elemento de feedback visual.
     * @returns {void}
     */
function iniciarValidacaoSenha(idSenha, idFeedback) {
    /** @type {HTMLInputElement | null} */
    const campoSenha = document.getElementById(idSenha);

    /** @type {HTMLElement | null} */
    const feedback = document.getElementById(idFeedback);

    if (!campoSenha || !feedback) return;

    campoSenha.addEventListener("input", () => {
        const resultado = validarSenha(campoSenha.value);

        const mensagens = [];

        if (!resultado.naoEstaVazia) {
            mensagens.push(`<li class="text-danger">A senha não pode ser vazia</li>`);
        } else {

            if (!resultado.tamanhoMinimo) {
                mensagens.push(`<li class="text-danger">Mínimo de 8 caracteres</li>`);
            }

            if (!resultado.letraMaiuscula) {
                mensagens.push(`<li class="text-danger">Letra maiúscula</li>`);
            }

            if (!resultado.letraMinuscula) {
                mensagens.push(`<li class="text-danger">Letra minúscula</li>`);
            }

            if (!resultado.numero) {
                mensagens.push(`<li class="text-danger">Número</li>`);
            }

            if (!resultado.caractereEspecial) {
                mensagens.push(`<li class="text-danger">Caractere especial</li>`);
            }
        }

        feedback.innerHTML = mensagens.length
            ? `<ul class="mb-0">${mensagens.join("")}</ul>`
            : "";

    });
}