(function () {
    const count = parseInt(window.formData.punishedCount, 10);
    const container = document.getElementById('punished-users-container');
    const btnNext = document.getElementById('btn-step2-punicao-next');

    const findRuleData = (ruleName) => {
        if (!window.ruleData || !window.ruleData.fullRuleSet) return null;
        let rule = window.ruleData.fullRuleSet.find(r => r.regra === ruleName);
        if (rule) return rule;
        
        for (const mainRule of window.ruleData.fullRuleSet) {
            if (mainRule.sub_regras) {
                rule = mainRule.sub_regras.find(sr => sr.regra === ruleName);
                if (rule) return rule;
            }
        }
        return null;
    };

    const getHighestPunishment = (punishments) => {
        const levels = ['verbal', 'adv1', 'adv2', 'banido'];
        let maxIndex = -1;
        let maxPunishment = 'verbal';

        punishments.forEach(p => {
            const index = levels.indexOf(p);
            if (index > maxIndex) {
                maxIndex = index;
                maxPunishment = p;
            }
        });
        return maxPunishment;
    };


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

            const selectedWithSubRules = block.querySelector('.rules-list li.selected[data-has-sub-rules="true"]');
            if (selectedWithSubRules) {
                const subRuleSelector = block.querySelector('.sub-rule-selector');
                if (!subRuleSelector || subRuleSelector.value === "") {
                    allValid = false;
                    break;
                }
            }
            
            const punishmentChoiceContainer = block.querySelector('.punishment-choice-container');
            if (punishmentChoiceContainer && punishmentChoiceContainer.innerHTML.trim() !== '') {
                const choice = punishmentChoiceContainer.querySelector(`input[name="punish-choice-${i}"]:checked`);
                if (!choice) {
                    allValid = false;
                    break;
                }
            }
        }
        btnNext.disabled = !allValid;
    };

    const handlePunishmentChoice = (block) => {
        const choiceContainer = block.querySelector('.punishment-choice-container');
        const selectedRules = block.querySelectorAll('.rules-list li.selected');
        const blockIndex = block.id.split('-').pop();

        choiceContainer.innerHTML = '';

        if (selectedRules.length === 0) {
            block.dataset.highestPrisonTime = 0;
            block.dataset.highestPunicaoMinima = 'verbal';
            validateStep();
            return;
        }

        const rulesWithPrison = Array.from(selectedRules).filter(li => parseInt(li.dataset.prisonTime || 0, 10) > 0);
        const allPunishments = Array.from(selectedRules).map(li => li.dataset.punicaoMinima || 'verbal');
        const allPrisonTimes = Array.from(selectedRules).map(li => parseInt(li.dataset.prisonTime || 0, 10));

        const highestPunicaoMinima = getHighestPunishment(allPunishments);
        const highestPrisonTime = Math.max(0, ...allPrisonTimes);

        block.dataset.highestPrisonTime = highestPrisonTime;
        block.dataset.highestPunicaoMinima = highestPunicaoMinima;

        if (rulesWithPrison.length > 0) {
            choiceContainer.innerHTML = `
                <div class="choice-title">Opção de Punição:</div>
                <div class="punishment-choice-group">
                    <div class="punishment-choice-radio">
                        <input type="radio" id="choice-prison-${blockIndex}" name="punish-choice-${blockIndex}" value="prison">
                        <label for="choice-prison-${blockIndex}">Aplicar Prisão (<code><span class="prison-val">${highestPrisonTime} meses</span></code>)</label>
                    </div>
                    <div class="punishment-choice-radio">
                        <input type="radio" id="choice-default-${blockIndex}" name="punish-choice-${blockIndex}" value="default" checked>
                        <label for="choice-default-${blockIndex}">Aplicar Punição Padrão (<code><span class="default-val">${highestPunicaoMinima}</span></code>)</label>
                    </div>
                </div>
            `;
            choiceContainer.querySelectorAll(`input[name="punish-choice-${blockIndex}"]`).forEach(radio => {
                radio.addEventListener('change', validateStep);
            });
        }
        
        validateStep();
    };


    const handleRuleSelection = (li) => {
        const block = li.closest('.punished-user-block');
        const subRuleContainer = block.querySelector('.sub-rule-selector-container');

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
        handlePunishmentChoice(block);
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
        block.dataset.highestPrisonTime = 0;
        block.dataset.highestPunicaoMinima = 'verbal';


        let rulesListHtml = window.ruleData.punishmentRules.map(rule => {
            const fullRule = window.ruleData.fullRuleSet.find(r => r.regra === rule.regra);
            const hasSubRules = !!(fullRule && fullRule.sub_regras && fullRule.sub_regras.length > 0);
            const needsLog = rule.consunta_log_morte || rule.consultar_log_matou || rule.auto_consultar_log_loot;
            const prisonTime = rule.prisao || 0;
            const punicaoMinima = rule.punicao_minima || 'verbal';

            let warnings = '';
            if (needsLog) warnings += `<small class="log-warning">OBS: Requer consulta de logs.</small>`;
            if (hasSubRules) warnings += `<small class="sub-rule-warning">OBS: Contém sub-regras.</small>`;
            if (prisonTime > 0) warnings += `<small class="prison-warning">OBS: Prisão customizada (${prisonTime} meses).</small>`;

            return `<li data-rule="${rule.regra}" 
                        data-needs-log="${needsLog}" 
                        data-has-sub-rules="${hasSubRules}" 
                        data-prison-time="${prisonTime}"
                        data-punicao-minima="${punicaoMinima}">
                    <span>${rule.regra}</span>${warnings}</li>`;
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
                
                <div class="form-group punishment-choice-container" id="punishment-choice-container-${i}"></div>
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
                const hasSubRules = li.dataset.hasSubRules === 'true';
                li.classList.toggle('selected');

                if (li.classList.contains('selected')) {
                    if (hasSubRules) {
                        list.querySelectorAll('li.selected').forEach(otherLi => {
                            if (otherLi !== li) otherLi.classList.remove('selected');
                        });
                    } else {
                        list.querySelectorAll('li.selected[data-has-sub-rules="true"]').forEach(subLi => {
                            subLi.classList.remove('selected');
                        });
                    }
                }
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
            
            const prisonTime = parseInt(block.dataset.highestPrisonTime || 0, 10);
            const punicaoMinima = block.dataset.highestPunicaoMinima || 'verbal';

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

            const choiceRadio = block.querySelector(`input[name="punish-choice-${i}"]:checked`);
            const punishmentType = (choiceRadio) ? choiceRadio.value : 'default';

            window.formData.punishedUsers.push({
                index: i,
                gameId: document.getElementById(`punished-game-id-${i}`).value,
                displayRules: displayRules, 
                rules: lookupRules,      
                needsLog: needsLog,
                logDate: needsLog ? document.getElementById(`log-date-${i}`).value : null,
                punishmentType: punishmentType, 
                prisonTime: prisonTime, 
                punicaoMinima: punicaoMinima 
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