(function() {
    const btnNext = document.getElementById('btn-step1-next');
    const reporterIdInput = document.getElementById('reporter-id');
    const hiddenTicketInput = document.getElementById('ticket-channel');

    function validateStep1() {
        const reporterId = reporterIdInput.value.trim();
        const ticketChannel = hiddenTicketInput.value.trim();
        
        // Ativa o botão apenas se os dois campos obrigatórios tiverem valor
        if (reporterId && ticketChannel) {
            btnNext.disabled = false;
        } else {
            btnNext.disabled = true;
        }
    }

    function setupCustomSelect() {
        const wrapper = document.getElementById('custom-ticket-select');
        if (!wrapper) return;

        const trigger = wrapper.querySelector('.custom-select-trigger');
        const searchInput = wrapper.querySelector('.custom-select-search');
        const optionsList = wrapper.querySelector('.options-list');
        const triggerSpan = trigger.querySelector('span');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
            }
        });

        optionsList.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('option')) {
                const selectedText = e.target.textContent;
                const selectedValue = e.target.dataset.value;
                
                triggerSpan.textContent = selectedText;
                hiddenTicketInput.value = selectedValue;

                const currentlySelected = optionsList.querySelector('.option.selected');
                if (currentlySelected) {
                    currentlySelected.classList.remove('selected');
                }
                e.target.classList.add('selected');

                wrapper.classList.remove('open');
                validateStep1(); // Chama a validação após selecionar um canal
            }
        });
        
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const allOptions = optionsList.querySelectorAll('.option');
            allOptions.forEach(option => {
                const optionText = option.textContent.toLowerCase();
                option.style.display = optionText.includes(searchTerm) ? '' : 'none';
            });
        });

        (async function() {
            try {
                const response = await fetch('/api/ticket-channels');
                if (!response.ok) throw new Error('Falha ao buscar canais.');
                const channels = await response.json();
                
                optionsList.innerHTML = '';
                
                if (channels.length === 0) {
                     triggerSpan.textContent = 'Nenhum canal encontrado';
                     return;
                }

                channels.forEach(ch => {
                    const optionEl = document.createElement('div');
                    optionEl.className = 'option';
                    optionEl.textContent = ch.name;
                    optionEl.dataset.value = ch.id;
                    optionsList.appendChild(optionEl);
                });

            } catch (error) {
                console.error(error);
                triggerSpan.textContent = 'Erro ao carregar canais';
                triggerSpan.style.color = '#ff6b6b';
            }
        })();
    }
    
    setupCustomSelect();

    // Adiciona o listener para o campo de ID
    reporterIdInput.addEventListener('input', validateStep1);

    btnNext.addEventListener('click', () => {
        window.formData.punishedCount = document.getElementById('punished-count').value;
        window.formData.reporterId = reporterIdInput.value;
        window.formData.ticketChannel = hiddenTicketInput.value;
        window.formData.ticketChannelName = document.querySelector('#custom-ticket-select .custom-select-trigger span')?.textContent || '';

        const rawLinks = document.getElementById('video-links').value || '';
        const links = rawLinks.split('\n').map(s => s.trim()).filter(Boolean);
        window.formData.videoLinks = links;

        const nextStep = (window.formData.punishedCount === 'negado') ? 'step2-negado' : 'step2-punicao';
        window.loadStep(nextStep);
    });

    // Chama a validação uma vez para garantir que o botão comece desativado
    validateStep1();
})();