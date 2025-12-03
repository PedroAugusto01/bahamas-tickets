function handleUnauthorized(response) {
    if (response.status === 401) {
        window.location.href = '/';
        return true;
    }
    return false;
}

function extractRoleSigla(username) {
    const match = username.match(/\[(.*?)\]/);
    return match ? match[1] : null;
}

async function calculateUserStats(userId, reportsData, startDate, endDate) {
    endDate.setHours(23, 59, 59, 999);

    const monthForAPI = startDate.getMonth() + 1;
    let userHours = 0;
    let userMinutes = 0;

    try {
        const hoursResponse = await fetch(`/api/get-hours-data?month=${monthForAPI}`);
        if (hoursResponse.ok) {
            const hoursData = await hoursResponse.json();
            if (hoursData.success && hoursData.users) {
                const userData = hoursData.users.find(u => u.userId === userId);
                if (userData && userData.monthlySeconds) {
                    const totalSeconds = userData.monthlySeconds;
                    userHours = Math.floor(totalSeconds / 3600);
                    userMinutes = Math.floor((totalSeconds % 3600) / 60);
                }
            }
        } else {
             console.error(`Erro ao buscar horas: ${hoursResponse.status}`);
        }
    } catch (error) {
        console.error('Erro ao processar horas:', error);
    }

    const filteredReports = reportsData.filter(report => {
        const reportDate = new Date(report.timestamp);
        return reportDate >= startDate && reportDate <= endDate;
    });

    const { atendimentoRealizado, auxilioRealizado } = calculateAtendimentoStats(userId, filteredReports, startDate, endDate);
    const { duvidasRespondidas } = calculateDuvidasStats(userId, filteredReports, startDate, endDate);
    
    // ATUALIZADO: Recebe os novos valores de Bug e Suporte
    const { 
        ticketsDenunciaAceitos, ticketsDenunciaNegados, 
        ticketsRevisaoAceitos, ticketsRevisaoNegados,
        ticketsBug, ticketsSuporte 
    } = calculateTicketsStats(userId, filteredReports, startDate, endDate);
    
    const { devolucoesRealizadas } = calculateDevolucaoStats(userId, filteredReports, startDate, endDate);
    const { chamadosRealizados, needsId } = await calculateChamadosStats(userId, startDate, endDate);

    return {
        userHours,
        userMinutes,
        atendimentoRealizado,
        auxilioRealizado,
        duvidasRespondidas,
        ticketsDenunciaAceitos,
        ticketsDenunciaNegados,
        ticketsRevisaoAceitos,
        ticketsRevisaoNegados,
        ticketsBug,      // Novo
        ticketsSuporte,  // Novo
        devolucoesRealizadas,
        chamadosRealizados,
        needsChamadoId: needsId
    };
}

