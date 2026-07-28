document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const calcBtn = document.getElementById('calcBtn');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resetBtn = document.getElementById('resetBtn');
    const speedSelect = document.getElementById('speedSelect');

    // 시뮬레이션 상태 변수
    let fullHistory = [];
    let fullSequence = [];
    let frameCount = 3;
    let currentStep = 0; // 0: 시작 전, 1~N: 각 단계
    let timer = null;

    // 이벤트 리스너 등록
    calcBtn.addEventListener('click', initSimulation);
    playBtn.addEventListener('click', playSimulation);
    pauseBtn.addEventListener('click', pauseSimulation);
    prevBtn.addEventListener('click', stepPrev);
    nextBtn.addEventListener('click', stepNext);
    resetBtn.addEventListener('click', resetSimulation);

    // 초기 시뮬레이션 실행
    initSimulation();

    function initSimulation() {
        pauseSimulation();

        frameCount = parseInt(document.getElementById('frameCount').value, 10);
        const rawSequence = document.getElementById('refSequence').value;
        const algorithm = document.getElementById('algorithm').value;

        fullSequence = rawSequence
            .trim()
            .split(/[\s,]+/)
            .filter(val => val !== '')
            .map(Number);

        if (fullSequence.some(isNaN) || fullSequence.length === 0) {
            alert('올바른 페이지 참조 순서를 입력해주세요.');
            return;
        }

        if (isNaN(frameCount) || frameCount < 1 || frameCount > 7) {
            alert('프레임 수는 1 이상 7 이하로 입력해 주세요.');
            return;
        }

        // 알고리즘 실행
        let result;
        switch (algorithm) {
            case 'FIFO':
                result = runFIFO(frameCount, fullSequence);
                break;
            case 'LRU':
                result = runLRU(frameCount, fullSequence);
                break;
            case 'OPT':
                result = runOPT(frameCount, fullSequence);
                break;
            case 'LFU':
                result = runLFU(frameCount, fullSequence);
                break;
            default:
                result = runFIFO(frameCount, fullSequence);
        }

        fullHistory = result.history;
        currentStep = fullSequence.length; // 기본은 전체 결과 표시

        renderUI();
    }

    function renderUI() {
        updateMetrics();
        renderResultTable();
    }

    // ----------------------------------------------------
    // 재생 컨트롤 로직
    // ----------------------------------------------------

    function playSimulation() {
        if (currentStep >= fullSequence.length) {
            currentStep = 0; // 이미 끝까지 갔다면 처음부터
        }

        playBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';

        const speed = parseInt(speedSelect.value, 10);

        clearInterval(timer);
        timer = setInterval(() => {
            if (currentStep < fullSequence.length) {
                currentStep++;
                renderUI();
            } else {
                pauseSimulation();
            }
        }, speed);
    }

    function pauseSimulation() {
        clearInterval(timer);
        timer = null;
        playBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
    }

    function stepNext() {
        pauseSimulation();
        if (currentStep < fullSequence.length) {
            currentStep++;
            renderUI();
        }
    }

    function stepPrev() {
        pauseSimulation();
        if (currentStep > 0) {
            currentStep--;
            renderUI();
        }
    }

    function resetSimulation() {
        pauseSimulation();
        currentStep = 0;
        renderUI();
    }

    // ----------------------------------------------------
    // 알고리즘 계산 로직
    // ----------------------------------------------------

    function runFIFO(frameCount, sequence) {
        const memory = [];
        let pageFaults = 0;
        const history = [];

        for (let i = 0; i < sequence.length; i++) {
            const page = sequence[i];
            let isHit = false;
            let replacedPage = null;

            if (memory.includes(page)) {
                isHit = true;
            } else {
                pageFaults++;
                if (memory.length >= frameCount) {
                    replacedPage = memory.shift();
                }
                memory.push(page);
            }

            history.push({
                page,
                memory: [...memory],
                isHit,
                replacedPage,
                pageFaults
            });
        }

        return { pageFaults, history };
    }

    function runLRU(frameCount, sequence) {
        const memory = [];
        const lastUsed = new Map();
        let pageFaults = 0;
        const history = [];

        for (let i = 0; i < sequence.length; i++) {
            const page = sequence[i];
            let isHit = false;
            let replacedPage = null;

            if (memory.includes(page)) {
                isHit = true;
            } else {
                pageFaults++;
                if (memory.length >= frameCount) {
                    let lruPage = memory[0];
                    let minTime = lastUsed.get(lruPage);

                    for (const p of memory) {
                        if (lastUsed.get(p) < minTime) {
                            minTime = lastUsed.get(p);
                            lruPage = p;
                        }
                    }

                    replacedPage = lruPage;
                    const removeIndex = memory.indexOf(lruPage);
                    memory.splice(removeIndex, 1);
                }
                memory.push(page);
            }

            lastUsed.set(page, i);

            history.push({
                page,
                memory: [...memory],
                isHit,
                replacedPage,
                pageFaults
            });
        }

        return { pageFaults, history };
    }

    function runOPT(frameCount, sequence) {
        const memory = [];
        let pageFaults = 0;
        const history = [];

        for (let i = 0; i < sequence.length; i++) {
            const page = sequence[i];
            let isHit = false;
            let replacedPage = null;

            if (memory.includes(page)) {
                isHit = true;
            } else {
                pageFaults++;
                if (memory.length >= frameCount) {
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

                    replacedPage = pageToReplace;
                    const removeIndex = memory.indexOf(pageToReplace);
                    memory.splice(removeIndex, 1);
                }
                memory.push(page);
            }

            history.push({
                page,
                memory: [...memory],
                isHit,
                replacedPage,
                pageFaults
            });
        }

        return { pageFaults, history };
    }

    function runLFU(frameCount, sequence) {
        const memory = [];
        const counts = new Map();
        const loadTime = new Map();
        let pageFaults = 0;
        const history = [];

        for (let i = 0; i < sequence.length; i++) {
            const page = sequence[i];
            let isHit = false;
            let replacedPage = null;

            counts.set(page, (counts.get(page) || 0) + 1);

            if (memory.includes(page)) {
                isHit = true;
            } else {
                pageFaults++;
                if (memory.length >= frameCount) {
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

                    replacedPage = lfuPage;
                    const removeIndex = memory.indexOf(lfuPage);
                    memory.splice(removeIndex, 1);
                }
                memory.push(page);
                loadTime.set(page, i);
            }

            history.push({
                page,
                memory: [...memory],
                isHit,
                replacedPage,
                pageFaults
            });
        }

        return { pageFaults, history };
    }

    // ----------------------------------------------------
    // UI 렌더링부
    // ----------------------------------------------------

    function updateMetrics() {
        const totalRefs = fullSequence.length;
        const activeStep = currentStep > 0 ? fullHistory[currentStep - 1] : null;
        const pageFaults = activeStep ? activeStep.pageFaults : 0;
        const hits = currentStep - pageFaults;

        const hitRateVal = currentStep > 0 ? ((hits / currentStep) * 100).toFixed(1) : 0;
        const faultRateVal = currentStep > 0 ? ((pageFaults / currentStep) * 100).toFixed(1) : 0;

        document.getElementById('stepProgress').textContent = `${currentStep} / ${totalRefs}`;
        document.getElementById('pageFaults').textContent = pageFaults;
        document.getElementById('hitRate').textContent = `${hitRateVal}%`;
        document.getElementById('faultRate').textContent = `${faultRateVal}%`;
    }

    function renderResultTable() {
        const table = document.getElementById('resultTable');
        table.innerHTML = '';

        if (fullSequence.length === 0) return;

        // 1. 헤더 행 (페이지 참조 순서)
        const headerRow = document.createElement('tr');
        const firstTh = document.createElement('th');
        firstTh.textContent = '단계 / 참조';
        headerRow.appendChild(firstTh);

        fullSequence.forEach((page, idx) => {
            const th = document.createElement('th');
            th.textContent = page;
            if (idx === currentStep - 1) {
                th.classList.add('col-active');
            }
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

            fullSequence.forEach((_, stepIdx) => {
                const td = document.createElement('td');

                if (stepIdx < currentStep) {
                    const stepData = fullHistory[stepIdx];
                    const pageVal = stepData.memory[frameIdx];

                    if (pageVal !== undefined) {
                        td.textContent = pageVal;

                        // 현재 마지막 진행 단계 셀 애니메이션 부여
                        if (stepIdx === currentStep - 1) {
                            td.classList.add('cell-active');
                        }
                    } else {
                        td.textContent = '-';
                        td.className = 'cell-empty';
                    }

                    // 현재 단계 열 강조
                    if (stepIdx === currentStep - 1) {
                        td.classList.add('col-active');
                    }
                } else {
                    td.textContent = ''; // 미진행 단계
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

        fullSequence.forEach((_, stepIdx) => {
            const td = document.createElement('td');

            if (stepIdx < currentStep) {
                const stepData = fullHistory[stepIdx];

                if (stepData.isHit) {
                    td.textContent = 'Hit';
                    td.className = 'status-hit';
                } else {
                    td.textContent = 'Fault';
                    td.className = 'status-fault';
                }

                if (stepIdx === currentStep - 1) {
                    td.classList.add('col-active');
                }
            }

            statusRow.appendChild(td);
        });

        table.appendChild(statusRow);
    }
});
