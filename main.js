const SERVICE_KEY = 'aa979dec-76e3-4d9e-86a1-6652b1470a5e';
const STORAGE_KEY = 'cultureJobApiUrl';
const DEFAULT_API_URL = 'https://api.kcisa.kr/API_CIA_077/request';

const apiUrlInput = document.getElementById('api-url');
const keywordInput = document.getElementById('keyword');
const rowsSelect = document.getElementById('rows');
const extraParamsInput = document.getElementById('extra-params');
const searchButton = document.getElementById('search-button');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const detailEl = document.getElementById('detail');
const summaryEl = document.getElementById('summary');
const prevButton = document.getElementById('prev-page');
const nextButton = document.getElementById('next-page');
const pageIndicator = document.getElementById('page-indicator');

const state = {
    page: 1,
    total: 0,
    items: [],
};

apiUrlInput.value = localStorage.getItem(STORAGE_KEY) || DEFAULT_API_URL;

searchButton.addEventListener('click', () => {
    state.page = 1;
    loadJobs();
});

prevButton.addEventListener('click', () => {
    if (state.page > 1) {
        state.page -= 1;
        loadJobs();
    }
});

nextButton.addEventListener('click', () => {
    state.page += 1;
    loadJobs();
});

if (apiUrlInput.value) {
    loadJobs();
}

async function loadJobs() {
    const apiUrl = apiUrlInput.value.trim();
    if (!apiUrl) {
        setStatus('요청 URL을 입력해 주세요.');
        return;
    }

    localStorage.setItem(STORAGE_KEY, apiUrl);

    setStatus('데이터를 불러오는 중입니다...');
    listEl.innerHTML = '';
    summaryEl.textContent = '일자리 정보를 불러오는 중입니다.';

    try {
        const url = buildUrl(apiUrl);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let data;
        if (contentType.includes('xml')) {
            const text = await response.text();
            data = parseXml(text);
        } else {
            data = await response.json();
        }

        const items = extractItems(data);
        state.items = items;
        state.total = extractTotalCount(data, items.length);
        renderList(items);
        updateSummary();
        setStatus(`총 ${state.total || items.length}건 중 ${items.length}건 표시 중`);
    } catch (error) {
        listEl.innerHTML = '<div class="empty">데이터를 불러오지 못했습니다. 요청 URL 또는 CORS 설정을 확인해 주세요.</div>';
        summaryEl.textContent = '오류로 인해 데이터를 가져오지 못했습니다.';
        setStatus(error.message || '알 수 없는 오류');
        detailEl.innerHTML = '<h3>상세 정보</h3><p>요청 정보를 확인하고 다시 시도해 주세요.</p>';
    }

    pageIndicator.textContent = String(state.page);
}

function buildUrl(baseUrl) {
    const url = new URL(baseUrl);
    if (!url.searchParams.has('serviceKey')) {
        url.searchParams.set('serviceKey', SERVICE_KEY);
    }
    if (!url.searchParams.has('_type')) {
        url.searchParams.set('_type', 'json');
    }
    if (!url.searchParams.has('pageNo')) {
        url.searchParams.set('pageNo', String(state.page));
    }
    if (!url.searchParams.has('numOfRows')) {
        url.searchParams.set('numOfRows', rowsSelect.value);
    }

    const keyword = keywordInput.value.trim();
    if (keyword && !url.searchParams.has('keyword')) {
        url.searchParams.set('keyword', keyword);
    }

    const extra = extraParamsInput.value.trim();
    if (extra) {
        extra.split('&').forEach((pair) => {
            const [key, value] = pair.split('=');
            if (key && value && !url.searchParams.has(key)) {
                url.searchParams.set(key, value);
            }
        });
    }

    return url.toString();
}