function renderUserGoalCard(user, cargoInfo, stats) {
    const container = document.getElementById('goal-card-container');
    if (!container) return;
    container.innerHTML = '';

    const {
        userHours, userMinutes,
        atendimentoRealizado, auxilioRealizado, duvidasRespondidas,
        ticketsDenunciaAceitos, ticketsDenunciaNegados, ticketsRevisaoAceitos, ticketsRevisaoNegados,
        ticketsBug, ticketsSuporte, // Desestrutura aqui
        devolucoesRealizadas, chamadosRealizados, needsChamadoId
    } = stats;

    const metas = cargoInfo.metas;
    const metaHoras = metas['HORAS'] || 0;
    const metaAtendimento = metas['ATENDIMENTO SUPORTE'] || 0;
    const metaAuxilio = metas['AUXÍLIO SUPORTE'] || 0;
    const metaDuvidas = metas['DÚVIDAS'] || 0;
    const metaDevolucao = metas['DEVOLUÇÃO'] || 0;
    const metaChamados = metas['CHAMADOS CIDADE'] || 0;
    const metaTicketDenuncia = metas['TICKET DENUNCIA'];
    const metaTicketRevisao = metas['TICKET REVISÃO'];
    const metaTicketGeral = metas['TICKET GERAL'];

    const totalAtendimento = atendimentoRealizado + auxilioRealizado;
    const metaTotalAtendimento = metaAtendimento + metaAuxilio;
    const totalTicketsDenuncia = ticketsDenunciaAceitos + ticketsDenunciaNegados;
    const totalTicketsRevisao = ticketsRevisaoAceitos + ticketsRevisaoNegados;
    
    // ATUALIZADO: Soma Bug e Suporte ao total geral
    const totalGeralTickets = totalTicketsDenuncia + totalTicketsRevisao + ticketsBug + ticketsSuporte;
    
    const userTotalHoursDecimal = userHours + (userMinutes / 60);

    const getGoalStatusClass = (current, goal) => {
        if (goal === 0 || goal === undefined || goal === null) return '';
        return current >= goal ? 'met-goal' : 'unmet-goal';
    };

    let chamadosCardHtml = '';
    if (needsChamadoId) {
        chamadosCardHtml = `
            <div class="single-metric-card needs-id">
                <h4>Chamados na Cidade</h4>
                <p class="needs-id-text">Cadastre o ID do jogo para ver esta meta.</p>
                <input type="text" id="in-game-id-input" placeholder="ID no jogo do membro">
                <button id="btn-save-ingame-id">Salvar</button>
            </div>
        `;
    } else {
        chamadosCardHtml = `
            <div class="single-metric-card">
                <h4>Chamados na Cidade</h4>
                <p class="metric-value ${getGoalStatusClass(chamadosRealizados, metaChamados)}">${chamadosRealizados} / ${metaChamados}</p>
            </div>
        `;
    }

    const card = document.createElement('div');
    card.className = 'staff-card';

    // ATUALIZADO: HTML incluíndo os novos cards na grid de tickets
    card.innerHTML = `
        <div class="staff-info">
            <img src="${user.avatarUrl}" alt="Avatar do Staff" class="staff-avatar-single">
            <span class="staff-name">${user.username}</span>
        </div>
        <div class="all-metrics-container">

            <div class="single-metric-container-card">
                <div class="single-metric-card hour-card">
                     <h4>Horas Conectado</h4>
                     <p class="metric-value ${getGoalStatusClass(userTotalHoursDecimal, metaHoras)}">
                         ${userHours}h ${userMinutes}m / ${metaHoras}h
                     </p>
                </div>
            </div>

            <div class="metric-group-card">
                 <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>Atendimento Suporte</h4>
                        <p class="metric-value ${getGoalStatusClass(atendimentoRealizado, metaAtendimento)}">${atendimentoRealizado} / ${metaAtendimento}</p>
                    </div>
                    <div class="metric-card">
                        <h4>Auxílio Suporte</h4>
                        <p class="metric-value ${getGoalStatusClass(auxilioRealizado, metaAuxilio)}">${auxilioRealizado} / ${metaAuxilio}</p>
                    </div>
                </div>
                <div class="total-summary">
                    <h4>Total Atendimento</h4>
                    <p class="total-value ${getGoalStatusClass(totalAtendimento, metaTotalAtendimento)}">${totalAtendimento}</p>
                </div>
            </div>

            ${chamadosCardHtml}

            <div class="tickets-container-card">
               <div class="tickets-grid">
                    <div class="ticket-sub-card">
                        <h4>Tickets de Denúncia</h4>
                        <p class="ticket-total-value ${getGoalStatusClass(totalTicketsDenuncia, metaTicketDenuncia)}">
                            ${totalTicketsDenuncia} ${metaTicketDenuncia ? `/ ${metaTicketDenuncia}` : ''}
                        </p>
                        <div class="ticket-breakdown">
                            <span class="aceitos"><strong>${ticketsDenunciaAceitos}</strong> Aceitos</span>
                            <span class="negados"><strong>${ticketsDenunciaNegados}</strong> Negados</span>
                        </div>
                    </div>
                    <div class="ticket-sub-card">
                        <h4>Tickets de Revisão</h4>
                        <p class="ticket-total-value ${getGoalStatusClass(totalTicketsRevisao, metaTicketRevisao)}">
                            ${totalTicketsRevisao} ${metaTicketRevisao ? `/ ${metaTicketRevisao}` : ''}
                        </p>
                        <div class="ticket-breakdown">
                            <span class="aceitos"><strong>${ticketsRevisaoAceitos}</strong> Aceitos</span>
                            <span class="negados"><strong>${ticketsRevisaoNegados}</strong> Negados</span>
                        </div>
                    </div>
                    <div class="ticket-sub-card">
                        <h4>Tickets Bug</h4>
                        <p class="ticket-total-value">${ticketsBug}</p>
                    </div>
                    <div class="ticket-sub-card">
                        <h4>Tickets Suporte</h4>
                        <p class="ticket-total-value">${ticketsSuporte}</p>
                    </div>
                </div>
                <hr class="card-divider">
                <div class="total-summary tickets-gerais">
                    <h4>Tickets Gerais</h4>
                    <p class="total-value ${getGoalStatusClass(totalGeralTickets, metaTicketGeral)}">
                        ${totalGeralTickets} ${metaTicketGeral ? `/ ${metaTicketGeral}` : ''}
                    </p>
                </div>
            </div>

            <div class="single-metric-card">
                 <h4>Dúvidas</h4>
                 <p class="metric-value ${getGoalStatusClass(duvidasRespondidas, metaDuvidas)}">${duvidasRespondidas} / ${metaDuvidas}</p>
            </div>
            <div class="single-metric-card">
                 <h4>Devoluções</h4>
                 <p class="metric-value ${getGoalStatusClass(devolucoesRealizadas, metaDevolucao)}">${devolucoesRealizadas} / ${metaDevolucao}</p>
            </div>

        </div>
    `;

    container.appendChild(card);

    if (needsChamadoId) {
        const saveBtn = document.getElementById('btn-save-ingame-id');
        const input = document.getElementById('in-game-id-input');
        if (saveBtn && input) {
            saveBtn.addEventListener('click', async () => {
                const gameId = input.value.trim();
                // Lógica diferente do metas.js: Busca o ID do input de pesquisa, não da sessão
                const discordIdInput = document.getElementById('discord-id-search');
                const discordId = discordIdInput ? discordIdInput.value.trim() : user.id;

                if (!gameId || !/^\d+$/.test(gameId) || !discordId) {
                    alert('Por favor, insira um ID de jogo válido.');
                    return;
                }

                saveBtn.textContent = 'Salvando...';
                saveBtn.disabled = true;

                try {
                    const response = await fetch('/api/save-user-ingame-id', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ in_game_id: gameId, discord_id: discordId })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || 'Falha ao salvar o ID.');

                    document.getElementById('btn-update-metas').click();

                } catch (error) {
                    alert(`Erro: ${error.message}`);
                    saveBtn.textContent = 'Salvar';
                    saveBtn.disabled = false;
                }
            });
        }
    }
}


