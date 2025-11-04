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