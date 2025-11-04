class RdmHandler extends BaseReportHandler {
    constructor(formData, sectionsEl) { super(formData, sectionsEl); }

    extractItemsFromDeathLog(logText) {
        if (!logText) return '';
        const extractSection = (key, text) => {
            const regex = new RegExp(`\\\[${key}\\\]:([\\s\\S]*?)(?=\\s*\\\[[A-ZÀ-Ÿ]+\]:|$)`, 'i');
            const match = text.match(regex);
            if (match && match[1]) {
                const content = match[1].trim(); const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length === 1 && (lines[0].match(/ x \d+/g) || []).length > 1) { const itemRegex = /.+? x \d+/g; return lines[0].match(itemRegex) || []; }
                return lines;
            } return [];
        };
        const inventarioItems = extractSection('INVENTÀRIO', logText); const armasItemsRaw = extractSection('ARMAS', logText);
        const processedArmas = [];
        armasItemsRaw.forEach(itemLine => {
            const parts = itemLine.split(' x '); const name = parts[0].trim(); const quantity = parseInt(parts[1] || '0', 10);
            if (name.startsWith('WEAPON_')) {
                const weaponName = name.replace('WEAPON_', '');
                if (quantity === 0) processedArmas.push(`${weaponName} x 1`);
                else { processedArmas.push(`${weaponName} x 1`); processedArmas.push(`AMMO_${weaponName} x ${quantity}`); }
            } else processedArmas.push(itemLine);
        });
        const allItems = [...inventarioItems, ...processedArmas];
        return allItems.map(item => `> ${item.trim()}`).join('\n');
    }

    renderDenuncianteMessage(data) {
        const { loggedInUserInfo, rulesData } = data;
        const finalPunishedUsers = this.finalPunishedUsers || [];
        const finalPunishedInfos = this.finalPunishedInfos || [];
        const reporterInfo = data.reporterInfo;

        const { advRoleIds, punishmentPrisonTimes } = window.step4Config;
        const reporterDiscordId = reporterInfo?.user_info?.id;
        const isValidDiscordId = reporterDiscordId && /^\d{17,19}$/.test(reporterDiscordId);
        const reporterMention = isValidDiscordId ? `<@${reporterDiscordId}>` : `ID ${this.formData.reporterId}`;

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

        const logMorte = this.formData.selectedLogs.find(log => log.html.includes('[MORTE]'));
        const itemsTextParaDevolucao = this.extractItemsFromDeathLog(logMorte?.text);
        const msgDevolucao = itemsTextParaDevolucao ? `Seus itens serão solicitados para devolução em breve, só aguardar que chegará para você. Os itens são:\n${itemsTextParaDevolucao}` : '';
        const localizacaoMatch = logMorte?.text.match(/\[Localização\]:\s*([^\n]+)/);
        const localizacao = localizacaoMatch ? localizacaoMatch[1].trim() : 'N/A';
        const msgFinal = `\n\n**CDS DA MORTE:**\n\`${localizacao}\`\n\nAgradecemos pela paciência e compreensão nesse momento. Nosso compromisso é sempre proporcionar a melhor experiência possível aos nossos jogadores.\n\n-# Atenciosamente,\n-# **<@${loggedInUserInfo.id}>** - Equipe Complexo RJ.`;
        const messageSectionContent = `<div class="devolucao-toggle"><input type="checkbox" id="devolucao-check" ${itemsTextParaDevolucao ? '' : 'disabled'}><label for="devolucao-check">Vai ocorrer devolução?</label></div><pre id="message-preview-main">${msgIntro}</pre><div id="devolucao-msg-content-wrapper" style="display:none;"><pre id="devolucao-msg-content">${msgDevolucao}</pre></div><pre id="message-preview-final">${msgFinal}</pre>`;
        this.utils.createSection('Mensagem ao Denunciante', messageSectionContent, this.sectionsEl, { onCopy: this.utils.copyMessageContent });
        if (itemsTextParaDevolucao) {
            window.reportRenderer.renderDevolucaoReport(this, data, this.formData.reporterId, reporterDiscordId, itemsTextParaDevolucao);
        }
    }
}
window.RdmHandler = RdmHandler;