async function main() {
    try {
        const [userResponse, reportsResponse] = await Promise.all([
            fetch('/api/user'),
            fetch('/api/reports-data')
        ]);

        if (handleUnauthorized(userResponse) || handleUnauthorized(reportsResponse)) return;

        const reportsData = await reportsResponse.json();
        const loggedInUser = await userResponse.json();

        const userProfileDiv = document.getElementById('nav-user-profile');
        if (userProfileDiv) {
            userProfileDiv.innerHTML = `<img src="${loggedInUser.avatarUrl}" alt="Avatar" class="nav-user-avatar"><span>${loggedInUser.username}</span>`;
        }

        const updateMetas = async (startDate, endDate) => {
            const discordId = document.getElementById('discord-id-search').value.trim();
            if (!discordId || !/^\d{17,19}$/.test(discordId)) {
                alert("Por favor, insira um ID do Discord válido.");
                return;
            }

            const container = document.getElementById('goal-card-container');
            container.innerHTML = `<div class="loading-placeholder"><div class="spinner"></div><p>Buscando dados do usuário e metas...</p></div>`;

            try {
                const searchedUserResponse = await fetch(`/api/get-user-by-discord-id?discord_id=${discordId}`);
                if (!searchedUserResponse.ok) {
                    const err = await searchedUserResponse.json();
                    throw new Error(err.error || "Usuário não encontrado no servidor.");
                }
                const searchedUser = await searchedUserResponse.json();

                if (!window.METAS_CONFIG) throw new Error("Configuração de metas não encontrada.");

                const userSigla = extractRoleSigla(searchedUser.username);
                const cargoInfo = window.METAS_CONFIG.find(cargo => cargo.sigla_cargo === userSigla);

                if (userSigla && cargoInfo) {
                    const stats = await calculateUserStats(searchedUser.id, reportsData, startDate, endDate);
                    renderUserGoalCard(searchedUser, cargoInfo, stats);
                } else {
                     container.innerHTML = `<p style="color: #aeb2d5; text-align: center;">O cargo do usuário (${userSigla || 'N/A'}) não possui metas definidas.</p>`;
                }
            } catch (error) {
                 container.innerHTML = `<p style="color: #ff6b6b; text-align: center;">${error.message}</p>`;
            }
        };

        const picker = new Litepicker({
            element: document.getElementById('date-range-picker'),
            singleMode: false,
            format: 'DD/MM/YYYY',
        });

        const updateButton = document.getElementById('btn-update-metas');
        updateButton.addEventListener('click', () => {
            const startDate = picker.getStartDate();
            const endDate = picker.getEndDate();
            if (startDate && endDate) {
                updateMetas(startDate.dateInstance, endDate.dateInstance);
            } else {
                alert("Por favor, selecione um intervalo de datas.");
            }
        });

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        picker.setDateRange(firstDayOfMonth, today);

    } catch (error) {
        console.error('Erro ao inicializar a página de metas:', error);
        const container = document.getElementById('goal-card-container');
        if(container) container.innerHTML = `<p style="color: #ff6b6b; text-align: center;">Falha ao carregar os dados das metas. Verifique o console para mais detalhes.</p>`;
    }
}

window.addEventListener('DOMContentLoaded', main);