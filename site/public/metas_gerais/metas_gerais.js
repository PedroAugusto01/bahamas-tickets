document.addEventListener('DOMContentLoaded', async () => {
    // Referências do DOM
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const btnUpdate = document.getElementById('btn-update-dashboard');
    const btnSyncChamados = document.getElementById('btn-sync-chamados');
    const btnExport = document.getElementById('btn-export-excel');
    const tableBody = document.querySelector('#ranking-table tbody');
    const syncModal = document.getElementById('sync-modal');
    const syncStatusText = document.getElementById('sync-status-text');
    const syncCounter = document.getElementById('sync-counter');
    const syncProgressBar = document.getElementById('sync-progress-bar');
    const syncLogsList = document.getElementById('sync-logs-list');
    const btnCloseModal = document.getElementById('btn-close-modal');
    
    // Variáveis de Estado
    let allReports = [];
    let allMembers = [];
    let hoursData = [];
    let chamadosData = {}; // Cache de chamados {discord_id: total}
    let processedData = [];
    let charts = {}; // Para armazenar instâncias do Chart.js

    // --- CONFIGURAÇÃO DE CARGOS E PASTAS ---
    const ROLE_CONFIG = {
        HIERARCHY: {
            "1102984564005154969": { name: "Supervisor Geral", order: 1 },
            "1057449398721855498": { name: "Supervisor", order: 2 },
            "1311492362605690910": { name: "Administrador", order: 3 },
            "1311493209599246367": { name: "Moderador", order: 4 },
            "1057449408142246038": { name: "Suporte", order: 5 }
        },
        PASTAS: {
            "Ilegal": { resp: "1444562339197095936", equipe: "1057449414962192464" },
            "Screen Share": { resp: "1197218308857024512", equipe: "1247671023717843046" },
            "Polícia": { resp: "1444562583116845056", equipe: "1057449416333733900" },
            "Tickets": { resp: "1444565921082507410", equipe: "1407826004478656552" },
            "Bombeiro": { resp: "1444564502539538466", equipe: "1118555658598482140" },
            "Hollywood": { resp: "1444566498193707178", equipe: "1444574566188974182" },
            "Eventos": { resp: "1057449420595142776", equipe: "1396019648318668871" },
            "Hospital": { resp: "1444566905485525143", equipe: "1057449419609489408" },
            "Mecânica": { resp: "1444564085118341141", equipe: "1057449421631131818" },
            "Entrevistador": { resp: "1444568550093226107", equipe: "1057449413984919552" },
            "Chamados": { resp: "1444566292857356389", equipe: "1414100133532012564" },
            "Influencer": { resp: "1444566221662978139", equipe: "1128021391355166762" },
            "Jornal": { resp: "1444566790834229259", equipe: "1366484111476265101" },
            "Logs": { resp: "1444847080274264194", equipe: "1444578452794769449" },
            "Judiciário": { resp: "1444566648471425179", equipe: "1057449415733948427" },
            "Red Light": { resp: "1444566121020915863", equipe: "1428924352052854906"},
            "Tropical": { resp: "1444567263356256358", equipe: "1100504029357936740" }
        }
    };

    // Configuração do Date Picker
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const picker = new Litepicker({
        element: document.getElementById('date-range-picker'),
        singleMode: false,
        format: 'DD/MM/YYYY',
        startDate: firstDay,
        endDate: today
    });

    // --- Funções Auxiliares ---

    function showLoading(msg) { loadingText.textContent = msg; loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { loadingOverlay.classList.add('hidden'); }

    // Identifica Cargo e Pasta baseado nos IDs do usuário
    function identifyStaffDetails(userRoles) {
        let cargo = "N/A";
        let pasta = "N/A";
        let highestOrder = 99;

        // Determinar Hierarquia (Cargo)
        for (const [id, info] of Object.entries(ROLE_CONFIG.HIERARCHY)) {
            if (userRoles.includes(id)) {
                if (info.order < highestOrder) {
                    highestOrder = info.order;
                    cargo = info.name;
                }
            }
        }

        // Determinar Pasta (Concatenar se tiver múltiplas)
        let pastasFound = [];
        for (const [nomePasta, ids] of Object.entries(ROLE_CONFIG.PASTAS)) {
            if (userRoles.includes(ids.resp)) {
                pastasFound.push(`${nomePasta} (Resp)`);
            } else if (userRoles.includes(ids.equipe)) {
                pastasFound.push(nomePasta);
            }
        }
        if (pastasFound.length > 0) {
            pasta = pastasFound.join(", ");
        }

        return { cargo, pasta };
    }

    // --- FUNÇÕES DO MODAL DE SYNC ---
    
    let pollingInterval = null;

    async function startSyncPolling() {
        // Limpa logs antigos
        syncLogsList.innerHTML = '';
        syncProgressBar.style.width = '0%';
        syncStatusText.textContent = 'Inicializando...';
        btnCloseModal.classList.add('hidden');
        syncModal.classList.remove('hidden');

        pollingInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/chamados-sync-status');
                if (!response.ok) return;
                
                const status = await response.json();
                updateSyncModal(status);

                if (status.completed) {
                    clearInterval(pollingInterval);
                    syncStatusText.textContent = "Sincronização Concluída!";
                    btnCloseModal.classList.remove('hidden');
                    // Atualiza os dados gerais automaticamente ao finalizar
                    await fetchAllData();
                    processMetrics();
                }
            } catch (e) {
                console.error("Erro no polling:", e);
            }
        }, 1500); // Consulta a cada 1.5 segundos
    }

    function updateSyncModal(status) {
        const pct = status.total > 0 ? Math.round((status.processed / status.total) * 100) : 0;
        syncProgressBar.style.width = `${pct}%`;
        syncCounter.textContent = `${status.processed}/${status.total}`;
        
        if (status.is_running) {
            syncStatusText.textContent = `Processando: ${status.current_staff}`;
        }

        // Atualiza logs (apenas se tiver novos, ou redesenha tudo - simplificado redesenha tudo ou pega os últimos)
        // Para não pesar, vamos redesenhar apenas se o tamanho mudou ou limitar
        syncLogsList.innerHTML = status.logs.map(log => `<li>${log}</li>`).join('');
        
        // Auto-scroll para o fim
        const container = document.querySelector('.sync-logs-container');
        container.scrollTop = container.scrollHeight;
    }

    async function syncChamados() {
        if (!confirm("Deseja iniciar a sincronização de chamados?")) return;

        try {
            const staffList = allMembers.map(m => ({ discord_id: m.id, username: m.name }));
            const startDate = picker.getStartDate().dateInstance.toISOString().split('T')[0];
            const endDate = picker.getEndDate().dateInstance.toISOString().split('T')[0];

            const response = await fetch('/api/trigger-chamados-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staff_list: staffList, start_date: startDate, end_date: endDate })
            });

            if (response.ok) {
                startSyncPolling();
            } else {
                if (response.status === 409) {
                     // Já rodando, só abre o modal
                     startSyncPolling();
                } else {
                    alert("Erro ao iniciar sync.");
                }
            }
        } catch (error) {
            alert("Erro: " + error.message);
        }
    }

    // --- Fetch de Dados ---

    async function fetchAllData() {
        try {
            showLoading('Buscando dados da organização...');
            
            // 1. Busca todos os membros da Staff
            const orgResponse = await fetch('/api/get-org-data');
            if (!orgResponse.ok) throw new Error('Falha ao buscar membros da staff.');
            allMembers = await orgResponse.json();

            showLoading('Baixando histórico de relatórios...');
            // 2. Busca TODOS os relatórios
            const reportResponse = await fetch('/api/reports-data');
            if (!reportResponse.ok) throw new Error('Falha ao buscar relatórios.');
            allReports = await reportResponse.json();

            showLoading('Buscando dados de horas...');
            // 3. Busca horas (mês atual da data de início selecionada)
            const startMonth = picker.getStartDate().dateInstance.getMonth() + 1;
            const hoursResponse = await fetch(`/api/get-hours-data?month=${startMonth}`);
            const hoursJson = await hoursResponse.json();
            hoursData = (hoursJson.success && hoursJson.users) ? hoursJson.users : [];

            // 4. Buscar Chamados Cacheados
            showLoading('Buscando chamados sincronizados...');
            const startDateStr = picker.getStartDate().dateInstance.toISOString().split('T')[0];
            const endDateStr = picker.getEndDate().dateInstance.toISOString().split('T')[0];
            const chamadosResponse = await fetch(`/api/get-cached-chamados?start_date=${startDateStr}&end_date=${endDateStr}`);
            if (chamadosResponse.ok) {
                chamadosData = await chamadosResponse.json();
            }

            return true;
        } catch (error) {
            console.error(error);
            alert("Erro ao carregar dados: " + error.message);
            hideLoading();
            return false;
        }
    }

    // --- Funções de Cálculo Específicas para o Dashboard ---

    function countSpecificReports(userId, reports) {
        let banHack = 0;
        let pagouAdv = 0;
        let prisoes = 0;
        let prisaoStaff = 0;
        let revisaoNegada = 0;

        reports.forEach(report => {
            let staffIds = [];
            try {
                if (report.staff_mencionado) {
                    staffIds = JSON.parse(report.staff_mencionado);
                    if (!Array.isArray(staffIds)) staffIds = [String(staffIds)];
                }
            } catch (e) {
                staffIds = String(report.staff_mencionado).replace(/[\[\]"]/g, '').split(',').map(id => id.trim()).filter(id => id);
            }

            if (!staffIds.includes(userId)) return;

            // Ban Hack
            if (report.report_type === 'ban_applied' && (report.tipo_relatorio === 'RELATÓRIO BAN-HACK' || (report.details && report.details.includes('Hack')))) {
                banHack++;
            }

            // Pagou ADV
            if (report.report_type === 'adv_paid') {
                pagouAdv++;
            }

            // Prisões (Geral)
            if (report.tipo_relatorio === 'RELATÓRIO PRISÃO' || (report.report_type === 'adv_applied' && (report.details && report.details.includes('meses')))) {
                prisoes++;
            }

            // Prisão Staff
            if (report.tipo_relatorio === 'RELATÓRIO PRISÃO-STAFF') {
                prisaoStaff++;
            }

            // Revisão Negada
            if (report.report_type === 'ticket_denied' && report.tipo_relatorio === 'TICKET-REVISÃO NEGADO') {
                revisaoNegada++;
            }
        });

        return { banHack, pagouAdv, prisoes, prisaoStaff, revisaoNegada };
    }


    // --- Processamento Principal ---

    async function processMetrics() {
        showLoading('Processando métricas e calculando rankings...');
        
        await new Promise(r => setTimeout(r, 50)); // UI Refresh

        const startDate = picker.getStartDate().dateInstance;
        const endDate = picker.getEndDate().dateInstance;
        endDate.setHours(23, 59, 59, 999);

        // Filtra relatórios pela data UMA VEZ
        const periodReports = allReports.filter(r => {
            const rDate = new Date(r.timestamp);
            return rDate >= startDate && rDate <= endDate;
        });

        const staffMetrics = [];

        for (const member of allMembers) {
            const userId = member.id;
            const username = member.name;
            const details = identifyStaffDetails(member.roles); // Identifica Cargo e Pasta

            // 1. Horas
            let userHours = 0;
            const userHoursData = hoursData.find(u => u.userId === userId);
            if (userHoursData) {
                userHours = Math.floor(userHoursData.monthlySeconds / 3600);
            }

            // 2. Chamados (Cache)
            const chamadosCidade = chamadosData[userId] || 0;

            // 3. Métricas Padrão (reutilizando scripts existentes)
            const statsAtendimento = calculateAtendimentoStats(userId, periodReports, startDate, endDate);
            const statsDuvidas = calculateDuvidasStats(userId, periodReports, startDate, endDate);
            const statsTickets = calculateTicketsStats(userId, periodReports, startDate, endDate);
            const statsDevolucao = calculateDevolucaoStats(userId, periodReports, startDate, endDate);

            // 4. Métricas Específicas
            const statsExtras = countSpecificReports(userId, periodReports);

            // Total Geral
            const totalGeral = 
                statsAtendimento.atendimentoRealizado + 
                statsAtendimento.auxilioRealizado +
                statsTickets.ticketsDenunciaAceitos +
                statsTickets.ticketsDenunciaNegados +
                statsTickets.ticketsRevisaoAceitos +
                statsTickets.ticketsRevisaoNegados +
                statsTickets.ticketsBug +
                statsTickets.ticketsSuporte +
                statsDuvidas.duvidasRespondidas +
                statsDevolucao.devolucoesRealizadas +
                statsExtras.banHack +
                chamadosCidade;

            staffMetrics.push({
                id: userId,
                name: username,
                cargo: details.cargo,
                pasta: details.pasta,
                horas: userHours,
                
                // Dados Padrão
                regSup: statsAtendimento.atendimentoRealizado,
                auxSup: statsAtendimento.auxilioRealizado,
                tDenuncia: statsTickets.ticketsDenunciaAceitos + statsTickets.ticketsDenunciaNegados,
                tRevisao: statsTickets.ticketsRevisaoAceitos + statsTickets.ticketsRevisaoNegados,
                tRevisaoAceita: statsTickets.ticketsRevisaoAceitos,
                tRevisaoNegada: statsTickets.ticketsRevisaoNegados,
                tBug: statsTickets.ticketsBug,
                tSuporte: statsTickets.ticketsSuporte,
                duvidas: statsDuvidas.duvidasRespondidas,
                devolucao: statsDevolucao.devolucoesRealizadas,
                
                // Dados Extras e Cache
                chamados: chamadosCidade,
                banHack: statsExtras.banHack,
                pagouAdv: statsExtras.pagouAdv,
                prisoes: statsExtras.prisoes,
                prisaoStaff: statsExtras.prisaoStaff,
                punicoes: 0, 
                
                total: totalGeral
            });
        }

        // Ordena por Total Geral
        staffMetrics.sort((a, b) => b.total - a.total);
        
        processedData = staffMetrics;
        updateUI();
        hideLoading();
    }

    // --- Atualização da UI ---

    function updateUI() {
        renderKPIs();
        renderTable();
        renderCharts();
    }

    function renderKPIs() {
        const totalTickets = processedData.reduce((acc, u) => acc + u.tDenuncia + u.tRevisao + u.tBug + u.tSuporte, 0);
        const totalAtendimentos = processedData.reduce((acc, u) => acc + u.regSup + u.auxSup, 0);
        const totalHoras = processedData.reduce((acc, u) => acc + u.horas, 0);
        const totalDuvidas = processedData.reduce((acc, u) => acc + u.duvidas, 0);

        const topTickets = [...processedData].sort((a,b) => (b.tDenuncia + b.tRevisao + b.tBug + b.tSuporte) - (a.tDenuncia + a.tRevisao + a.tBug + a.tSuporte))[0];
        const topAtend = [...processedData].sort((a,b) => (b.regSup + b.auxSup) - (a.regSup + a.auxSup))[0];
        const topHoras = [...processedData].sort((a,b) => b.horas - a.horas)[0];
        const topDuvidas = [...processedData].sort((a,b) => b.duvidas - a.duvidas)[0];

        document.getElementById('kpi-total-tickets').textContent = totalTickets;
        document.getElementById('top-tickets').textContent = topTickets ? `${topTickets.name}` : '-';

        document.getElementById('kpi-total-atendimentos').textContent = totalAtendimentos;
        document.getElementById('top-atendimento').textContent = topAtend ? `${topAtend.name}` : '-';

        document.getElementById('kpi-total-horas').textContent = totalHoras + 'h';
        document.getElementById('top-horas').textContent = topHoras ? `${topHoras.name}` : '-';

        document.getElementById('kpi-total-duvidas').textContent = totalDuvidas;
        document.getElementById('top-duvidas').textContent = topDuvidas ? `${topDuvidas.name}` : '-';
    }

    function renderTable() {
        tableBody.innerHTML = '';
        
        processedData.forEach((user, index) => {
            const rankClass = index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : (index === 2 ? 'rank-3' : ''));
            const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));

            const row = `
                <tr class="${rankClass}">
                    <td>${medal}</td>
                    <td style="text-align: left; font-weight: 500;">${user.name}</td>
                    <td><span class="badge-role">${user.cargo}</span></td>
                    <td style="font-size: 0.9em; color: #aeb2d5;">${user.pasta}</td>
                    <td>${user.horas}</td>
                    <td>${user.chamados}</td>
                    <td>${user.regSup}</td>
                    <td>${user.auxSup}</td>
                    <td>${user.tDenuncia}</td>
                    <td>${user.tRevisao}</td>
                    
                    <td>${user.tBug}</td>
                    <td>${user.tSuporte}</td>
                    <td>${user.banHack}</td>
                    <td>${user.duvidas}</td>
                    <td>${user.devolucao}</td>
                    <td><strong>${user.total}</strong></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    function renderCharts() {
        const top10 = processedData.slice(0, 10);
        const labels = top10.map(u => u.name.split(' ')[0]);

        // Gráfico 1: Tickets (Empilhado)
        const ctxTickets = document.getElementById('ticketsChart').getContext('2d');
        if (charts.tickets) charts.tickets.destroy();

        charts.tickets = new Chart(ctxTickets, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Denúncias',
                        data: top10.map(u => u.tDenuncia),
                        backgroundColor: '#8b5cf6',
                        borderRadius: 4,
                        stack: 'Stack 0',
                    },
                    {
                        label: 'Revisões',
                        data: top10.map(u => u.tRevisao),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4,
                        stack: 'Stack 0',
                    },
                    {
                        label: 'Ban Hack',
                        data: top10.map(u => u.banHack),
                        backgroundColor: '#ef4444',
                        borderRadius: 4,
                        stack: 'Stack 0',
                    },
                    {
                        label: 'Suporte',
                        data: top10.map(u => u.tSuporte),
                        backgroundColor: '#06b6d4',
                        borderRadius: 4,
                        stack: 'Stack 0',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Top 10 - Distribuição de Tickets', 
                        color: '#fff',
                        font: { size: 16 }
                    },
                    legend: { labels: { color: '#aeb2d5' } }
                },
                scales: {
                    x: { ticks: { color: '#aeb2d5' }, grid: { display: false } },
                    y: { ticks: { color: '#aeb2d5' }, grid: { color: 'rgba(255,255,255,0.05)' }, stacked: true }
                }
            }
        });

        // Gráfico 2: Atendimentos e Dúvidas (Linha)
        const ctxAttendance = document.getElementById('attendanceChart').getContext('2d');
        if (charts.attendance) charts.attendance.destroy();

        charts.attendance = new Chart(ctxAttendance, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { 
                        label: 'Total Atendimentos', 
                        data: top10.map(u => u.regSup + u.auxSup), 
                        borderColor: '#4ade80', 
                        backgroundColor: 'rgba(74, 222, 128, 0.2)',
                        fill: true,
                        tension: 0.4
                    },
                    { 
                        label: 'Dúvidas', 
                        data: top10.map(u => u.duvidas), 
                        borderColor: '#ff6b6b', 
                        backgroundColor: 'rgba(255, 107, 107, 0.2)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Top 10 - Atendimentos e Dúvidas', color: '#fff' },
                    legend: { labels: { color: '#aeb2d5' } }
                },
                scales: {
                    x: { ticks: { color: '#aeb2d5' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aeb2d5' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // --- Exportar Excel ---

    btnExport.addEventListener('click', () => {
        if (processedData.length === 0) {
            alert('Sem dados para exportar. Clique em Atualizar primeiro.');
            return;
        }

        const excelData = processedData.map(u => ({
            "USER": u.id,
            "NOME": u.name,
            "CARGO": u.cargo,
            "PASTA": u.pasta,
            "HORAS": u.horas,
            "CHAMADOS": u.chamados,
            "REGISTRO_SUP": u.regSup,
            "AUXILIO_SUP": u.auxSup,
            "TCS_DE_PUN": u.tDenuncia,
            "REVISÃO": u.tRevisaoAceita,
            "REVISÃO_NEG": u.tRevisaoNegada,
            "PUNIÇÕES": u.punicoes,
            "DEVOLUÇÃO": u.devolucao,
            "BAN_HACK": u.banHack,
            "DISCORD": 0, // Placeholder
            "PAGOU_ADV": u.pagouAdv,
            "PRISÕES": u.prisoes,
            "PRISÃO_STAFF": u.prisaoStaff,
            "DÚVIDAS": u.duvidas,
            "ATENDIMENTOS": u.regSup + u.auxSup,
            "TICKETS_SUPORTE": u.tSuporte,
            "TICKETS_BUG": u.tBug,
            "RECUPERACAO": 0 // Placeholder
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Metas Gerais");

        const dateStr = picker.getStartDate().dateInstance.toLocaleDateString('pt-BR').replace(/\//g, '-');
        XLSX.writeFile(wb, `Metas_Gerais_CPX_${dateStr}.xlsx`);
    });

    // --- Inicialização ---

    btnUpdate.addEventListener('click', async () => {
        if (allMembers.length === 0) {
            const success = await fetchAllData();
            if (success) processMetrics();
        } else {
            // Se já tem dados baixados, apenas recalcula com a nova data
            processMetrics();
        }
    });

    btnCloseModal.addEventListener('click', () => {
        syncModal.classList.add('hidden');
    });

    btnSyncChamados.addEventListener('click', syncChamados);

    if (window.loadNavUserProfile) window.loadNavUserProfile();
    else {
        fetch('/api/user').then(r => r.json()).then(user => {
            document.getElementById('nav-user-profile').innerHTML = 
                `<img src="${user.avatarUrl}" class="nav-user-avatar"><span>${user.username}</span>`;
        }).catch(e => console.error(e));
    }

    // Auto-load inicial
    const initialSuccess = await fetchAllData();
    if (initialSuccess) {
        processMetrics();
    }
});