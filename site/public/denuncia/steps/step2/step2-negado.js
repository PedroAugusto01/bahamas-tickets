(function() {
    console.log('[step2-negado.js] Script iniciado.'); // DEBUG

    const select = document.getElementById('denied-reason');
    const btnNext = document.getElementById('btn-step2-negado-next');
    const btnBack = document.getElementById('btn-back-to-step1'); // Seleciona o botão Voltar
    const logCheck = document.getElementById('optional-log-check-denied');
    const dateContainer = document.querySelector('.log-date-container');
    const accusedIdInput = document.getElementById('denied-accused-game-id');
    const logDateInput = document.getElementById('log-date-denied');
    const rulesContainer = document.getElementById('denied-rules-container');
    const rulesListElement = document.getElementById('denied-rules-list');
    const ruleFilterInput = document.getElementById('denied-rule-filter');

    let selectedRule = null;

    if (!select || !btnNext || !btnBack || !logCheck || !dateContainer || !accusedIdInput || !logDateInput || !rulesContainer || !rulesListElement || !ruleFilterInput) {
        console.error('[step2-negado.js] Erro: Um ou mais elementos do DOM não foram encontrados.');
        return; // Interrompe a execução se algum elemento essencial faltar
    }
    console.log('[step2-negado.js] Todos os elementos do DOM foram encontrados.'); // DEBUG

    select.innerHTML = '<option value="">-- Selecione o Motivo --</option>';
    window.ruleData.deniedReasons.forEach(reason => {
        select.add(new Option(reason.regra, reason.regra));
    });

    rulesListElement.innerHTML = window.ruleData.punishmentRules.map(rule => {
         const mainRule = window.ruleData.fullRuleSet.find(r => r.regra === rule.regra);
         if (mainRule && mainRule.sub_regras && mainRule.sub_regras.length > 0) {
             return mainRule.sub_regras.map(sub => `<li data-rule="${sub.regra}">${sub.regra}</li>`).join('');
         } else {
             return `<li data-rule="${rule.regra}">${rule.regra}</li>`;
         }
    }).join('');

    const validateStep = () => {
         console.log('[step2-negado.js] Executando validateStep...'); // DEBUG
         const reason = select.value;
         const needsRuleSelected = reason === 'Não houve quebra de regras';
         const ruleIsValid = !needsRuleSelected || (needsRuleSelected && selectedRule);
         const needsLog = logCheck.checked;
         const dateIsValid = !needsLog || (needsLog && logDateInput.value.trim() !== '');
         const accusedIdIsValid = accusedIdInput.value.trim() !== '';
         const reasonIsValid = reason !== ""; // Garante que um motivo foi selecionado

         const isStepValid = reasonIsValid && ruleIsValid && dateIsValid && accusedIdIsValid;
         console.log(`[step2-negado.js] Validação: reason=${reason}, needsRule=${needsRuleSelected}, ruleValid=${ruleIsValid}, needsLog=${needsLog}, dateValid=${dateIsValid}, accusedIdValid=${accusedIdIsValid}, stepValid=${isStepValid}`); // DEBUG
         btnNext.disabled = !isStepValid;
    };


    select.addEventListener('change', () => {
        console.log('[step2-negado.js] Motivo selecionado:', select.value); // DEBUG
        if (select.value === 'Não houve quebra de regras') {
            rulesContainer.classList.remove('hidden');
        } else {
            rulesContainer.classList.add('hidden');
            const currentlySelected = rulesListElement.querySelector('.selected');
            if (currentlySelected) {
                currentlySelected.classList.remove('selected');
            }
            selectedRule = null;
        }
        validateStep();
    });

    ruleFilterInput.addEventListener('input', (e) => {
        const filterText = e.target.value.toLowerCase();
        rulesListElement.querySelectorAll('li').forEach(item => {
            const itemText = item.textContent.toLowerCase();
            item.style.display = itemText.includes(filterText) ? '' : 'none';
        });
    });

    rulesListElement.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li) {
            const currentlySelected = rulesListElement.querySelector('.selected');
            if (currentlySelected) {
                currentlySelected.classList.remove('selected');
            }
            li.classList.add('selected');
            selectedRule = li.dataset.rule;
            console.log('[step2-negado.js] Regra selecionada:', selectedRule); // DEBUG
            validateStep();
        }
    });

    logCheck.addEventListener('change', () => {
        console.log('[step2-negado.js] Checkbox de log alterado:', logCheck.checked); // DEBUG
        dateContainer.classList.toggle('hidden', !logCheck.checked);
        validateStep();
    });

    accusedIdInput.addEventListener('input', validateStep);
    logDateInput.addEventListener('input', validateStep);

    btnBack.addEventListener('click', () => {
         console.log('[step2-negado.js] Botão Voltar clicado.'); // DEBUG
         window.loadStep('step1');
    });
    console.log('[step2-negado.js] Listener adicionado ao botão Voltar.'); // DEBUG

    btnNext.addEventListener('click', () => {
         console.log('[step2-negado.js] Botão Avançar clicado.'); // DEBUG
        const needsLog = logCheck.checked;
        const reason = select.value;

        window.formData.flow = 'denied';

        window.formData.deniedInfo = {
            accusedId: accusedIdInput.value.trim(),
            reason: reason,
            evaluatedRule: reason === 'Não houve quebra de regras' ? selectedRule : null,
            needsLog: needsLog,
            logDate: needsLog ? logDateInput.value.trim() : null
        };

        window.formData.punishedUsers = [];

        if (needsLog) {
            window.formData.punishedUsers.push({
                index: 1,
                gameId: accusedIdInput.value.trim(),
                rules: [reason === 'Não houve quebra de regras' ? selectedRule : reason],
                displayRules: [reason === 'Não houve quebra de regras' ? selectedRule : reason],
                needsLog: true,
                logDate: logDateInput.value.trim()
            });
            console.log('[step2-negado.js] Indo para step3-logs.'); // DEBUG
            window.loadStep('step3-logs');
        } else {
             console.log('[step2-negado.js] Indo para step4-summary.'); // DEBUG
            window.loadStep('step4-summary');
        }
    });
     console.log('[step2-negado.js] Listener adicionado ao botão Avançar.'); // DEBUG

     validateStep();
     console.log('[step2-negado.js] Validação inicial concluída.'); // DEBUG

})();