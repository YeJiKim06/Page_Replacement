document.addEventListener('DOMContentLoaded', () => {
    const calcBtn = document.getElementById('calcBtn');

    // 초기 로드 시 시뮬레이션 자동 실행
    runSimulation();

    calcBtn.addEventListener('click', runSimulation);
});

function runSimulation() {
    const frameCount = parseInt(document.getElementById('frameCount').value, 10);
    const rawSequence = document.getElementById('refSequence').value;
    const algorithm = document.getElementById('algorithm').value;

    // 입력받은 문자열을 숫자 배열로 파싱
    const refSequence = rawSequence
        .trim()
        .split(/[\s,]+/)
        .filter(val => val !== '')
        .map(Number);

    if (refSequence.some(isNaN) || refSequence.length === 0) {
        alert('올바른 페이지 참조 순서를 입력해주세요.');
        return;
    }

    if (isNaN(frameCount) || frameCount < 1 || frameCount > 7) {
        alert('프레임 수는 1 이상 7 이하로 입력해 주세요.');
        return;
    }

    // 선택된 알고리즘 계산 실행
    let result;
    switch (algorithm) {
        case 'FIFO':
            result = runFIFO(frameCount, refSequence);
            break;
        case 'LRU':
            result = runLRU(frameCount, refSequence);
            break;
        case 'OPT':
            result = runOPT(frameCount, refSequence);
            break;
        case 'LFU':
            result = runLFU(frameCount, refSequence);
            break;
        default:
            result = runFIFO(frameCount, refSequence);
    }

    // 결과 UI 업데이트
    updateMetrics(refSequence.length, result.pageFaults);
    renderResultTable(frameCount, refSequence, result.history);
}

// ----------------------------------------------------
// 알고리즘 구현부
// ----------------------------------------------------

// 1. FIFO (First-In First-Out)
function runFIFO(frameCount, sequence) {
    const memory = [];
    let pageFaults = 0;
    const history = [];

    for (let i = 0; i < sequence.length; i++) {
        const page = sequence[i];
        let isHit = false;

        if (memory.includes(page)) {
            isHit = true;
        } else {
            pageFaults++;
            if (memory.length >= frameCount) {
                memory.shift();
            }
            memory.push(page);
        }

        history.push({
            page: page,
            memory: [...memory],
            isHit: isHit
        });
    }

    return { pageFaults, history };
}

// 2. LRU (Least Recently Used)
function runLRU(frameCount, sequence) {
    const memory = [];
    const lastUsed = new Map();
    let pageFaults = 0;
    const history = [];

    for (let i = 0; i < sequence.length; i++) {
        const page = sequence[i];
        let isHit = false;

        if (memory.includes(page)) {
            isHit = true;
        } else {
            pageFaults++;
            if (memory.length >= frameCount) {
                // 가장 오랫동안 사용되지 않은 페이지 찾기
                let lruPage = memory[0];
                let minTime = lastUsed.get(lruPage);

                for (const p of memory) {
                    if (lastUsed.get(p) < minTime) {
                        minTime = lastUsed.get(p);
                        lruPage = p;
                    }
                }

                const removeIndex = memory.indexOf(lruPage);
                memory.splice(removeIndex, 1);
            }
            memory.push(page);
        }

        lastUsed.set(page, i);

        history.push({
            page: page,
            memory: [...memory],
            isHit: isHit
        });
    }

    return { pageFaults, history };
}

// 3. OPT (Optimal)
function runOPT(frameCount, sequence) {
    const memory = [];
    let pageFaults = 0;
    const history = [];

    for (let i = 0; i < sequence.length; i++) {
        const page = sequence[i];
        let isHit = false;

        if (memory.includes(page)) {
            isHit = true;
        } else {
            pageFaults++;
            if (memory.length >= frameCount) {
                // 미래에 가장 나중에 사용되거나 사용되지 않을 페이지 교체
                let pageToReplace = -1;
                let farthestUse = -1;

                for (const p of memory) {
                    let nextUse = sequence.slice(i + 1).indexOf(p);
                    if (nextUse === -1) {
                        pageToReplace = p;
                        break;
                    } else if (nextUse > farthestUse) {
                        farthestUse = nextUse;
                        pageToReplace = p;
                    }
                }

                const removeIndex = memory.indexOf(pageToReplace);
                memory.splice(removeIndex, 1);
            }
            memory.push(page);
        }

        history.push({
            page: page,
            memory: [...memory],
            isHit: isHit
        });
    }

    return { pageFaults, history };
}

