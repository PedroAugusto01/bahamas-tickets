// Função para lidar com respostas não autorizadas
function handleUnauthorized(response) {
    if (response.status === 401) {
        window.location.href = '/'; // Redireciona para o login
        return true;
    }
    return false;
}

// Função para buscar dados da API
async function fetchData(url) {
    const response = await fetch(url);
    if (handleUnauthorized(response)) return null; // Retorna null se não autorizado
    if (!response.ok) {
        throw new Error(`Falha ao buscar ${url}: ${response.statusText}`);
    }
    return await response.json();
}

// Função para exibir mensagem (sucesso ou erro)
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('ingame-id-message');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`; // Aplica classe 'success' ou 'error'
        // Limpa a mensagem após alguns segundos
        setTimeout(() => {
            messageEl.textContent = '';
            messageEl.className = 'message';
        }, 4000);
    }
}

// Função para renderizar informações básicas do perfil
function renderProfileInfo(user) {
    document.getElementById('profile-avatar').src = user.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
    document.getElementById('profile-username').textContent = user.username || 'Nome de usuário indisponível';
    document.getElementById('profile-discord-id').textContent = `ID Discord: ${user.id || 'N/A'}`;
}

// Função para renderizar os cargos
function renderRoles(roles) {
    const rolesList = document.getElementById('roles-list');
    rolesList.innerHTML = ''; // Limpa o placeholder

    if (!roles || roles.length === 0) {
        rolesList.innerHTML = '<li>Nenhum cargo encontrado.</li>';
        return;
    }

    // Mapeamento de palavras-chave para classes CSS (similar ao Ver ADV)
    const roleStyleMap = {
        'banido': 'severity-high',
        'advertência²': 'severity-medium',
        'advertência¹': 'severity-low',
        'advertência verbal': 'severity-low',
        'staff': 'staff-role',
        'admin': 'staff-role',
        'mod': 'staff-role'
        // Adicione mais mapeamentos se necessário
    };

    // Função auxiliar para determinar se uma cor é "escura" (para contraste do texto)
    function isColorDark(hexColor) {
        if (!hexColor || hexColor === '#000000') return true; // Trata preto ou ausência como escuro
        const color = hexColor.substring(1); // Remove #
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        // Fórmula de luminância YIQ
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq < 128; // Retorna true se a cor for considerada escura
    }

    roles.sort((a, b) => a.name.localeCompare(b.name)).forEach(role => {
        const li = document.createElement('li');
        li.textContent = role.name;
        li.className = 'role-tag'; // Classe base

        let appliedSeverityClass = false;
        // Aplica estilo com base no nome do cargo (classes de severidade)
        const lowerCaseName = role.name.toLowerCase();
        for (const keyword in roleStyleMap) {
            if (lowerCaseName.includes(keyword)) {
                li.classList.add(roleStyleMap[keyword]);
                appliedSeverityClass = true; // Marca que uma classe de severidade foi aplicada
                break;
            }
        }

        // Aplica a cor específica do cargo (se houver e não for preto)
        // Só aplica a cor específica se NENHUMA classe de severidade foi aplicada
        if (!appliedSeverityClass && role.color && role.color !== 0) {
             const hexColor = `#${role.color.toString(16).padStart(6, '0')}`;
             li.style.borderColor = hexColor;
             // Usa a cor como fundo, mas com alguma transparência para não ficar muito forte
             // Você pode ajustar a opacidade (o último valor, ex: 0.3)
             const r = parseInt(hexColor.substring(1, 3), 16);
             const g = parseInt(hexColor.substring(3, 5), 16);
             const b = parseInt(hexColor.substring(5, 7), 16);
             li.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.2)`; // Fundo com transparência

             // Ajusta a cor do texto para contraste
             if (isColorDark(hexColor)) {
                 // Se a cor de fundo for escura, texto claro (pode precisar ajustar a cor exata)
                 li.style.color = '#e0e0e0';
             } else {
                  // Se a cor de fundo for clara, texto escuro
                 li.style.color = '#1e1f2c';
             }
        } else if (!appliedSeverityClass) {
             // Estilo padrão se não for severidade e não tiver cor
             li.style.borderColor = '#5c6168';
             li.style.backgroundColor = 'rgba(64, 68, 75, 0.5)';
             li.style.color = '#d1d5db';
        }
        // Se uma classe de severidade foi aplicada, o CSS cuidará das cores

        rolesList.appendChild(li);
    });
}

// Função para renderizar a seção do ID in-game (mostrar ID ou formulário)
function renderInGameIDSection(ingameData) {
    const contentDiv = document.getElementById('ingame-id-content');
    contentDiv.innerHTML = ''; // Limpa o conteúdo atual

    if (ingameData && ingameData.in_game_id) {
        // ID encontrado, exibe o ID e o botão de atualizar
        contentDiv.innerHTML = `
            <p>Seu ID vinculado: <strong>${ingameData.in_game_id}</strong></p>
            <button id="update-id-btn" class="profile-button">Atualizar ID</button>
        `;
        document.getElementById('update-id-btn').addEventListener('click', showUpdateForm);
    } else {
        // ID não encontrado (ou erro 404), exibe o formulário para vincular
        showUpdateForm(true); // Chama a função para mostrar o formulário diretamente
        if(ingameData && ingameData.error) {
             // Mostra a mensagem de "não cadastrado" se veio do backend
             showMessage(ingameData.error, 'info');
        }
    }
}

// Função para mostrar o formulário de atualização/vinculação
function showUpdateForm(isLinking = false) { // isLinking diferencia texto do botão
    const contentDiv = document.getElementById('ingame-id-content');
    contentDiv.innerHTML = `
        <input type="text" id="ingame-id-input" placeholder="Digite seu ID no jogo">
        <button id="save-id-btn" class="profile-button">${isLinking ? 'Vincular ID' : 'Salvar Novo ID'}</button>
    `;
    document.getElementById('save-id-btn').addEventListener('click', handleSaveID);
}

// Função para salvar/atualizar o ID in-game
async function handleSaveID() {
    const input = document.getElementById('ingame-id-input');
    const button = document.getElementById('save-id-btn');
    const gameId = input.value.trim();

    if (!gameId || !/^\d+$/.test(gameId)) {
        showMessage('Por favor, insira um ID de jogo válido (apenas números).', 'error');
        return;
    }

    button.textContent = 'Salvando...';
    button.disabled = true;

    try {
        const response = await fetch('/api/save-user-ingame-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ in_game_id: gameId }) // Envia sem discord_id, o backend usará o da sessão
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Falha ao salvar o ID.');
        }

        showMessage('ID salvo com sucesso!', 'success');
        // Re-renderiza a seção para mostrar o ID salvo e o botão de atualizar
        renderInGameIDSection({ in_game_id: gameId });

    } catch (error) {
        showMessage(`Erro: ${error.message}`, 'error');
        // Deixa o formulário visível para tentar novamente
        button.textContent = button.textContent.includes('Vincular') ? 'Vincular ID' : 'Salvar Novo ID';
        button.disabled = false;
    }
}


// Função Principal de Inicialização
async function initializeProfilePage() {
    try {
        // 1. Busca dados do usuário para a barra de navegação (já deve existir)
        const navUser = await fetchData('/api/user');
        if (navUser) {
            const userProfileDiv = document.getElementById('nav-user-profile');
            if (userProfileDiv) {
                userProfileDiv.innerHTML = `
                    <img src="${navUser.avatarUrl}" alt="Avatar" class="nav-user-avatar">
                    <span>${navUser.username}</span>`;
            }
        }

        // 2. Busca dados detalhados do perfil (incluindo cargos)
        const profileData = await fetchData('/api/user-profile');
        if (profileData) {
            renderProfileInfo(profileData);
            renderRoles(profileData.roles);
        } else {
             // Tratar caso a busca do perfil falhe (pouco provável se /api/user funcionou)
             document.getElementById('profile-username').textContent = 'Erro ao carregar perfil.';
             document.getElementById('roles-list').innerHTML = '<li>Erro ao carregar cargos.</li>';
        }

        // 3. Busca o ID in-game vinculado
        try {
            const ingameIdData = await fetchData('/api/get-user-ingame-id');
             // fetchData já trata 401, aqui tratamos 404 como "não encontrado"
             renderInGameIDSection(ingameIdData); // Passa os dados (ou null) para renderizar
        } catch (error) {
             // Se a API retornar um erro diferente de 401 (já tratado) ou 404 (tratado como null)
             console.error("Erro ao buscar ID in-game:", error);
             renderInGameIDSection({ error: 'Erro ao verificar ID.' }); // Mostra erro
        }

    } catch (error) {
        console.error('Erro ao inicializar a página de perfil:', error);
        // Exibe uma mensagem de erro geral se algo crítico falhar
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = '<h1>Erro</h1><p style="color: #ff6b6b; text-align: center;">Não foi possível carregar os dados do perfil. Tente recarregar a página.</p>';
        }
    }
}

// Inicia o processo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeProfilePage);