// Define o renderizador de logs (Log Renderer)
window.logRenderer = {
    async renderLogSections(handler) {
        const { formData, sectionsEl, utils } = handler;
        const allSelectedLogs = formData.selectedLogs || [];

        const logMorte = allSelectedLogs.find(log => log.html.includes('[MORTE]'));
        const logMatou = allSelectedLogs.find(log => log.html.includes('[MATOU]'));
        const logsLoot = allSelectedLogs.filter(log => log.html.includes('[REVISTOU]'));
        const logsLootHTML = logsLoot.map(log => log.html).join('');

        if (logMorte) {
            utils.createSection(':setabranca: **LOG DA MORTE**', '', sectionsEl, { copyText: ':setabranca: **LOG DA MORTE**' });
            await this.renderLogImageSection(handler, 'Imagem da Log de Morte', logMorte.html);
        }
        if (logMatou) {
            utils.createSection(':setabranca: **LOG DE Matou**', '', sectionsEl, { copyText: ':setabranca: **LOG DE Matou**' });
            await this.renderLogImageSection(handler, 'Imagem da Log de Matou', logMatou.html);
        }
        if (logsLootHTML) {
            utils.createSection(':setabranca: **LOG DE REVISTA**', '', sectionsEl, { copyText: ':setabranca: **LOG DE REVISTA**' });
            await this.renderLogImageSection(handler, 'Imagem Logs de Loot', logsLootHTML);
        }
    },

    async renderLogImageSection(handler, title, logHTML) {
        const { sectionsEl, utils } = handler;
        if (!logHTML) return;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = logHTML;
        tempDiv.querySelectorAll('.loot-log-entry').forEach(entry => entry.classList.remove('selected'));
        const cleanLogHTML = tempDiv.innerHTML;

        const onCopyImage = async (sectionElement) => {
            const canvas = sectionElement.querySelector('canvas');
            if (!canvas) throw new Error("Canvas da imagem não encontrado.");
            await new Promise((resolve, reject) => {
                canvas.toBlob(blob => {
                    if (!blob) return reject(new Error('Falha ao converter canvas.'));
                    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(resolve).catch(reject);
                }, 'image/png');
            });
        };
        const section = utils.createSection(title, '<div class="image-wrapper">Gerando imagem...</div>', sectionsEl, { onCopy: onCopyImage });
        const wrapper = section.querySelector('.image-wrapper');

        if (typeof html2canvas === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }

        const logStyles = `
            .loot-log-entry { background-color: rgb(30 31 34 / 100%); border-radius: 12px; padding: 20px 18px; font-family: 'Consolas', 'Menlo', 'monospace'; font-size: 13px; color: #ff4444; border: 1px solid rgba(255,255,255,0.03); max-width: 860px; line-height: 1.2; }
            .loot-log-entry p { margin: 0; padding: 4px 0; line-height: 1.2; }
            .loot-log-entry .key-id, .loot-log-entry .key-source, .loot-log-entry .key-default, .loot-log-entry .key-date { color: #ff4444; font-weight: 800; margin-right: 8px; }
            .loot-log-entry .key-action { color: #00ffff; background: rgba(0, 255, 255, 0.1); padding: 4px 10px; border-radius: 8px; font-weight: 900; border: 2px solid #a020f0; font-size: 15px; margin: 5px 0; display: inline-block; }
            .loot-log-entry .value-boxed { color: #00ffff; background: transparent; font-weight: 800; border: 2px solid #a020f0; padding: 2px 7px; border-radius: 8px; font-size: 12px; display: inline-block; }
            .loot-log-entry .value-boxed-red { background: rgba(255, 68, 68, 0.2); color: #ff4444; font-weight: 800; padding: 2px 8px; border-radius: 8px; font-size: 12px; display: inline-block; margin-left: 8px; border: 2px solid #a020f0; }
            .loot-log-entry .value-green { color: #00ff00; font-weight: 700; }
            .item-list-entry { margin-left: 20px !important; }
            .select-log-btn { display: none !important; }
        `;

        const renderContainer = document.createElement('div');
        renderContainer.style.position = 'absolute';
        renderContainer.style.left = '-9999px';
        renderContainer.style.padding = '10px';
        let formattedLogHTML = cleanLogHTML.replace(/(\[GROUPS(-Assasino)?\]:<\/span> <span class="value-green">)(.*?)(<\/span><\/p>)/g, (match, start, type, content, end) => {
            const formattedContent = content.replace(/,/g, ',<br>');
            return `${start}${formattedContent}${end}`;
        });
        renderContainer.innerHTML = `<style>${logStyles}</style>${formattedLogHTML}`;
        document.body.appendChild(renderContainer);
        const canvas = await html2canvas(renderContainer, { backgroundColor: '#2c2f33', useCORS: true });
        renderContainer.remove();
        wrapper.innerHTML = '';
        wrapper.appendChild(canvas);
    }
};