function renderList(items) {
    if (!items.length) {
        listEl.innerHTML = '<div class="empty">검색 결과가 없습니다.</div>';
        return;
    }

    listEl.innerHTML = '';
    items.forEach((item, index) => {
        const normalized = normalizeItem(item);
        const row = document.createElement('div');
        row.className = 'list-item';
        row.dataset.index = String(index);
        row.innerHTML = `
            <h4>${escapeHtml(normalized.title)}</h4>
            <span>${escapeHtml(normalized.agency)}</span>
            <span>${escapeHtml(normalized.location)}</span>
            <time>${escapeHtml(normalized.deadline)}</time>
        `;
        row.addEventListener('click', () => {
            selectRow(row);
            renderDetail(item, normalized);
        });
        listEl.appendChild(row);
        if (index === 0) {
            selectRow(row);
            renderDetail(item, normalized);
        }
    });
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

function updateSummary() {
    summaryEl.textContent = `현재 페이지: ${state.page} · 표시: ${state.items.length}건`;
}

function extractItems(data) {
    if (!data) return [];
    const candidates = [
        data.response?.body?.items?.item,
        data.response?.body?.items,
        data.response?.body?.item,
        data.items?.item,
        data.items,
        data.data?.item,
        data.data,
        data.list,
        data.result?.items,
        data.result,
    ];
    const found = candidates.find((value) => value);
    if (!found) return [];
    return Array.isArray(found) ? found : [found];
}

function extractTotalCount(data, fallback) {
    return (
        data?.response?.body?.totalCount ||
        data?.totalCount ||
        data?.result?.totalCount ||
        data?.total ||
        fallback ||
        0
    );
}

function normalizeItem(item) {
    const title = pickFirst(item, [
        'title',
        'jobTitle',
        'recruitTitle',
        'recruitNm',
        'subject',
        'sj',
        'noticeTitle',
        'jobNm',
    ]) || '제목 정보 없음';

    const agency = pickFirst(item, [
        'agency',
        'org',
        'organization',
        'company',
        'institution',
        'corp',
        'bizNm',
        'orgNm',
    ]) || '기관 정보 없음';

    const deadline = pickFirst(item, [
        'deadline',
        'closeDate',
        'endDate',
        'applyEnd',
        'applyEndDate',
        'receiptEnd',
        'receiptEndDate',
        'periodEnd',
        'dueDate',
    ]) || '마감 정보 없음';

    const location = pickFirst(item, [
        'location',
        'region',
        'area',
        'place',
        'address',
        'addr',
        'workPlace',
    ]) || '지역 정보 없음';

    const category = pickFirst(item, [
        'category',
        'categoryNm',
        'field',
        'jobType',
        'recruitType',
        'workType',
    ]) || '분류 정보 없음';

    const summary = pickFirst(item, [
        'summary',
        'content',
        'description',
        'desc',
        'jobDesc',
    ]) || `${agency} · ${location}`;

    const link = pickFirst(item, [
        'url',
        'link',
        'detailUrl',
        'homepage',
        'applyUrl',
    ]) || '';

    return {
        title,
        summary,
        tags: [agency, location, category, deadline].filter(Boolean),
        agency,
        location,
        category,
        deadline,
        link,
    };
}

function buildDetailList(item, normalized) {
    const preferred = [
        { label: '기관', value: normalized.tags[0] },
        { label: '지역', value: normalized.tags[1] },
        { label: '분류', value: normalized.tags[2] },
        { label: '마감', value: normalized.tags[3] },
    ];

    const dynamic = Object.entries(item)
        .filter(([key, value]) => typeof value !== 'object' && value !== null && value !== '')
        .slice(0, 8)
        .map(([key, value]) => ({ label: key, value: String(value) }));

    return [...preferred, ...dynamic].filter((entry) => entry.value);
}

function pickFirst(item, keys) {
    if (!item) return '';
    for (const key of keys) {
        if (item[key]) {
            return String(item[key]);
        }
    }
    return '';
}

function setStatus(message) {
    statusEl.textContent = message;
}

function selectRow(row) {
    const current = listEl.querySelector('.list-item.selected');
    if (current) {
        current.classList.remove('selected');
    }
    row.classList.add('selected');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseXml(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const items = Array.from(doc.querySelectorAll('item')).map((node) => {
        const obj = {};
        node.childNodes.forEach((child) => {
            if (child.nodeType === 1) {
                obj[child.nodeName] = child.textContent || '';
            }
        });
        return obj;
    });
    return { response: { body: { items: { item: items } } } };
}
