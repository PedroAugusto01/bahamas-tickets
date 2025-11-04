// Tickets/site/public/denuncia/steps/step4-summary/modelos_relatorios/loot_indevido/loot_indevido_utils.js
window.lootUtils = {
    // Helper to create a section with copy button
    createSection(title, contentHtml, sectionsEl, { id = '', onCopy = null, copyText = null } = {}) {
        const el = document.createElement('div');
        el.className = 'step4-section';
        if (id) el.id = id;
        el.innerHTML = `<h4>${title}</h4><button class="copy-section-btn">Copiar</button><div class="section-content">${contentHtml}</div>`;
        const copyBtn = el.querySelector('.copy-section-btn');

        copyBtn.addEventListener('click', async () => {
            try {
                // Se uma função de cópia customizada foi passada, use-a
                if (typeof onCopy === 'function') {
                    await onCopy(el);
                } else {
                    // Lógica padrão de cópia de texto
                    const text = copyText !== null ? copyText : el.querySelector('.section-content').innerText;
                    await navigator.clipboard.writeText(text);
                }
                copyBtn.textContent = 'Copiado!';
            } catch (err) {
                console.error("Erro ao copiar:", err);
                copyBtn.textContent = 'Erro!';
            }
            setTimeout(() => copyBtn.textContent = 'Copiar', 2000);
        });

        // Permite a criação do elemento sem adicioná-lo imediatamente ao DOM
        if (sectionsEl) {
            sectionsEl.appendChild(el);
        }
        return el;
    },
    
    /**
     * onCopy handler específico para a seção 'Mensagem ao Denunciante'.
     * Ele junta o texto apenas das tags <pre>, ignorando outros elementos como a label do checkbox.
     * @param {HTMLElement} sectionElement - O elemento da seção (.step4-section).
     */
    async copyMessageContent(sectionElement) {
        const main = sectionElement.querySelector('#message-preview-main');
        const final = sectionElement.querySelector('#message-preview-final');
        const devolucaoCheck = sectionElement.querySelector('#devolucao-check');
        
        if (!main || !final) {
            throw new Error('Não foi possível encontrar os elementos de texto da mensagem para copiar.');
        }

        let textToCopy = main.innerText;

        if (devolucaoCheck?.checked) {
            const devolucaoContent = sectionElement.querySelector('#devolucao-msg-content');
            if (devolucaoContent) {
                textToCopy += '\n\n' + devolucaoContent.innerText;
            }
        }

        textToCopy += '\n\n' + final.innerText;
        
        await navigator.clipboard.writeText(textToCopy);
    },

    /**
     * Função específica para copiar o conteúdo de uma tag <img> para o clipboard.
     * @param {HTMLElement} sectionElement - O elemento da seção que contém a imagem.
     */
    async copyImageToClipboard(sectionElement) {
        const img = sectionElement.querySelector('img');
        if (!img) throw new Error("Nenhuma imagem encontrada na seção para copiar.");

        try {
            const response = await fetch(img.src);
            const blob = await response.blob();
            
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
        } catch (error) {
            console.error('Falha ao copiar a imagem:', error);
            throw error;
        }
    },

    // Funções de apoio
    async loadRulesJson() {
        const res = await fetch('/utils/tickets_result.json');
        return res.ok ? await res.json() : { punicoes: [] };
    },

    async fetchUserInfo(userId) {
        if (!userId) return null;
        try {
            const res = await fetch(`/api/verificar-usuario`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            return res.ok ? await res.json() : null;
        } catch (e) { 
            console.error(`Falha ao buscar dados do usuário ${userId}:`, e);
            return null; 
        }
    },

    getNextPunishment(history, basePunishment) {
        const levels = ['verbal', 'adv1', 'adv2', 'banido'];
        const userRoles = new Set((history || []).map(entry => {
            if (entry.details_text.includes("Advertência²")) return 'adv2';
            if (entry.details_text.includes("Advertência¹")) return 'adv1';
            if (entry.details_text.includes("verbal")) return 'verbal';
            return null;
        }).filter(Boolean));
        if (userRoles.has('banido')) return 'banido';
        let nextIndex = levels.indexOf(basePunishment);
        while (userRoles.has(levels[nextIndex]) && nextIndex < levels.length - 1) { nextIndex++; }
        return levels[nextIndex];
    },

    calculateItemsValue(selectedLogs, itemMapping, itemPrices) {
        let totalMulta = 0;
        const priceMap = itemPrices.reduce((acc, item) => {
            acc[item.name.toLowerCase()] = item.price;
            return acc;
        }, {});

        const itemsData = selectedLogs.map(s => {
            const spawnName = s.text.match(/\[PEGOU\]:\s*(.*)/)?.[1].trim();
            const quantity = parseInt(s.text.match(/\[QUANTIDADE\]:\s*(\d+)/)?.[1], 10);
            
            if (spawnName && quantity) {
                let itemCode = itemMapping[spawnName.toLowerCase()] || spawnName;
                if (itemCode.startsWith('WEAPON_')) {
                    itemCode = itemCode.replace('WEAPON_', '');
                }
                const price = priceMap[itemCode.toLowerCase()] || 0;
                totalMulta += price * quantity;
                return { spawnName, quantity, itemCode };
            }
            return null;
        }).filter(Boolean);

        return { itemsData, totalMulta };
    }
};