(function () {
    const count = parseInt(window.formData.punishedCount, 10);
    const container = document.getElementById('punished-users-container');
    const btnNext = document.getElementById('btn-step2-punicao-next');

    const validateStep = () => {
        let allValid = true;
        for (let i = 1; i <= count; i++) {
            const block = document.querySelector(`#punished-user-block-${i}`);

            const idInput = block.querySelector(`#punished-game-id-${i}`);
            if (!idInput || !idInput.value.trim()) {
                allValid = false;
                break;
            }

            const mainRuleList = block.querySelector('.rules-list');
            const selectedMainRules = mainRuleList.querySelectorAll('li.selected');
            if (selectedMainRules.length === 0) {
                allValid = false;
                break;
            }

            // Verifica se alguma regra selecionada com sub-regras tem uma sub-regra por selecionar
            const selectedWithSubRules = block.querySelector('.rules-list li.selected[data-has-sub-rules="true"]');
            if (selectedWithSubRules) {
                const subRuleSelector = block.querySelector('.sub-rule-selector');
                if (!subRuleSelector || subRuleSelector.value === "") {
                    allValid = false;
                    break;
                }
            }
        }
        btnNext.disabled = !allValid;
    };

    const handleRuleSelection = (li) => {
        const block = li.closest('.punished-user-block');
        const subRuleContainer = block.querySelector('.sub-rule-selector-container');

        // Limpa e recria o seletor de sub-regras, se necessário
        subRuleContainer.innerHTML = '';
        const selectedWithSubRules = block.querySelector('.rules-list li.selected[data-has-sub-rules="true"]');

        if (selectedWithSubRules) {
            const mainRuleName = selectedWithSubRules.dataset.rule;
            const fullRuleData = window.ruleData.fullRuleSet.find(r => r.regra === mainRuleName);

            if (fullRuleData && fullRuleData.sub_regras) {
                const select = document.createElement('select');
                select.className = 'sub-rule-selector';
                select.innerHTML = `<option value="">-- Selecione a sub-regra --</option>`;
                fullRuleData.sub_regras.forEach(subRule => {
                    select.add(new Option(subRule.regra, subRule.regra));
                });
                select.addEventListener('change', validateStep);
                subRuleContainer.appendChild(select);
            }
        }

        updateLogVisibility(block);
        validateStep();
    };

    const updateLogVisibility = (userBlock) => {
        const optionalLogContainer = userBlock.querySelector('.optional-log-container');
        const dateContainer = userBlock.querySelector('.log-date-container');
        const optionalLogCheck = userBlock.querySelector('.optional-log-check');

        const selectedRules = userBlock.querySelectorAll('.rules-list li.selected');
        const hasMandatoryLogRule = Array.from(selectedRules).some(li => li.dataset.needsLog === 'true');

        if (hasMandatoryLogRule) {
            optionalLogContainer.classList.add('hidden');
            optionalLogCheck.checked = false;
            dateContainer.classList.remove('hidden');
        } else if (selectedRules.length > 0) {
            optionalLogContainer.classList.remove('hidden');
            dateContainer.classList.toggle('hidden', !optionalLogCheck.checked);
        } else {
            optionalLogContainer.classList.add('hidden');
            dateContainer.classList.add('hidden');
            optionalLogCheck.checked = false;
        }
    };

    for (let i = 1; i <= count; i++) {
        const block = document.createElement('div');
        block.className = 'punished-user-block';
        block.id = `punished-user-block-${i}`;

        let rulesListHtml = window.ruleData.punishmentRules.map(rule => {
            const fullRule = window.ruleData.fullRuleSet.find(r => r.regra === rule.regra);
            const hasSubRules = !!(fullRule && fullRule.sub_regras && fullRule.sub_regras.length > 0);
            const needsLog = rule.consunta_log_morte || rule.consultar_log_matou || rule.auto_consultar_log_loot;

            let warnings = '';
            if (needsLog) warnings += `<small class="log-warning">OBS: Requer consulta de logs.</small>`;
            if (hasSubRules) warnings += `<small class="sub-rule-warning">OBS: Contém sub-regras.</small>`;

            return `<li data-rule="${rule.regra}" data-needs-log="${needsLog}" data-has-sub-rules="${hasSubRules}"><span>${rule.regra}</span>${warnings}</li>`;
        }).join('');

        block.innerHTML = `
            <h4>Pessoa Punida #${i}</h4>
            <div class="form-group">
                <label for="punished-game-id-${i}">ID in-game:</label>
                <input type="text" id="punished-game-id-${i}" placeholder="ID in-game do jogador...">
            </div>
            <div class="form-group">
                <label for="rule-filter-${i}">Regras Quebradas:</label>
                <div class="rules-selector">
                    <input type="text" id="rule-filter-${i}" class="rule-filter-input" placeholder="Filtrar regras...">
                    <ul class="rules-list">${rulesListHtml}</ul>
                </div>
                <div class="sub-rule-selector-container"></div>
            </div>
            <div class="form-group optional-log-container hidden">
                <div class="checkbox-group">
                    <input type="checkbox" id="optional-log-check-${i}" class="optional-log-check">
                    <label for="optional-log-check-${i}">Consultar logs de morte/matou opcionalmente?</label>
                </div>
            </div>
            <div class="form-group log-date-container hidden">
                <label for="log-date-${i}">Data para Consulta (DD/MM/AAAA):</label>
                <input type="text" id="log-date-${i}" placeholder="DD/MM/AAAA">
            </div>`;
        container.appendChild(block);

        block.querySelector(`#punished-game-id-${i}`).addEventListener('input', validateStep);
        block.querySelector('.optional-log-check').addEventListener('change', () => updateLogVisibility(block));
    }

    document.querySelectorAll('.rule-filter-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const filterText = e.target.value.toLowerCase();
            const list = e.target.closest('.rules-selector').querySelector('.rules-list');
            list.querySelectorAll('li').forEach(item => {
                const itemText = item.querySelector('span').textContent.toLowerCase();
                item.style.display = itemText.includes(filterText) ? '' : 'none';
            });
        });
    });

    document.querySelectorAll('.rules-list').forEach(list => {
        list.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li) {
                li.classList.toggle('selected');
                handleRuleSelection(li);
            }
        });
    });

    btnNext.addEventListener('click', () => {
        window.formData.punishedUsers = [];
        let anyNeedsLog = false;

        for (let i = 1; i <= count; i++) {
            const block = document.querySelector(`#punished-user-block-${i}`);
            const selectedLis = block.querySelectorAll('.rules-list li.selected');

            if (selectedLis.length === 0) continue;

            const displayRules = [];
            const lookupRules = [];

            selectedLis.forEach(li => {
                if (li.dataset.hasSubRules === 'true') {
                    const subRuleSelector = block.querySelector('.sub-rule-selector');
                    if (subRuleSelector && subRuleSelector.value) {
                        displayRules.push(`${li.dataset.rule} (${subRuleSelector.value})`);
                        lookupRules.push(subRuleSelector.value);
                    }
                } else {
                    displayRules.push(li.dataset.rule);
                    lookupRules.push(li.dataset.rule);
                }
            });

            const hasMandatoryLogRule = Array.from(selectedLis).some(li => li.dataset.needsLog === 'true');
            const optionalLogChecked = document.getElementById(`optional-log-check-${i}`).checked;
            const needsLog = hasMandatoryLogRule || optionalLogChecked;

            if (needsLog) {
                anyNeedsLog = true;
            }

            window.formData.punishedUsers.push({
                index: i,
                gameId: document.getElementById(`punished-game-id-${i}`).value,
                displayRules: displayRules, // Para o texto do relatório
                rules: lookupRules,      // Para encontrar prints e dados
                needsLog: needsLog,
                logDate: needsLog ? document.getElementById(`log-date-${i}`).value : null
            });
        }

        if (anyNeedsLog) {
            window.loadStep('step3-logs');
        } else {
            window.loadStep('step4-summary');
        }
    });

    document.getElementById('btn-back-to-step1').addEventListener('click', () => window.loadStep('step1'));
    validateStep();
})();