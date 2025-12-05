class GenericHandler extends BaseReportHandler {
    constructor(formData, sectionsEl) { super(formData, sectionsEl); }

    extractItemsFromDeathLog(logText) {
        if (!logText) return '';
        const extractSection = (key, text) => {
            const regex = new RegExp(`\\\[${key}\\\]:([\\s\\S]*?)(?=\\s*\\\[[A-ZÀ-Ÿ]+\]:|$)`, 'i');
            const match = text.match(regex);
            if (match && match[1]) {
                const content = match[1].trim();
                const lines = content.split(/<br\s*\/?>|\n/).map(l => l.trim()).filter(Boolean);
                if (lines.length === 1 && (lines[0].match(/ x \d+/g) || []).length > 1) {
                    const itemRegex = /.+? x \d+/g;
                    return lines[0].match(itemRegex) || [];
                }
                return lines;
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
                processedArmas.push(`${weaponName} x 1`);
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
        const { loggedInUserInfo, rulesData, itemMapping, itemPrices } = data;
        const finalPunishedUsers = this.finalPunishedUsers || [];
        const finalPunishedInfos = this.finalPunishedInfos || [];
        const reporterInfo = data.reporterInfo;

        const { advRoleIds, punishmentPrisonTimes, punishmentFines } = window.step4Config;
        const reporterDiscordId = reporterInfo?.user_info?.id;
        const isValidDiscordId = reporterDiscordId && /^\d{17,19}$/.test(reporterDiscordId);
        const reporterMention = isValidDiscordId ? `<@${reporterDiscordId}>` : `ID ${this.formData.reporterId}`;

        const generatePunishmentTextForMessage = (user, userInfo) => {
             const basePunishment = user.punicaoMinima || 'verbal';
             const nextPunishment = this.utils.getNextPunishment(userInfo, basePunishment);
             const fineAmount = punishmentFines[nextPunishment] || null;
             const fineText = (fineAmount && nextPunishment !== 'banido') ? ` + multa de **${fineAmount}**` : '';

             if (user.punishmentType === 'prison') {
                 return `será aplicado **${user.prisonTime} meses de prisao**${fineText}`;
             }

             const roleId = advRoleIds[nextPunishment];
             
             // Verifica prisonTime fixo
             const prisonTime = (user.prisonTime && user.prisonTime > 0) 
                ? user.prisonTime 
                : (punishmentPrisonTimes[nextPunishment] || 0);

             const normalText = `será aplicado **<@&${roleId}>**` + (nextPunishment !== 'banido' ? ` e ${prisonTime} meses de prisao` : '');

             // MODIFICADO: Removida lógica de forçar ban para usuário fora do Discord.
             // Aplica a punição normal.
             return normalText + fineText;
        };

        let msgIntro = `Olá ${reporterMention},\n\nApós analisar o seu vídeo da sua denúncia,`;
        const punishmentMessages = finalPunishedUsers.map((user, index) => {
            const userInfo = finalPunishedInfos[index];
            const ruleName = user.displayRules.join(', ');
            const punishmentText = generatePunishmentTextForMessage(user, userInfo); 
            return `considero que o **ID ${user.gameId}** praticou **${ruleName}**, conforme as regras da cidade. ${punishmentText} de acordo com o histórico de punições do jogador.`;
        });
         msgIntro += "\n\n" + punishmentMessages.join('\n\n');

        const selectedLogs = this.formData.selectedLogs || [];
        const logMorte = selectedLogs.find(log => log.html.includes('[MORTE]'));
        const logsLoot = selectedLogs.filter(log => log.html.includes('[REVISTOU]'));

        let itemsTextParaDevolucao = '';
        if (logMorte) {
             itemsTextParaDevolucao = this.extractItemsFromDeathLog(logMorte.text);
             console.log("[GenericHandler] Itens extraídos do log de Morte:", itemsTextParaDevolucao || "Nenhum");
        } else if (logsLoot.length > 0) {
             console.log("[GenericHandler] Nenhum log de Morte selecionado. Verificando logs de Revista selecionados...");
             const { itemsData } = this.utils.calculateItemsValue(logsLoot, itemMapping, itemPrices);
             itemsTextParaDevolucao = itemsData.map(item => `> ${item.itemCode.replace(/^WEAPON_/, 'PACKAGE_')} x${item.quantity}`).join('\n');
             console.log("[GenericHandler] Itens extraídos dos logs de Revista:", itemsTextParaDevolucao || "Nenhum");
        } else {
             console.log("[GenericHandler] Nenhum log de Morte ou Revista selecionado.");
        }

        const msgDevolucao = itemsTextParaDevolucao ? `Seus itens serão solicitados para devolução em breve, só aguardar que chegará para você. Os itens são:\n${itemsTextParaDevolucao}` : '';
        const msgFinal = `\n\nAgradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.\n\n-# Atenciosamente,\n-# **<@${loggedInUserInfo.id}>** - Equipe Bahamas.`;

        const messageSectionContent =
            (itemsTextParaDevolucao ? `<div class="devolucao-toggle"><input type="checkbox" id="devolucao-check"><label for="devolucao-check">Vai ocorrer devolução?</label></div>` : '') +
            `<pre id="message-preview-main">${msgIntro}</pre>` +
            (itemsTextParaDevolucao ? `<div id="devolucao-msg-content-wrapper" style="display:none;"><pre id="devolucao-msg-content">${msgDevolucao}</pre></div>` : '') +
            `<pre id="message-preview-final">${msgFinal}</pre>`;

        this.utils.createSection('Mensagem ao Denunciante', messageSectionContent, this.sectionsEl, { onCopy: this.utils.copyMessageContent });

        if (itemsTextParaDevolucao) {
            console.log("[GenericHandler] Chamando renderDevolucaoReport...");
            window.reportRenderer.renderDevolucaoReport(this, data, this.formData.reporterId, reporterDiscordId, itemsTextParaDevolucao);

            setTimeout(() => {
                const devolucaoCheck = document.getElementById('devolucao-check');
                const devolucaoContentWrapper = document.getElementById('devolucao-msg-content-wrapper');
                const devolucaoReportSection = document.getElementById('devolucao-report-section'); 

                if (devolucaoCheck && devolucaoContentWrapper && devolucaoReportSection) {
                    devolucaoCheck.checked = true;
                    devolucaoContentWrapper.style.display = 'block';
                    devolucaoReportSection.style.display = 'block';
                    console.log("[GenericHandler] Checkbox de devolução marcada e secções exibidas.");

                    devolucaoCheck.addEventListener('change', (e) => {
                        const isChecked = e.target.checked;
                        console.log(`[GenericHandler] Checkbox de devolução alterado para: ${isChecked}`);
                        devolucaoContentWrapper.style.display = isChecked ? 'block' : 'none';
                        devolucaoReportSection.style.display = isChecked ? 'block' : 'none';
                    });
                } else {
                     console.warn("[GenericHandler] Não foi possível encontrar todos os elementos da devolução para adicionar listener/marcar automaticamente.");
                }
            }, 0);
        }
    }
}
window.GenericHandler = GenericHandler;