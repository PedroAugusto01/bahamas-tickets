document.addEventListener('DOMContentLoaded', async () => {
    // Mapeamento de elementos do DOM
    const itemListEl = document.getElementById('item-list');
    const itemFilterEl = document.getElementById('item-filter');
    const summaryLogQuantityEl = document.getElementById('summary-log-quantity');
    const summarySpawnCommandEl = document.getElementById('summary-spawn-command');
    const summaryValueDetailsEl = document.getElementById('summary-value-details');
    const summaryTotalFormattedEl = document.getElementById('summary-total-formatted');
    const summaryTotalRawEl = document.getElementById('summary-total-raw');
    const logInputEl = document.getElementById('log-input');
    const processLogBtn = document.getElementById('process-log-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    
    let itemsData = [];

    async function fetchData() {
        try {
            const [pricesRes, mappingRes] = await Promise.all([
                fetch('/api/item-prices').then(res => res.json()),
                fetch('/api/item-mapping').then(res => res.json())
            ]);
            
            const pricesMap = pricesRes.reduce((acc, item) => {
                acc[item.name.toLowerCase()] = item.price;
                return acc;
            }, {});

            let allItems = Object.entries(mappingRes).map(([spawnName, logName]) => {
                const lowerLogName = logName.toLowerCase();
                let price = pricesMap[lowerLogName];

                if (price === undefined) {
                    const strippedLogName = lowerLogName.replace(/^(weapon_|ammo_)/, '');
                    price = pricesMap[strippedLogName] || 0;
                }

                return {
                    spawnName: spawnName,
                    logName: logName,
                    price: price,
                    quantity: 0
                };
            });
            
            itemsData = allItems.filter(item => item.price > 0);
            itemsData.sort((a, b) => a.spawnName.localeCompare(b.spawnName));
            renderItemList();

        } catch (error) {
            itemListEl.innerHTML = '<p class="error">Falha ao carregar dados dos itens.</p>';
            console.error(error);
        }
    }

    function renderItemList() {
        const filter = itemFilterEl.value.toLowerCase();
        const filteredItems = itemsData.filter(item => 
            item.spawnName.toLowerCase().includes(filter) || 
            item.logName.toLowerCase().includes(filter)
        );

        if (filteredItems.length === 0) {
            itemListEl.innerHTML = '<p>Nenhum item encontrado.</p>';
            return;
        }
        
        itemListEl.innerHTML = filteredItems.map(item => {
            const formattedPrice = item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            return `
            <div class="item-card" data-log-name="${item.logName}">
                <div class="item-name">${item.spawnName.toUpperCase()}</div>
                <div class="item-log-name">${item.logName}</div>
                <div class="item-price">${formattedPrice}</div>
                <div class="item-actions">
                    <input type="number" min="0" class="quantity-input" data-log-name="${item.logName}" value="${item.quantity || 0}" placeholder="0">
                </div>
            </div>
        `}).join('');
    }

    function updateSummaries() {
        const itemsWithQuantity = itemsData.filter(item => item.quantity > 0);
        let totalValue = 0;

        summaryLogQuantityEl.value = itemsWithQuantity.map(item => `${item.logName} x${item.quantity}`).join('\n');
        
        summarySpawnCommandEl.value = itemsWithQuantity.map(item => {
            const finalLogName = item.logName.replace(/^WEAPON_/, 'PACKAGE_');
            return `/item ${finalLogName} ${item.quantity};`;
        }).join('\n');
        
        summaryValueDetailsEl.value = itemsWithQuantity.map(item => {
            const itemTotal = item.price * item.quantity;
            totalValue += itemTotal;
            const formattedTotal = itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            return `${item.spawnName.toUpperCase()}: ${item.quantity} x ${item.price.toLocaleString('pt-BR')} = ${formattedTotal}`;
        }).join('\n');

        summaryTotalFormattedEl.value = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        summaryTotalRawEl.value = totalValue;
    }
    
    function processLog() {
        itemsData.forEach(item => item.quantity = 0);

        const logText = logInputEl.value;
        const lines = logText.split('\n');
        const quantitiesMap = new Map();

        lines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(' x ');
            if (parts.length < 2) return;
            const logName = parts[0].trim();
            const quantity = parseInt(parts[1].trim(), 10);
            if (isNaN(quantity)) return;

            if (logName.startsWith('WEAPON_') || logName.startsWith('PACKAGE_')) {
                const weaponName = logName.replace(/^(WEAPON_|PACKAGE_)/, '');
                const ammoName = `AMMO_${weaponName}`;
                
                const fullWeaponLogName = `WEAPON_${weaponName}`;
                quantitiesMap.set(fullWeaponLogName, (quantitiesMap.get(fullWeaponLogName) || 0) + 1);
                
                quantitiesMap.set(ammoName, (quantitiesMap.get(ammoName) || 0) + quantity);
            } else {
                quantitiesMap.set(logName, (quantitiesMap.get(logName) || 0) + quantity);
            }
        });

        quantitiesMap.forEach((quantity, logName) => {
            const item = itemsData.find(i => i.logName === logName);
            if (item) {
                item.quantity = quantity;
            }
        });
        
        renderItemList();
        updateSummaries();
    }

    function clearAllData() {
        itemsData.forEach(item => item.quantity = 0);

        logInputEl.value = '';
        
        updateSummaries();
        renderItemList();
    }

    itemListEl.addEventListener('input', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const logName = e.target.dataset.logName;
            const quantity = parseInt(e.target.value, 10) || 0;
            const item = itemsData.find(i => i.logName === logName);
            if (item) {
                item.quantity = quantity < 0 ? 0 : quantity;
                if (quantity < 0) e.target.value = 0;
            }
            updateSummaries();
        }
    });

    itemFilterEl.addEventListener('input', renderItemList);
    processLogBtn.addEventListener('click', processLog);
    clearAllBtn.addEventListener('click', clearAllData); 

    document.querySelector('.calculator-layout').addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-btn')) {
            const targetId = e.target.dataset.target;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                navigator.clipboard.writeText(targetEl.value).then(() => {
                    const originalText = e.target.textContent;
                    e.target.textContent = 'Copiado!';
                    setTimeout(() => e.target.textContent = originalText, 2000);
                });
            }
        }
    });

    fetchData();
});