// Classe Base para os Handlers
class BaseReportHandler {
    constructor(formData, sectionsEl) {
        this.formData = formData;
        this.sectionsEl = sectionsEl;
        this.utils = window.reportUtils;
        this.finalPunishedUsers = [];
        this.finalPunishedInfos = [];
    }
    async renderAll() {
        const titleEl = document.getElementById('report-title');
        let initialPunishedUsers = [...(this.formData.punishedUsers || [])];
        const selectedLootLogs = (this.formData.selectedLogs || []).filter(log => log.html.includes('[REVISTOU]'));
        const hasLoot = selectedLootLogs.length > 0;

        this.sectionsEl.innerHTML = '<p>Carregando dados para o relatório...</p>';
        const loggedInUserInfo = window.loggedInUser || { id: 'ID_NAO_ENCONTRADO' };

        if (initialPunishedUsers.length === 0 && this.formData.flow !== 'denied') {
            this.sectionsEl.innerHTML = `<p class="log-error">Erro: Nenhum usuário punido foi encontrado.</p>`; return;
        }

        const selectedMatouLogs = (this.formData.selectedLogs || []).filter(log => log.html.includes('[MATOU]'));
        const selectedMorteLogs = (this.formData.selectedLogs || []).filter(log => log.html.includes('[MORTE]'));

        initialPunishedUsers.forEach(user => {
            if (!user.gameId || user.gameId.trim() === '') {
                let foundId = null;

                if (selectedMatouLogs.length > 0) {
                    const logText = selectedMatouLogs[0].text;
                    const idMatch = logText.match(/\[ID\]:\s*(\d+)/);
                    if (idMatch && idMatch[1]) {
                        foundId = idMatch[1];
                        console.log(`[BaseReportHandler] Preenchido GameID (index ${user.index}) com ID ${foundId} do log [MATOU].`);
                    }
                }

                if (!foundId && selectedMorteLogs.length > 0) {
                    const logText = selectedMorteLogs[0].text;
                    const idMatch = logText.match(/\[Assasino\]:.*\((\d+)\)/);
                    if (idMatch && idMatch[1]) {
                        foundId = idMatch[1];
                        console.log(`[BaseReportHandler] Preenchido GameID (index ${user.index}) com ID ${foundId} do [Assasino] no log [MORTE].`);
                    }
                }

                if (foundId) {
                    user.gameId = foundId;
                } else {
                    console.warn(`[BaseReportHandler] Não foi possível extrair o ID do punido (index ${user.index}) dos logs selecionados. O ID permanecerá VAZIO.`);
                }
            }
        });

        const fetchPromises = [this.utils.fetchUserInfo(this.formData.reporterId)];
        const initialPunishedIds = new Set(initialPunishedUsers.map(u => u.gameId));
        const additionalLooterIds = new Set();

        if (this.formData.flow !== 'denied') {
            fetchPromises.push(...initialPunishedUsers.map(user => this.utils.fetchUserInfo(user.gameId)));

            if (hasLoot) {
                selectedLootLogs.forEach(log => {
                    const revistadorId = this.utils.extractRevisitorId(log.text);
                    if (revistadorId && !initialPunishedIds.has(revistadorId)) {
                        additionalLooterIds.add(revistadorId);
                    }
                });
                additionalLooterIds.forEach(id => fetchPromises.push(this.utils.fetchUserInfo(id)));
            }

        } else if (this.formData.deniedInfo?.accusedId) {
            fetchPromises.push(this.utils.fetchUserInfo(this.formData.deniedInfo.accusedId));
        }

        const allFetchedInfos = await Promise.all(fetchPromises);
        const reporterInfo = allFetchedInfos[0];
        const otherInfos = allFetchedInfos.slice(1);
        const initialPunishedInfos = this.formData.flow === 'denied' ? [] : otherInfos.slice(0, initialPunishedUsers.length);
        const additionalLooterInfos = this.formData.flow === 'denied' ? [] : otherInfos.slice(initialPunishedUsers.length);
        const deniedAccusedInfo = this.formData.flow === 'denied' ? otherInfos[0] : null;

        this.finalPunishedUsers = [...initialPunishedUsers];
        this.finalPunishedInfos = [...initialPunishedInfos];

        if (this.formData.flow !== 'denied') {
            const additionalLooterIdsArray = Array.from(additionalLooterIds);
            additionalLooterIdsArray.forEach((looterId, index) => {
                const looterInfo = additionalLooterInfos[index];
                if (looterId && looterInfo && !looterInfo.error) {
                    this.finalPunishedUsers.push({
                        index: this.finalPunishedUsers.length + 1,
                        gameId: looterId,
                        displayRules: ['Loot Indevido'],
                        rules: ['Loot Indevido'],
                        needsLog: false,
                        logDate: null
                    });
                    this.finalPunishedInfos.push(looterInfo);
                } else {
                    console.warn(`Não foi possível adicionar o looter com ID ${looterId} ao relatório (informações não encontradas ou erro).`);
                }
            });

            const originalUserIndex = this.finalPunishedUsers.findIndex(u => initialPunishedIds.has(u.gameId));
            if (hasLoot && originalUserIndex !== -1) {
                const originalUser = this.finalPunishedUsers[originalUserIndex];
                const looterIdFoundInLogs = selectedLootLogs.some(log => this.utils.extractRevisitorId(log.text) === originalUser.gameId);

                if (looterIdFoundInLogs && !originalUser.rules.includes('Loot Indevido')) {
                    originalUser.rules.push('Loot Indevido');
                    originalUser.displayRules.push('Loot Indevido');
                }
            }
        }

        if (this.formData.flow === 'denied') {
            titleEl.textContent = `Relatório: Ticket Negado - ${this.formData.deniedInfo.reason}`;
        } else if (this.finalPunishedUsers.length === 1) {
            titleEl.textContent = `Relatório: ${this.finalPunishedUsers[0].displayRules.join(', ')}`;
        } else if (this.finalPunishedUsers.length > 1) {
            titleEl.textContent = 'Relatório: Denúncia Múltipla / Punição Dupla';
        } else {
            titleEl.textContent = 'Relatório';
        }

        const userWithoutId = this.finalPunishedUsers.find(u => (!u.gameId || u.gameId.trim() === ''));
        if (userWithoutId && this.formData.flow !== 'denied') {
            this.sectionsEl.innerHTML = `<div class="step4-section"><p class="log-error"><b>Erro CRÍTICO:</b> Não foi possível determinar o ID do punido (index ${userWithoutId.index}).<br>O ID não foi preenchido no Passo 2 e não pôde ser extraído dos logs [MATOU] ou [MORTE] selecionados.</p></div>`;
            return;
        }

        const [rulesData, itemMapping, itemPrices] = await Promise.all([
            this.utils.loadRulesJson(), fetch('/api/item-mapping').then(res => res.json()), fetch('/api/item-prices').then(res => res.json())
        ]);
        this.sectionsEl.innerHTML = '';

        await window.reportRenderer.renderReportSections(this, { loggedInUserInfo, reporterInfo, rulesData, itemMapping, itemPrices, deniedAccusedInfo });
    }
    renderDenuncianteMessage(data) { throw new Error("renderDenuncianteMessage precisa ser implementado."); }
}
window.BaseReportHandler = BaseReportHandler;

