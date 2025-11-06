window.reportUtils = {
    createSection(title, contentHtml, sectionsEl, { id = '', onCopy = null, copyText = null } = {}) {
        const el = document.createElement('div');
        el.className = 'step4-section';
        if (id) el.id = id;
        el.innerHTML = `<h4>${title.replace(/^##\s*/, '')}</h4><button class="copy-section-btn">Copiar</button><div class="section-content">${contentHtml}</div>`;
        const copyBtn = el.querySelector('.copy-section-btn');
        copyBtn.addEventListener('click', async () => {
            try {
                if (typeof onCopy === 'function') await onCopy(el);
                else {
                    let text;
                    if (copyText !== null) text = copyText;
                    else {
                        const contentText = el.querySelector('.section-content').innerText;
                        text = title.startsWith('##') ? `${title}\n${contentText}` : contentText;
                    }
                    await navigator.clipboard.writeText(text);
                }
                copyBtn.textContent = 'Copiado!';
            } catch (err) { console.error("Erro ao copiar:", err); copyBtn.textContent = 'Erro!'; }
            setTimeout(() => copyBtn.textContent = 'Copiar', 2000);
        });
        if (sectionsEl) sectionsEl.appendChild(el);
        return el;
    },

    async copyMessageContent(sectionElement) {
        const main = sectionElement.querySelector('#message-preview-main');
        const final = sectionElement.querySelector('#message-preview-final');
        const devolucaoCheck = sectionElement.querySelector('#devolucao-check');
        if (!main || !final) throw new Error('Elementos de texto da mensagem não encontrados.');
        let textToCopy = main.innerText;
        if (devolucaoCheck?.checked) {
            const devolucaoContent = sectionElement.querySelector('#devolucao-msg-content');
            if (devolucaoContent) textToCopy += '\n\n' + devolucaoContent.innerText;
        }
        textToCopy += '\n\n' + final.innerText;
        await navigator.clipboard.writeText(textToCopy);
    },

    async copyImageToClipboard(sectionElement) {
        const img = sectionElement.querySelector('img');
        if (!img) throw new Error("Nenhuma imagem encontrada para copiar.");
        try {
            const response = await fetch(img.src); const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        } catch (error) { console.error('Falha ao copiar imagem:', error); throw error; }
    },

    async loadRulesJson() {
        const res = await fetch('/utils/tickets_result.json');
        if (!res.ok) {
             console.error("Falha ao carregar tickets_result.json");
             return { punicoes: [], negados: [] }; 
        }
        const data = await res.json();
        if (data.punicoes && !data.punicoes.some(p => p.regra === 'Loot Indevido')) {
             const defaultLootRule = window.ruleData.fullRuleSet.find(r => r.regra === 'Loot Indevido');
             if (defaultLootRule) {
                 data.punicoes.push({
                     regra: 'Loot Indevido',
                     punicao_minima: defaultLootRule.punicao_minima || 'verbal'
                 });
             } else {
                 data.punicoes.push({ regra: 'Loot Indevido', punicao_minima: 'verbal' }); 
             }
        }
        return data;
    },

    async fetchUserInfo(userId) {
        console.log(`[DEBUG_CLIENT] Chamando fetchUserInfo para ID: ${userId}`);
        if (!userId || !/^\d+$/.test(userId)) {
             console.log(`[DEBUG_CLIENT] ID inválido ou vazio: ${userId}`);
             return { error: `ID inválido fornecido: ${userId}`, user_info: null };
         }
        try {
            const res = await fetch(`/api/verificar-usuario`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId })
            });
            const userData = await res.json();
            console.log(`[DEBUG_CLIENT] Dados recebidos para ${userId}:`, JSON.stringify(userData, null, 2));
            if (res.ok) return userData;
            else {
                console.error(`[DEBUG_CLIENT] Erro do servidor para ${userId}:`, userData);
                return {
                    error: userData.error || `Falha na requisição com status ${res.status}`,
                    found_in_db: userData.found_in_db || false,
                    is_in_guild: userData.is_in_guild === false ? false : true,
                    user_info: userData.user_info
                };
            }
        } catch (e) { console.error(`[DEBUG_CLIENT] Falha crítica na requisição fetch para ${userId}:`, e); return { error: `Falha de rede ao buscar ID ${userId}`, user_info: null }; }
    },

    extractRevisitorId(logText) {
        if (!logText || typeof logText !== 'string') return null;
        const revistadorMatch = logText.match(/\[REVISTADOR\]:\s*.*?\((\d+)\)/);
        return revistadorMatch ? revistadorMatch[1] : null;
    },

    getNextPunishment(punishedInfo, basePunishment) {
        if (!punishedInfo) return basePunishment; 
        if (basePunishment === 'banido') return 'banido';

        const activePunishmentNames = new Set(punishedInfo.active_punishments_from_history || []);
        const currentDiscordRoleNames = new Set(punishedInfo.current_roles_from_discord || []);

        const levels = ['verbal', 'adv1', 'adv2', 'banido'];
        const nameToLevelMap = {
            "servidor・advertência verbal": "verbal",
            "servidor・advertência¹": "adv1",
            "servidor・advertência²": "adv2",
            "servidor・banido": "banido",
            "telagem・banido": "banido"
        };
        const userPunishmentLevels = new Set();

        const processName = (name) => {
            const lowerCaseName = name.toLowerCase();
            for (const key in nameToLevelMap) {
                if (lowerCaseName.includes(key.toLowerCase())) {
                    userPunishmentLevels.add(nameToLevelMap[key]);
                    break; 
                }
            }
        };

        activePunishmentNames.forEach(processName);
        currentDiscordRoleNames.forEach(processName);

        if (userPunishmentLevels.has('banido')) return 'banido';

        let levelIndex = levels.indexOf(basePunishment);
        if (levelIndex === -1) levelIndex = 0; 

        while (levelIndex < levels.length) {
            const currentLevel = levels[levelIndex];
            if (!userPunishmentLevels.has(currentLevel)) {
                return currentLevel;
            }
            levelIndex++;
        }
        return 'banido';
    },


    calculateItemsValue(selectedLogs, itemMapping, itemPrices) {
        let totalMulta = 0;
        const priceMap = itemPrices.reduce((acc, item) => { acc[item.name.toLowerCase()] = item.price; return acc; }, {});
        const itemsData = selectedLogs.map(s => {
            const spawnNameMatch = s.text.match(/\[PEGOU\]:\s*([^\[\n]+)/); const spawnName = spawnNameMatch ? spawnNameMatch[1].trim() : null;
            const quantityMatch = s.text.match(/\[QUANTIDADE\]:\s*(\d+)/); const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : null;
            if (spawnName && quantity) {
                let itemCode = itemMapping[spawnName.toLowerCase()] || spawnName;
                if (itemCode.startsWith('WEAPON_')) itemCode = itemCode.replace('WEAPON_', '');
                const price = priceMap[itemCode.toLowerCase()] || 0;
                totalMulta += price * quantity;
                return { spawnName, quantity, itemCode };
            } return null;
        }).filter(Boolean);
        return { itemsData, totalMulta };
    }
};