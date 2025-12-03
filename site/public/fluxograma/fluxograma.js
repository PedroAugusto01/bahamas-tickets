document.addEventListener('DOMContentLoaded', async () => {
    // IDs de cargos atualizados
    const ROLE_IDS = {
        STAFF: "1057449425728974989",
        SPV_GERAL: "1102984564005154969",
        SPV: "1057449398721855498",
        ADM: "1311492362605690910",
        MOD: "1311493209599246367", 
        SUP: "1057449408142246038", 
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

    const loadingView = document.getElementById('loading-view');
    const pastasView = document.getElementById('pastas-view');
    const chartView = document.getElementById('chart-view');
    const chartContainer = document.getElementById('chart-container');
    const chartTitle = document.getElementById('chart-title');
    const backBtn = document.getElementById('back-to-pastas-btn');
    const summaryTableContainer = document.getElementById('summary-table-container'); 
    const mainTitle = document.querySelector('.container > h1'); // Seleciona o H1 principal

    let orgData = null; // Cache

    // Carrega o perfil do usuário na NAV
    (async function loadNavUser() {
        try {
            const response = await fetch('/api/user');
            if (response.status === 401) { window.location.href = '/'; return; }
            if (!response.ok) throw new Error('Falha ao buscar usuário da nav');
            const user = await response.json();
            const userProfileDiv = document.getElementById('nav-user-profile');
            if (userProfileDiv) {
                userProfileDiv.innerHTML = `<img src="${user.avatarUrl}" alt="Avatar" class="nav-user-avatar"><span>${user.username}</span>`;
            }
        } catch (error) { console.error('Erro ao buscar dados do usuário:', error); }
    })();

    // Função para buscar e processar os dados da organização
    async function fetchOrgData() {
        try {
            const response = await fetch('/api/get-org-data'); 
            if (response.status === 401) { window.location.href = '/'; return null; }
            if (!response.ok) throw new Error(`Falha ao buscar dados: ${response.statusText}`);
            
            const members = await response.json(); 
            
            const data = {
                supervisoresGerais: [],
                pastas: {}
            };
            
            const allSupervisores = [];
            const allAdministradores = [];
            const allModeradores = []; 
            const allSuportes = []; 

            // 2. Inicializa as pastas
            for (const pastaName in ROLE_IDS.PASTAS) {
                data.pastas[pastaName] = {
                    nome: pastaName,
                    supervisores: [],
                    administradores: [],
                    moderadores: [], 
                    suportes: [], 
                    responsaveis: [],
                    equipe: [],
                    totalCount: 0, 
                    equipeCount: 0
                };
            }

            // 3. Processa cada membro, categorizando-os
            for (const member of members) {
                const memberRoles = new Set(member.roles);

                if (memberRoles.has(ROLE_IDS.SPV_GERAL)) data.supervisoresGerais.push(member);
                if (memberRoles.has(ROLE_IDS.SPV)) allSupervisores.push(member);
                if (memberRoles.has(ROLE_IDS.ADM)) allAdministradores.push(member);
                if (memberRoles.has(ROLE_IDS.MOD)) allModeradores.push(member); 
                if (memberRoles.has(ROLE_IDS.SUP)) allSuportes.push(member); 

                for (const pastaName in ROLE_IDS.PASTAS) {
                    const pastaRoleIds = ROLE_IDS.PASTAS[pastaName];
                    if (memberRoles.has(pastaRoleIds.resp)) {
                        data.pastas[pastaName].responsaveis.push(member);
                    } else if (memberRoles.has(pastaRoleIds.equipe)) {
                        data.pastas[pastaName].equipe.push(member);
                    }
                }
            }
            
            // 4. Vincula líderes às pastas (SOMENTE se tiverem o cargo RESP)
            for (const pastaName in data.pastas) {
                const pasta = data.pastas[pastaName];
                const responsaveisIds = new Set(pasta.responsaveis.map(m => m.id));
                if (responsaveisIds.size === 0) continue; 
                
                pasta.supervisores = allSupervisores.filter(spv => responsaveisIds.has(spv.id));
                pasta.administradores = allAdministradores.filter(adm => responsaveisIds.has(adm.id));
                pasta.moderadores = allModeradores.filter(mod => responsaveisIds.has(mod.id)); 
                pasta.suportes = allSuportes.filter(sup => responsaveisIds.has(sup.id)); 
            }

            // 5. CALCULAR CONTAGENS TOTAIS
            for (const pastaName in data.pastas) {
                const pasta = data.pastas[pastaName];
                const respIds = new Set(pasta.responsaveis.map(m => m.id));
                
                // Cálculo 1: "Nº Equipe" (Apenas membros da equipe que NÃO são Resps)
                const equipePura = pasta.equipe.filter(e => !respIds.has(e.id));
                pasta.equipeCount = equipePura.length; 
                
                // Cálculo 2: "Total de Pessoas" (SPVs Resp + Equipe Pura)
                pasta.totalCount = pasta.supervisores.length + pasta.equipeCount;
            }

            return data;

        } catch (error) {
            console.error("Erro ao buscar ou processar dados da organização:", error);
            loadingView.innerHTML = `<p style="color: #ff6b6b;">Erro ao carregar dados. ${error.message}</p>`;
            return null;
        }
    }

    // Função para renderizar um card de membro
    function createMemberCard(member) {
        if (!member) return ''; 
        return `
        <div class="member-card">
            <img src="${member.avatar_url || '/images/logo.png'}" alt="Avatar">
            <span>${member.name || 'N/A'}</span>
        </div>
        `;
    }

    // Renderiza a tabela de resumo
    function renderSummaryTable(data) {
        if (!summaryTableContainer) return;
        
        const pastasArray = Object.values(data.pastas).sort((a,b) => a.nome.localeCompare(b.nome));
        
        const tableRows = pastasArray.map(pasta => `
            <tr>
                <td>${pasta.nome}</td>
                <td>${pasta.supervisores.length}</td>
                <td>${pasta.equipeCount}</td>
                <td>${pasta.totalCount}</td>
            </tr>
        `).join('');

        summaryTableContainer.innerHTML = `
            <h2>Resumo das Pastas</h2>
            <div class="table-wrapper">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>Pasta</th>
                            <th>Nº SPVs (Resp)</th>
                            <th>Nº Equipe</th> 
                            <th>Total de Pessoas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
        summaryTableContainer.classList.remove('hidden');
    }

    // Renderiza a visão de Pastas (SIMPLES, SÓ PASTAS)
    function renderPastasView(data) {
        pastasView.innerHTML = ''; // Limpa a view
        
        const allPastaNames = Object.keys(data.pastas);
        allPastaNames.sort(); // Ordena alfabeticamente

        const pastasHtml = allPastaNames.map(pastaName => 
            `<button class="pasta-button" data-pasta="${pastaName}">${pastaName}</button>`
        ).join('');
        
        const gridEl = document.createElement('div');
        gridEl.className = 'pastas-grid-container';
        gridEl.innerHTML = `<div class="pastas-grid">${pastasHtml}</div>`;
        pastasView.appendChild(gridEl);

        renderSummaryTable(data);

        loadingView.classList.add('hidden');
        chartView.classList.add('hidden');
        pastasView.classList.remove('hidden');
        
        // --- LINHA ADICIONADA ---
        if (mainTitle) mainTitle.classList.remove('hidden'); // Mostra o H1
    }

    // Função para renderizar a visão do Fluxograma
    function renderChartView(pastaName) {
        const pastaData = orgData.pastas[pastaName];
        chartTitle.textContent = `Fluxograma: ${pastaName}`;
        
        chartContainer.innerHTML = ''; // Limpa o container
        
        const alreadyDisplayedIds = new Set();
        
        // Nível 1: Supervisor Geral (Todos)
        if (orgData.supervisoresGerais.length > 0) {
            const spvGeralHtml = orgData.supervisoresGerais.map(member => {
                alreadyDisplayedIds.add(member.id);
                return createMemberCard(member);
            }).join('');
            chartContainer.innerHTML += `
            <div class="org-level">
                <div class="org-level-title">Supervisor Geral</div>
                ${spvGeralHtml}
            </div>`;
        }
        
        // Nível 2: Supervisor (SPVs que são "Resp")
        if (pastaData.supervisores.length > 0) {
             const spvHtml = pastaData.supervisores.map(member => {
                alreadyDisplayedIds.add(member.id);
                return createMemberCard(member);
             }).join('');
             chartContainer.innerHTML += `
            <div class="org-level">
                <div class="org-level-title">Supervisor(es) da Pasta</div>
                ${spvHtml}
            </div>`;
        }
        
        // Nível 3: Liderança da Pasta (APENAS ADMs que são "Resp")
        const admHtml = pastaData.administradores.map(member => {
            alreadyDisplayedIds.add(member.id);
            return createMemberCard(member);
        }).join('');
        
        if (admHtml) {
            chartContainer.innerHTML += `
            <div class="org-level">
                <div class="org-level-title">Liderança da Pasta (ADM)</div>
                ${admHtml}
            </div>`;
        }
        
        // Nível 4: Equipe
        const equipeCompletaMap = new Map();
        
        // 1. Adiciona todos da "Equipe"
        for (const member of pastaData.equipe) {
            equipeCompletaMap.set(member.id, member);
        }

        // 2. Adiciona "Resps" restantes (que não foram exibidos acima)
        const outrosResponsaveis = pastaData.responsaveis.filter(resp => 
            !alreadyDisplayedIds.has(resp.id) 
        );
        for (const member of outrosResponsaveis) {
            equipeCompletaMap.set(member.id, member);
        }

        const equipeCompleta = Array.from(equipeCompletaMap.values());

        if (equipeCompleta.length > 0) {
             equipeCompleta.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
             
             const equipeHtml = equipeCompleta.map(createMemberCard).join('');
             chartContainer.innerHTML += `
            <div class="org-level">
                <div class="org-level-title">Equipe (${equipeCompleta.length})</div>
                ${equipeHtml}
            </div>`;
        }

        pastasView.classList.add('hidden');
        summaryTableContainer.classList.add('hidden'); 
        chartView.classList.remove('hidden');
        
        // --- LINHA ADICIONADA ---
        if (mainTitle) mainTitle.classList.add('hidden'); // Esconde o H1
    }

    // --- Event Listeners ---
    pastasView.addEventListener('click', (e) => {
        if (e.target.classList.contains('pasta-button')) {
            const pastaName = e.target.dataset.pasta;
            renderChartView(pastaName);
        }
    });

    backBtn.addEventListener('click', () => {
        renderPastasView(orgData); // Recarrega a visão das pastas e da tabela
    });

    // --- Inicialização ---
    orgData = await fetchOrgData();
    if (orgData) {
        renderPastasView(orgData);
    }
});