// 4. LFU (Least Frequently Used)
function runLFU(frameCount, sequence) {
    const memory = [];
    const counts = new Map();
    const loadTime = new Map();
    let pageFaults = 0;
    const history = [];

    for (let i = 0; i < sequence.length; i++) {
        const page = sequence[i];
        let isHit = false;

        counts.set(page, (counts.get(page) || 0) + 1);

        if (memory.includes(page)) {
            isHit = true;
        } else {
            pageFaults++;
            if (memory.length >= frameCount) {
                // 참조 횟수가 가장 적은 페이지 교체 (동률 시 먼저 들어온 것 제거)
                let lfuPage = memory[0];
                let minCount = counts.get(lfuPage);

                for (const p of memory) {
                    const cnt = counts.get(p);
                    if (cnt < minCount) {
                        minCount = cnt;
                        lfuPage = p;
                    } else if (cnt === minCount) {
                        if (loadTime.get(p) < loadTime.get(lfuPage)) {
                            lfuPage = p;
                        }
                    }
                }

                const removeIndex = memory.indexOf(lfuPage);
                memory.splice(removeIndex, 1);
            }
            memory.push(page);
            loadTime.set(page, i);
        }

        history.push({
            page: page,
            memory: [...memory],
            isHit: isHit
        });
    }

    return { pageFaults, history };
}

// ----------------------------------------------------
// UI 렌더링부
// ----------------------------------------------------

function updateMetrics(totalRefs, pageFaults) {
    const hits = totalRefs - pageFaults;
    const hitRateVal = totalRefs > 0 ? ((hits / totalRefs) * 100).toFixed(1) : 0;
    const faultRateVal = totalRefs > 0 ? ((pageFaults / totalRefs) * 100).toFixed(1) : 0;

    document.getElementById('totalRefs').textContent = totalRefs;
    document.getElementById('pageFaults').textContent = pageFaults;
    document.getElementById('hitRate').textContent = `${hitRateVal}%`;
    document.getElementById('faultRate').textContent = `${faultRateVal}%`;
}

function renderResultTable(frameCount, sequence, history) {
    const table = document.getElementById('resultTable');
    table.innerHTML = '';

    // 1. 참조 페이지 번호 행 (헤더)
    const headerRow = document.createElement('tr');
    const firstTh = document.createElement('th');
    firstTh.textContent = '단계 / 참조';
    headerRow.appendChild(firstTh);

    sequence.forEach((page, idx) => {
        const th = document.createElement('th');
        th.textContent = page;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // 2. 프레임 상태 행들
    for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
        const row = document.createElement('tr');
        const frameLabelTd = document.createElement('td');
        frameLabelTd.textContent = `프레임 ${frameIdx + 1}`;
        frameLabelTd.style.fontWeight = 'bold';
        row.appendChild(frameLabelTd);

        history.forEach(step => {
            const td = document.createElement('td');
            const pageVal = step.memory[frameIdx];
            if (pageVal !== undefined) {
                td.textContent = pageVal;
            } else {
                td.textContent = '-';
                td.className = 'cell-empty';
            }
            row.appendChild(td);
        });

        table.appendChild(row);
    }

    // 3. 상태(Hit / Fault) 행
    const statusRow = document.createElement('tr');
    statusRow.className = 'header-row';
    const statusLabelTd = document.createElement('td');
    statusLabelTd.textContent = '상태';
    statusRow.appendChild(statusLabelTd);

    history.forEach(step => {
        const td = document.createElement('td');
        if (step.isHit) {
            td.textContent = 'Hit';
            td.className = 'status-hit';
        } else {
            td.textContent = 'Fault';
            td.className = 'status-fault';
        }
        statusRow.appendChild(td);
    });

    table.appendChild(statusRow);
}
