const detailEl = document.getElementById('detail');
const backButton = document.getElementById('back-button');
const STORAGE_KEY = 'selectedJobDetail';

backButton.addEventListener('click', () => {
    window.location.href = 'index.html';
});

const stored = sessionStorage.getItem(STORAGE_KEY);
if (!stored) {
    detailEl.innerHTML = `
        <h3>상세 정보 없음</h3>
        <p>선택된 공고 정보를 찾을 수 없습니다. 목록으로 돌아가 다시 선택해 주세요.</p>
    `;
} else {
    try {
        const { item, normalized } = JSON.parse(stored);
        renderDetail(item, normalized);
    } catch (error) {
        detailEl.innerHTML = `
            <h3>상세 정보 오류</h3>
            <p>데이터를 불러오는 중 문제가 발생했습니다. 목록에서 다시 선택해 주세요.</p>
        `;
    }
}

function renderDetail(item, normalized) {
    const details = buildDetailList(item, normalized);
    detailEl.innerHTML = `
        <h3>${escapeHtml(normalized.title)}</h3>
        <p>${escapeHtml(normalized.summary)}</p>
        <div class="detail-list">
            ${details.map((detail) => `
                <div class="detail-item">
                    <span>${escapeHtml(detail.label)}</span>
                    <strong>${escapeHtml(detail.value)}</strong>
                </div>
            `).join('')}
        </div>
        ${normalized.link ? `<a href="${escapeHtml(normalized.link)}" target="_blank" rel="noopener">공고 자세히 보기</a>` : ''}
    `;
}

function buildDetailList(item, normalized) {
    const preferred = [
        { label: '기관', value: normalized.agency },
        { label: '지역', value: normalized.location },
        { label: '분류', value: normalized.category },
        { label: '마감', value: normalized.deadline },
    ];

    const dynamic = Object.entries(item)
        .filter(([key, value]) => typeof value !== 'object' && value !== null && value !== '')
        .slice(0, 8)
        .map(([key, value]) => ({ label: key, value: String(value) }));

    return [...preferred, ...dynamic].filter((entry) => entry.value);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
