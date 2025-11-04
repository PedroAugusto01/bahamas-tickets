class GenericHandler extends BaseReportHandler {
    constructor(formData, sectionsEl) { super(formData, sectionsEl); }

    // Função para extrair itens do log de morte (necessária aqui também)
    extractItemsFromDeathLog(logText) {
        if (!logText) return '';
        const extractSection = (key, text) => {
            // Regex para encontrar a chave (case-insensitive) e capturar tudo até a próxima chave ou fim
            const regex = new RegExp(`\\\[${key}\\\]:([\\s\\S]*?)(?=\\s*\\\[[A-ZÀ-Ÿ]+\]:|$)`, 'i');
            const match = text.match(regex);
            if (match && match[1]) {
                const content = match[1].trim();
                // Separa por nova linha ou <br>, remove espaços e linhas vazias
                const lines = content.split(/<br\s*\/?>|\n/).map(l => l.trim()).filter(Boolean);
                // Heurística simples para detectar múltiplos itens numa linha (pode precisar de ajuste)
                if (lines.length === 1 && (lines[0].match(/ x \d+/g) || []).length > 1) {
                    const itemRegex = /.+? x \d+/g; // Tenta separar itens como "ItemA x 1 ItemB x 2"
                    return lines[0].match(itemRegex) || [];
                }
                return lines; // Retorna linhas separadas
            } return [];
        };
        const inventarioItems = extractSection('INVENTÀRIO', logText);
        const armasItemsRaw = extractSection('ARMAS', logText);
        const processedArmas = [];
        armasItemsRaw.forEach(itemLine => {
            const parts = itemLine.split(' x ');
            const name = parts[0].trim();
            const quantity = parseInt(parts[1] || '0', 10);
            if (name.startsWith('WEAPON_')) {
                const weaponName = name.replace('WEAPON_', '');
                processedArmas.push(`${weaponName} x 1`); // Adiciona a arma
                // Adiciona munição apenas se a quantidade original era maior que 0
                if (quantity > 0) {
                     processedArmas.push(`AMMO_${weaponName} x ${quantity}`);
                }
            } else {
                processedArmas.push(itemLine);
            }
        });
        const allItems = [...inventarioItems, ...processedArmas];
        return allItems.map(item => `> ${item.trim()}`).join('\n');
    }


    renderDenuncianteMessage(data) {
        // Inclui itemMapping e itemPrices necessários para calculateItemsValue
        const { loggedInUserInfo, rulesData, itemMapping, itemPrices } = data;
        const finalPunishedUsers = this.finalPunishedUsers || [];
        const finalPunishedInfos = this.finalPunishedInfos || [];
        const reporterInfo = data.reporterInfo;

        const { advRoleIds, punishmentPrisonTimes } = window.step4Config;
        const reporterDiscordId = reporterInfo?.user_info?.id;
        const isValidDiscordId = reporterDiscordId && /^\d{17,19}$/.test(reporterDiscordId);
        const reporterMention = isValidDiscordId ? `<@${reporterDiscordId}>` : `ID ${this.formData.reporterId}`;

        // Função generatePunishmentTextForMessage (sem alterações)
        const generatePunishmentTextForMessage = (userInfo, basePunishment) => {
             const nextPunishment = this.utils.getNextPunishment(userInfo, basePunishment);
             const roleId = advRoleIds[nextPunishment];
             const prisonTime = punishmentPrisonTimes[nextPunishment] || 0;
             const normalText = `será aplicado **<@&${roleId}>**` + (nextPunishment !== 'banido' ? ` e ${prisonTime} meses de prisao` : '');

             if (userInfo && userInfo.user_info && userInfo.user_info.name && userInfo.user_info.name.includes('(Fora do Discord)')) {
                 const banRoleId = advRoleIds['banido'] || 'ID_CARGO_BANIDO';
                 return `será aplicado <@&${banRoleId}> até retornar para o servidor, após retornar reverter para **<@&${roleId}>**` + (nextPunishment !== 'banido' ? ` e ${prisonTime} meses de prisao` : '');
             }
             return normalText;
        };

        // Monta introdução e mensagens de punição (sem alterações)
        let msgIntro = `Olá ${reporterMention},\n\nApós analisar o seu vídeo da sua denúncia,`;
        const punishmentMessages = finalPunishedUsers.map((user, index) => {
            const userInfo = finalPunishedInfos[index];
            const ruleName = user.displayRules.join(', ');
            const ruleInfo = rulesData.punicoes.find(r => r.regra === user.rules[0]);
             const basePunishment = ruleInfo?.punicao_minima || 'verbal';
             const punishmentText = generatePunishmentTextForMessage(userInfo, basePunishment);
            return `considero que o **ID ${user.gameId}** praticou **${ruleName}**, conforme as regras da cidade. ${punishmentText} de acordo com o histórico de punições do jogador.`;
        });
         msgIntro += "\n\n" + punishmentMessages.join('\n\n');

        // --- LÓGICA DE DEVOLUÇÃO ADICIONADA ---
        // Verifica se há logs selecionados no passo anterior
        const selectedLogs = this.formData.selectedLogs || [];
        const logMorte = selectedLogs.find(log => log.html.includes('[MORTE]'));
        const logsLoot = selectedLogs.filter(log => log.html.includes('[REVISTOU]'));

        let itemsTextParaDevolucao = '';
        if (logMorte) {
             // Prioriza extrair itens do log de morte selecionado
             itemsTextParaDevolucao = this.extractItemsFromDeathLog(logMorte.text);
             console.log("[GenericHandler] Itens extraídos do log de Morte:", itemsTextParaDevolucao || "Nenhum");
        } else if (logsLoot.length > 0) {
            // Se não houver log de morte, mas houver logs de revista selecionados (caso opcional)
             console.log("[GenericHandler] Nenhum log de Morte selecionado. Verificando logs de Revista selecionados...");
             // Calcula o valor/itens a partir dos logs de revista selecionados
             const { itemsData } = this.utils.calculateItemsValue(logsLoot, itemMapping, itemPrices);
             itemsTextParaDevolucao = itemsData.map(item => `> ${item.itemCode.replace(/^WEAPON_/, 'PACKAGE_')} x${item.quantity}`).join('\n');
             console.log("[GenericHandler] Itens extraídos dos logs de Revista:", itemsTextParaDevolucao || "Nenhum");
        } else {
             console.log("[GenericHandler] Nenhum log de Morte ou Revista selecionado.");
        }

        // Monta a mensagem de devolução se itens foram encontrados
        const msgDevolucao = itemsTextParaDevolucao ? `Seus itens serão solicitados para devolução em breve, só aguardar que chegará para você. Os itens são:\n${itemsTextParaDevolucao}` : '';
        const msgFinal = `\n\nAgradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.\n\n-# Atenciosamente,\n-# **<@${loggedInUserInfo.id}>** - Equipe Complexo RJ.`;

        // Renderiza a checkbox de devolução APENAS se itens foram encontrados
        const messageSectionContent =
            (itemsTextParaDevolucao ? `<div class="devolucao-toggle"><input type="checkbox" id="devolucao-check"><label for="devolucao-check">Vai ocorrer devolução?</label></div>` : '') +
            `<pre id="message-preview-main">${msgIntro}</pre>` +
            // Renderiza a área de mensagem de devolução APENAS se itens foram encontrados
            (itemsTextParaDevolucao ? `<div id="devolucao-msg-content-wrapper" style="display:none;"><pre id="devolucao-msg-content">${msgDevolucao}</pre></div>` : '') +
            `<pre id="message-preview-final">${msgFinal}</pre>`;

        // Cria a secção da mensagem
        this.utils.createSection('Mensagem ao Denunciante', messageSectionContent, this.sectionsEl, { onCopy: this.utils.copyMessageContent });

        // Chama renderDevolucaoReport APENAS se itens foram encontrados
        if (itemsTextParaDevolucao) {
            console.log("[GenericHandler] Chamando renderDevolucaoReport...");
            window.reportRenderer.renderDevolucaoReport(this, data, this.formData.reporterId, reporterDiscordId, itemsTextParaDevolucao);

            // Adiciona listener para a checkbox e marca/mostra automaticamente
            // Usa setTimeout para garantir que os elementos existam no DOM após createSection
            setTimeout(() => {
                const devolucaoCheck = document.getElementById('devolucao-check');
                const devolucaoContentWrapper = document.getElementById('devolucao-msg-content-wrapper');
                const devolucaoReportSection = document.getElementById('devolucao-report-section'); // O ID é definido em BaseReportHandler

                if (devolucaoCheck && devolucaoContentWrapper && devolucaoReportSection) {
                    // Marca a checkbox e exibe as secções relevantes automaticamente
                    devolucaoCheck.checked = true;
                    devolucaoContentWrapper.style.display = 'block';
                    devolucaoReportSection.style.display = 'block';
                    console.log("[GenericHandler] Checkbox de devolução marcada e secções exibidas.");

                    // Adiciona o listener para permitir desmarcar/remarcar
                    devolucaoCheck.addEventListener('change', (e) => {
                        const isChecked = e.target.checked;
                        console.log(`[GenericHandler] Checkbox de devolução alterado para: ${isChecked}`);
                        devolucaoContentWrapper.style.display = isChecked ? 'block' : 'none';
                        devolucaoReportSection.style.display = isChecked ? 'block' : 'none';
                    });
                } else {
                     console.warn("[GenericHandler] Não foi possível encontrar todos os elementos da devolução para adicionar listener/marcar automaticamente.");
                }
            }, 0); // Executa assim que o call stack estiver livre
        }
    }
}
window.GenericHandler = GenericHandler;