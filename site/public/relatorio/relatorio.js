let fullReportHistory = [];
let activeFilters = new Set();

function handleUnauthorized(response) {
    if (response.status === 401) {
        window.location.href = '/';
        return true;
    }
    return false;
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/user');
        if (handleUnauthorized(response)) return;

        const user = await response.json();
        const userProfileDiv = document.getElementById('nav-user-profile');
        if (userProfileDiv) {
            userProfileDiv.innerHTML = `
                <img src="${user.avatarUrl}" alt="Avatar" class="nav-user-avatar">
                <span>${user.username}</span>
            `;
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
    }
});

document.getElementById('verify-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const userId = form.userId.value;
    const reportContentDiv = document.getElementById('report-content');
    reportContentDiv.innerHTML = '<p>Buscando relatório...</p>';

    const filtersContainer = document.getElementById('history-filters');
    if (filtersContainer) {
        filtersContainer.innerHTML = '';
    }
    activeFilters.clear();

    try {
        const response = await fetch(`/api/verificar-usuario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (handleUnauthorized(response)) return;

        const report = await response.json();
        renderReport(report);

    } catch (error) {
        console.error('Erro na verificação:', error);
        reportContentDiv.innerHTML = '<p style="color: #ff6b6b;">Erro de comunicação. Tente novamente.</p>';
    }
});

function getSeverityClass(roleName) {
    const lowerCaseRole = roleName.toLowerCase();
    if (lowerCaseRole.includes('banido')) return 'severity-high';
    if (lowerCaseRole.includes('advertência²')) return 'severity-medium';
    if (lowerCaseRole.includes('advertência¹')) return 'severity-low';
    return 'severity-info';
}

function applyFilters() {
    const historyContainer = document.querySelector('.history-list');
    if (!historyContainer) return;

    if (activeFilters.size === 0) {
        historyContainer.innerHTML = renderHistoryItems(fullReportHistory);
    } else {
        const filteredHistory = fullReportHistory.filter(entry => activeFilters.has(entry.type));
        historyContainer.innerHTML = renderHistoryItems(filteredHistory);
    }
}

function renderFilterButtons() {
    const filtersContainer = document.getElementById('history-filters');
    filtersContainer.innerHTML = '';

    const eventTypes = [...new Set(fullReportHistory.map(entry => entry.type))];
    
    eventTypes.forEach(type => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.textContent = type;
        button.dataset.filterType = type;

        button.addEventListener('click', () => {
            if (activeFilters.has(type)) {
                activeFilters.delete(type);
                button.classList.remove('active');
            } else {
                activeFilters.add(type);
                button.classList.add('active');
            }
            applyFilters();
        });

        filtersContainer.appendChild(button);
    });
}

function renderHistoryItems(history) {
    if (!history || history.length === 0) {
        return '<li class="history-item" style="display:block; text-align:center;">Nenhum registro encontrado para os filtros selecionados.</li>';
    }

    return history.map(entry => {
        const duplicateClass = entry.is_duplicate ? 'history-item-duplicate' : '';
        const duplicateText = entry.is_duplicate ? '<span class="duplicate-label">(Duplicada)</span>' : '';
        
        return `
        <li class="history-item ${duplicateClass}">
            <span class="date">${entry.date}</span>
            <div class="event-info">
                <span class="event-type">${entry.type}</span>
                <span class="event-details">${entry.details_text} ${duplicateText}</span>
            </div>
            <a href="${entry.url}" target="_blank">Ver Registro</a>
        </li>`;
    }).join('');
}

function renderReport(report) {
    const reportContentDiv = document.getElementById('report-content');

    if (report.error) {
        reportContentDiv.innerHTML = `<p style="color: #ff6b6b;">${report.error}</p>`;
        return;
    }

    fullReportHistory = report.full_history || [];

    let unappliedPunishments = [];
    if (report.active_punishment_ids_from_history && report.current_role_ids_from_discord) {
        
        const punishmentMap = {
            "1345133156361179208": "SERVIDOR・Advertência verbal",
            "1345132696854073486": "SERVIDOR・Advertência¹",
            "1345132420306833580": "SERVIDOR・Advertência²",
            "1345132098394132481": "SERVIDOR・Banido",
            "0": "TELAGEM・Banido",
            "1430743561845866557": "SS-ALERTA",
            "1345134004260569190": "CITIZEN-ATENÇÃO",
            "1351597668404822106": "SS-ATENÇÃO"
        };

        report.active_punishment_ids_from_history.forEach(punishmentId => {
            if (!report.current_role_ids_from_discord.includes(punishmentId)) {
                unappliedPunishments.push(punishmentMap[punishmentId] || punishmentId);
            }
        });
    }
    
    let recommendationHtml = unappliedPunishments.length > 0
        ? `<div class="recommendation">ALERTA: O histórico indica as seguintes punições ativas que não estão aplicadas como cargos: ${unappliedPunishments.join(', ')}.</div>`
        : '';

    const tagsHtml = report.current_roles_from_discord && report.current_roles_from_discord.length > 0
        ? report.current_roles_from_discord.map(role => `
            <li class="punishment-tag ${getSeverityClass(role)}">${role}</li>
          `).join('')
        : '<li>Nenhum cargo de punição aplicado.</li>';
    
    reportContentDiv.innerHTML = `
        <div class="profile-header">
            <img src="${report.user_info.avatar_url}" alt="Avatar do usuário" class="profile-avatar">
            <h2 class="profile-name">${report.user_info.name}</h2>
            <p class="profile-id">ID: ${report.user_info.id}</p>
            <ul class="profile-tags">
                ${tagsHtml}
            </ul>
        </div>
        
        ${recommendationHtml}

        <div class="history-container">
            <h3>Histórico Completo (${fullReportHistory.length})</h3>
            <div id="history-filters"></div>
            <ul class="history-list">
                </ul>
        </div>
    `;

    renderFilterButtons();
    applyFilters();
}