// Define o renderizador de Relatório (Report Renderer)
window.reportRenderer = {
    async renderReportSections(handler, data) {
        // Agora window.logRenderer está definido acima neste arquivo e pode ser chamado
        await window.logRenderer.renderLogSections(handler);
        handler.renderDenuncianteMessage(data);
        this.renderAdvBanReport(handler, data);
        this.renderRuleImages(handler, data);
        this.renderFinalMessage(handler, data);
        const devolucaoCheck = document.getElementById('devolucao-check');
        const devolucaoContentWrapper = document.getElementById('devolucao-msg-content-wrapper');
        const devolucaoReportSection = document.getElementById('devolucao-report-section');
        if (devolucaoCheck) {
            devolucaoCheck.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (devolucaoContentWrapper) devolucaoContentWrapper.style.display = isChecked ? 'block' : 'none';
                if (devolucaoReportSection) devolucaoReportSection.style.display = isChecked ? 'block' : 'none';
            });
            if (devolucaoReportSection && devolucaoReportSection.innerHTML.trim() !== '') {
                setTimeout(() => {
                    if (!devolucaoCheck.checked) {
                        devolucaoCheck.checked = true;
                        devolucaoCheck.dispatchEvent(new Event('change'));
                    } else {
                        if (devolucaoContentWrapper) devolucaoContentWrapper.style.display = 'block';
                        if (devolucaoReportSection) devolucaoReportSection.style.display = 'block';
                    }
                }, 100);
            }
        }
    },

    renderDevolucaoReport(handler, data, reporterId, reporterDiscordId, itemsText) {
        if (!itemsText || itemsText.trim() === '') return;
        const { loggedInUserInfo } = data;
        const { reportTemplates } = window.step4Config;
        const ticketChannelName = handler.formData.ticketChannelName || '';
        const ticketNumberMatch = ticketChannelName.match(/-(\d+)$/);
        const ticketNumber = ticketNumberMatch ? ticketNumberMatch[1] : handler.formData.ticketChannel;
        const idLine = `**ID:** ${reporterId}` + (reporterDiscordId ? ` | <@${reporterDiscordId}>` : '');
        let motivo = '';
        if (handler.formData.flow === 'denied') motivo = handler.formData.deniedInfo.reason;
        else motivo = (handler.finalPunishedUsers || handler.formData.punishedUsers || []).map(user => user.displayRules.join(' + ')).join(' / ');
        const devolucaoReportContent = reportTemplates.devolution
            .replace('**ID:** {userId} | <@{discordId}>', idLine)
            .replace('{itens}', itemsText)
            .replace('{motivo}', motivo)
            .replace('{ticketNumber}', ticketNumber)
            .replace('{staffId}', loggedInUserInfo.id)
            .replace('{provas}', handler.formData.videoLinks ? handler.formData.videoLinks.join(' ') : '');
        const section = handler.utils.createSection('Relatório de Devolucao', `<pre>${devolucaoReportContent}</pre>`, handler.sectionsEl, { id: 'devolucao-report-section' });
        section.style.display = 'none';
    },

    renderAdvBanReport(handler, data) {
        const { loggedInUserInfo, rulesData, itemMapping, itemPrices } = data;
        const finalPunishedUsers = handler.finalPunishedUsers || [];
        const finalPunishedInfos = handler.finalPunishedInfos || [];

        const { advRoleIds, punishmentPrisonTimes, reportTemplates, punishmentFines } = window.step4Config;
        const ticketChannelName = handler.formData.ticketChannelName || '';
        const ticketNumberMatch = ticketChannelName.match(/-(\d+)$/);
        const ticketNumber = ticketNumberMatch ? ticketNumberMatch[1] : handler.formData.ticketChannel;
        const videoLinks = handler.formData.videoLinks || [];
        const selectedLootLogs = (handler.formData.selectedLogs || []).filter(log => log.html.includes('[REVISTOU]'));
        const hasLoot = selectedLootLogs.length > 0;
        let finalReportContent;

        const generatePunishmentText = (user, userInfo) => {
             const basePunishment = user.punicaoMinima || 'verbal';
             const nextPunishment = handler.utils.getNextPunishment(userInfo, basePunishment);
             const fineAmount = punishmentFines[nextPunishment] || null;
             const fineText = (fineAmount && nextPunishment !== 'banido') ? ` + multa de ${fineAmount}` : '';

             if (user.punishmentType === 'prison') {
                 return `${user.prisonTime} meses de prisao${fineText}`;
             }
            
             const roleId = advRoleIds[nextPunishment];
             const prisonTime = punishmentPrisonTimes[nextPunishment] || 0;
             const normalText = `<@&${roleId}>` + (nextPunishment !== 'banido' ? ` + ${prisonTime} meses de prisao` : '');

             if (userInfo && userInfo.user_info && userInfo.user_info.name && userInfo.user_info.name.includes('(Fora do Discord)')) {
                 const banRoleId = advRoleIds['banido'] || 'ID_CARGO_BANIDO';
                 return `<@&${banRoleId}> até retornar para o servidor, após retornar reverter para ${normalText}${fineText}`;
             }
             return normalText + fineText;
        };

        const { itemsData, totalMulta } = hasLoot ? handler.utils.calculateItemsValue(selectedLootLogs, itemMapping, itemPrices) : { itemsData: [], totalMulta: 0 };
        const lootSectionText = (itemsData.length > 0)
            ? `\n**ITENS LOOTEADOS:**\n${itemsData.map(item => `> ${item.itemCode.replace(/^WEAPON_/, 'PACKAGE_')} x${item.quantity}`).join('\n')}\n**MULTA POR LOOT INDEVIDO:** ${totalMulta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
            : "";

        if (finalPunishedUsers.length === 1) {
            const user = finalPunishedUsers[0];
            const userInfo = finalPunishedInfos[0];
            const discordId = userInfo?.user_info?.id || (userInfo?.found_in_db ? `DB:${userInfo?.user_info?.id}` : 'ERRO');
            const punicaoMultaText = generatePunishmentText(user, userInfo);
            const motivoText = user.displayRules.join(' + ');
            const includeLootSection = user.rules.includes('Loot Indevido') ? lootSectionText : "";

            finalReportContent = reportTemplates.single
                .replace('{userId}', user.gameId)
                .replace('{discordId}', discordId)
                .replace('{ticketNumber}', ticketNumber)
                .replace('{punicaoMulta}', punicaoMultaText)
                .replace('{staffId}', loggedInUserInfo.id)
                .replace('{motivo}', motivoText)
                .replace('{provas}', videoLinks.join(' '))
                .replace('{lootSection}', includeLootSection);
        } else {
            const reportBlocks = finalPunishedUsers.map((user, index) => {
                const userInfo = finalPunishedInfos[index];
                const discordId = userInfo?.user_info?.id || (userInfo?.found_in_db ? `DB:${userInfo?.user_info?.id}` : 'ERRO');
                 const punicaoMultaText = generatePunishmentText(user, userInfo);
                 const motivoText = user.displayRules.join(' + ');
                 const includeLootSection = user.rules.includes('Loot Indevido') ? lootSectionText : "";

                return reportTemplates.punishedBlock
                    .replace('{userId}', user.gameId)
                    .replace('{discordId}', discordId)
                    .replace('{punicaoMulta}', punicaoMultaText)
                    .replace('{motivo}', motivoText)
                    .replace('{lootSection}', includeLootSection);
            }).join('\n\n');

            finalReportContent = reportTemplates.multiple
                .replace('{reportBlocks}', reportBlocks)
                .replace('{ticketNumber}', ticketNumber)
                .replace('{staffId}', loggedInUserInfo.id)
                .replace('{provas}', videoLinks.join(' '));
        }
        
        handler.utils.createSection('Relatório ADV/BAN (Padrão)', `<pre>${finalReportContent}</pre>`, handler.sectionsEl, { id: 'adv-ban-section' });

        // --- INÍCIO DOS NOVOS RELATÓRIOS (LÓGICA ATUALIZADA) ---

        // Loop para criar seções separadas para o relatório simplificado
        finalPunishedUsers.forEach((user, index) => {
            const userInfo = finalPunishedInfos[index];
            const discordId = userInfo?.user_info?.id || '';
            const punicaoMultaText = generatePunishmentText(user, userInfo);
            const motivoText = user.displayRules.join(' + ');

            const simpleReportContent = `:label: **ADV/BAN** :label:

**ID:** \`${user.gameId}\`
**DISCORD:** ${discordId ? `<@${discordId}>` : ''}
**TICKET:** \`${ticketNumber}\`
**MOTIVO:** ${motivoText}
**PUNIÇÃO:** ${punicaoMultaText}`;

            // Cria um título dinâmico se houver mais de um
            const reportTitle = finalPunishedUsers.length > 1
                ? `Relatório ADV/BAN (Simplificado ${index + 1}/${finalPunishedUsers.length})`
                : `Relatório ADV/BAN (Simplificado)`;

            handler.utils.createSection(reportTitle, `<pre>${simpleReportContent}</pre>`, handler.sectionsEl, {
                id: `adv-ban-simple-section-${index}`
            });
        });
        
        // --- FIM DOS NOVOS RELATÓRIOS ---
    },

    renderRuleImages(handler, data) {
        const finalPunishedUsers = handler.finalPunishedUsers || [];
        const allRules = window.ruleData.fullRuleSet;
        const uniqueRules = [...new Set(finalPunishedUsers.flatMap(u => u.rules))];
        const ruleImages = uniqueRules.map(ruleName => {
            if (ruleName === 'Loot Indevido' && !window.ruleData.fullRuleSet.find(r => r.regra === 'Loot Indevido')) {
                const lootRuleData = window.ruleData.fullRuleSet.find(r => r.regra === 'Loot Indevido');
                return lootRuleData ? lootRuleData.print_name : 'loot_indevido.png';
            }
            if (!allRules) return null; let ruleInfo = allRules.find(r => r.regra === ruleName);
            if (!ruleInfo) {
                for (const mainRule of allRules) {
                    if (mainRule.sub_regras) {
                        const subRuleInfo = mainRule.sub_regras.find(sr => sr.regra === ruleName);
                        if (subRuleInfo) { ruleInfo = subRuleInfo; break; }
                    }
                }
            } return ruleInfo ? ruleInfo.print_name : null;
        }).filter(Boolean);

        if (ruleImages.length > 0) {
            const imagesHtml = ruleImages.map(imgName => `<img src="/denuncia/prints_denuncia/${imgName}" alt="${imgName}" style="max-width: 100%; border-radius: 8px; margin-bottom: 10px;" crossorigin="anonymous">`).join('');
            const onCopyRules = async (sectionElement) => {
                const imageContainer = sectionElement.querySelector('.section-content');
                if (typeof html2canvas === 'undefined') {
                    const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    document.head.appendChild(script); await new Promise(resolve => script.onload = resolve);
                }
                const canvas = await html2canvas(imageContainer, { backgroundColor: '#2c2f33', useCORS: true });
                await new Promise((resolve, reject) => {
                    canvas.toBlob(blob => {
                        if (!blob) return reject(new Error('Falha ao converter canvas.'));
                        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(resolve).catch(reject);
                    }, 'image/png');
                });
            };
            handler.utils.createSection('Imagens das Regras', imagesHtml, handler.sectionsEl, { onCopy: onCopyRules });
        }
    },

    renderFinalMessage(handler, data) {
        const finalMessageTitle = '## DENÚNCIA FINALIZADA';
        const finalMessageText = 'Peço que preserve o link das provas por no mínimo 15 dias, ou poderá ser punido por MÁ FÉ.';
        handler.utils.createSection(finalMessageTitle, `<pre>${finalMessageText}</pre>`, handler.sectionsEl, { copyText: `${finalMessageTitle}\n${finalMessageText}` });
    }
};