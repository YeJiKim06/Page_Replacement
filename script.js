document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. 탭 전환 제어
    // ----------------------------------------------------
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // ----------------------------------------------------
    // 2. 페이지 교체 시뮬레이터 로직
    // ----------------------------------------------------
    const calcBtn = document.getElementById('calcBtn');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resetBtn = document.getElementById('resetBtn');
    const speedSelect = document.getElementById('speedSelect');
    const progressSlider = document.getElementById('progressSlider');
    const progressFill = document.getElementById('progressFill');
    const timelineStatus = document.getElementById('timelineStatus');

    let fullHistory = [];
    let fullSequence = [];
    let frameCount = 3;
    let currentStep = 0;
    let timer = null;

    calcBtn.addEventListener('click', initPageSimulation);
    playBtn.addEventListener('click', playSimulation);
    pauseBtn.addEventListener('click', pauseSimulation);
    prevBtn.addEventListener('click', stepPrev);
    nextBtn.addEventListener('click', stepNext);
    resetBtn.addEventListener('click', resetSimulation);

    progressSlider.addEventListener('input', (e) => {
        pauseSimulation();
        currentStep = parseInt(e.target.value, 10);
        renderPageUI();
    });

    initPageSimulation();

    function initPageSimulation() {
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

        let result;
        switch (algorithm) {
            case 'FIFO': result = runFIFO(frameCount, fullSequence); break;
            case 'LRU': result = runLRU(frameCount, fullSequence); break;
            case 'OPT': result = runOPT(frameCount, fullSequence); break;
            case 'LFU': result = runLFU(frameCount, fullSequence); break;
            default: result = runFIFO(frameCount, fullSequence);
        }

        fullHistory = result.history;
        currentStep = fullSequence.length;
        progressSlider.max = fullSequence.length;

        renderPageUI();
    }

    function renderPageUI() {
        updateMetrics();
        updateProgressBar();
        renderResultTable();
    }

    function updateProgressBar() {
        const total = fullSequence.length;
        progressSlider.value = currentStep;
        
        const percentage = total > 0 ? (currentStep / total) * 100 : 0;
        progressFill.style.width = `${percentage}%`;

        if (timer !== null) {
            timelineStatus.textContent = '재생 중';
            timelineStatus.className = 'status-badge playing';
        } else if (currentStep === total) {
            timelineStatus.textContent = '완료';
            timelineStatus.className = 'status-badge completed';
        } else {
            timelineStatus.textContent = '일시정지';
            timelineStatus.className = 'status-badge';
        }
    }

    function playSimulation() {
        if (currentStep >= fullSequence.length) currentStep = 0;

        playBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';

        const speed = parseInt(speedSelect.value, 10);

        clearInterval(timer);
        timer = setInterval(() => {
            if (currentStep < fullSequence.length) {
                currentStep++;
                renderPageUI();
            } else {
                pauseSimulation();
            }
        }, speed);

        updateProgressBar();
    }

    function pauseSimulation() {
        clearInterval(timer);
        timer = null;
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
        updateProgressBar();
    }

    function stepNext() {
        pauseSimulation();
        if (currentStep < fullSequence.length) {
            currentStep++;
            renderPageUI();
        }
    }

    function stepPrev() {
        pauseSimulation();
        if (currentStep > 0) {
            currentStep--;
            renderPageUI();
        }
    }

    function resetSimulation() {
        pauseSimulation();
        currentStep = 0;
        renderPageUI();
    }

    // 페이지 교체 알고리즘 구동부
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
                if (memory.length >= frameCount) memory.shift();
                memory.push(page);
            }

            history.push({ page, memory: [...memory], isHit, pageFaults });
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
                    const removeIndex = memory.indexOf(lruPage);
                    memory.splice(removeIndex, 1);
                }
                memory.push(page);
            }
            lastUsed.set(page, i);
            history.push({ page, memory: [...memory], isHit, pageFaults });
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
                    const removeIndex = memory.indexOf(pageToReplace);
                    memory.splice(removeIndex, 1);
                }
                memory.push(page);
            }
            history.push({ page, memory: [...memory], isHit, pageFaults });
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
                    const removeIndex = memory.indexOf(lfuPage);
                    memory.splice(removeIndex, 1);
                }
                memory.push(page);
                loadTime.set(page, i);
            }
            history.push({ page, memory: [...memory], isHit, pageFaults });
        }
        return { pageFaults, history };
    }

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

        const headerRow = document.createElement('tr');
        const firstTh = document.createElement('th');
        firstTh.textContent = '단계 / 참조';
        headerRow.appendChild(firstTh);

        fullSequence.forEach((page, idx) => {
            const th = document.createElement('th');
            th.textContent = page;
            if (idx === currentStep - 1) th.classList.add('col-active');
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
            const row = document.createElement('tr');
            const frameLabelTd = document.createElement('td');
            frameLabelTd.textContent = `프레임 ${frameIdx + 1}`;
            frameLabelTd.style.fontWeight = '600';
            row.appendChild(frameLabelTd);

            fullSequence.forEach((_, stepIdx) => {
                const td = document.createElement('td');
                if (stepIdx < currentStep) {
                    const stepData = fullHistory[stepIdx];
                    const pageVal = stepData.memory[frameIdx];

                    if (pageVal !== undefined) {
                        td.textContent = pageVal;
                        if (stepIdx === currentStep - 1) td.classList.add('cell-active');
                    } else {
                        td.textContent = '-';
                        td.className = 'cell-empty';
                    }
                    if (stepIdx === currentStep - 1) td.classList.add('col-active');
                }
                row.appendChild(td);
            });
            table.appendChild(row);
        }

        const statusRow = document.createElement('tr');
        statusRow.className = 'header-row';
        const statusLabelTd = document.createElement('td');
        statusLabelTd.textContent = '상태';
        statusRow.appendChild(statusLabelTd);

        fullSequence.forEach((_, stepIdx) => {
            const td = document.createElement('td');
            if (stepIdx < currentStep) {
                const stepData = fullHistory[stepIdx];
                td.textContent = stepData.isHit ? 'Hit' : 'Fault';
                td.className = stepData.isHit ? 'status-hit' : 'status-fault';
                if (stepIdx === currentStep - 1) td.classList.add('col-active');
            }
            statusRow.appendChild(td);
        });
        table.appendChild(statusRow);
    }

    // ----------------------------------------------------
    // 3. CPU 스케줄링 시뮬레이터 로직
    // ----------------------------------------------------
    const cpuAlgorithmSelect = document.getElementById('cpuAlgorithm');
    const quantumGroup = document.getElementById('quantumGroup');
    const processTableBody = document.getElementById('processTableBody');
    const addProcessBtn = document.getElementById('addProcessBtn');
    const runCpuBtn = document.getElementById('runCpuBtn');

    cpuAlgorithmSelect.addEventListener('change', (e) => {
        quantumGroup.style.display = e.target.value === 'RR' ? 'block' : 'none';
    });

    let defaultProcesses = [
        { id: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
        { id: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
        { id: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
        { id: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 }
    ];

    function renderInputTable() {
        processTableBody.innerHTML = '';
        defaultProcesses.forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="p-id" value="${p.id}"></td>
                <td><input type="number" class="p-at" min="0" value="${p.arrivalTime}"></td>
                <td><input type="number" class="p-bt" min="1" value="${p.burstTime}"></td>
                <td><input type="number" class="p-prio" min="1" value="${p.priority}"></td>
                <td><button class="btn-delete" data-idx="${idx}">삭제</button></td>
            `;
            processTableBody.appendChild(tr);
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx, 10);
                defaultProcesses.splice(idx, 1);
                renderInputTable();
            });
        });
    }

    addProcessBtn.addEventListener('click', () => {
        const nextNum = defaultProcesses.length + 1;
        defaultProcesses.push({ id: `P${nextNum}`, arrivalTime: 0, burstTime: 4, priority: 1 });
        renderInputTable();
    });

    renderInputTable();

    function getProcessData() {
        const rows = processTableBody.querySelectorAll('tr');
        const processes = [];
        rows.forEach(row => {
            const id = row.querySelector('.p-id').value.trim();
            const arrivalTime = parseInt(row.querySelector('.p-at').value, 10);
            const burstTime = parseInt(row.querySelector('.p-bt').value, 10);
            const priority = parseInt(row.querySelector('.p-prio').value, 10);

            if (id && !isNaN(arrivalTime) && !isNaN(burstTime)) {
                processes.push({ id, arrivalTime, burstTime, priority });
            }
        });
        return processes;
    }

    runCpuBtn.addEventListener('click', () => {
        const processes = getProcessData();
        if (processes.length === 0) {
            alert('최소 하나 이상의 프로세스를 입력해 주세요.');
            return;
        }

        const algo = cpuAlgorithmSelect.value;
        const quantum = parseInt(document.getElementById('timeQuantum').value, 10);

        let result;
        switch (algo) {
            case 'FCFS': result = runFCFS(processes); break;
            case 'SJF_NP': result = runSJF_NP(processes); break;
            case 'PRIO_NP': result = runPriority_NP(processes); break;
            case 'SRTF': result = runSRTF(processes); break;
            case 'PRIO_P': result = runPriority_P(processes); break;
            case 'RR': result = runRR(processes, quantum); break;
        }

        renderCpuResults(result);
    });

    // CPU 알고리즘 계산 엔진
    function runFCFS(procs) {
        let list = JSON.parse(JSON.stringify(procs)).sort((a, b) => a.arrivalTime - b.arrivalTime);
        let time = 0, gantt = [], result = [];

        list.forEach(p => {
            if (time < p.arrivalTime) time = p.arrivalTime;
            let start = time;
            time += p.burstTime;
            let completion = time;
            let turnaround = completion - p.arrivalTime;
            let waiting = turnaround - p.burstTime;

            gantt.push({ id: p.id, start, end: completion });
            result.push({ ...p, completion, turnaround, waiting });
        });

        return { gantt, result };
    }

    function runSJF_NP(procs) {
        let list = JSON.parse(JSON.stringify(procs));
        let time = 0, completed = 0, n = list.length;
        let isCompleted = new Array(n).fill(false);
        let gantt = [], result = [];

        while (completed < n) {
            let idx = -1, minBt = Infinity;
            for (let i = 0; i < n; i++) {
                if (list[i].arrivalTime <= time && !isCompleted[i]) {
                    if (list[i].burstTime < minBt) {
                        minBt = list[i].burstTime;
                        idx = i;
                    }
                }
            }

            if (idx !== -1) {
                let p = list[idx];
                let start = time;
                time += p.burstTime;
                let completion = time;
                let turnaround = completion - p.arrivalTime;
                let waiting = turnaround - p.burstTime;

                gantt.push({ id: p.id, start, end: completion });
                result.push({ ...p, completion, turnaround, waiting });
                isCompleted[idx] = true;
                completed++;
            } else {
                time++;
            }
        }
        return { gantt, result };
    }

    function runPriority_NP(procs) {
        let list = JSON.parse(JSON.stringify(procs));
        let time = 0, completed = 0, n = list.length;
        let isCompleted = new Array(n).fill(false);
        let gantt = [], result = [];

        while (completed < n) {
            let idx = -1, minPrio = Infinity;
            for (let i = 0; i < n; i++) {
                if (list[i].arrivalTime <= time && !isCompleted[i]) {
                    if (list[i].priority < minPrio) {
                        minPrio = list[i].priority;
                        idx = i;
                    }
                }
            }

            if (idx !== -1) {
                let p = list[idx];
                let start = time;
                time += p.burstTime;
                let completion = time;
                let turnaround = completion - p.arrivalTime;
                let waiting = turnaround - p.burstTime;

                gantt.push({ id: p.id, start, end: completion });
                result.push({ ...p, completion, turnaround, waiting });
                isCompleted[idx] = true;
                completed++;
            } else {
                time++;
            }
        }
        return { gantt, result };
    }

    function runSRTF(procs) {
        let list = JSON.parse(JSON.stringify(procs));
        let n = list.length;
        let remainingBt = list.map(p => p.burstTime);
        let time = 0, completed = 0;
        let gantt = [], resultStats = {};
        let prevProc = null, startT = 0;

        while (completed < n) {
            let idx = -1, minBt = Infinity;
            for (let i = 0; i < n; i++) {
                if (list[i].arrivalTime <= time && remainingBt[i] > 0) {
                    if (remainingBt[i] < minBt) {
                        minBt = remainingBt[i];
                        idx = i;
                    }
                }
            }

            if (idx !== -1) {
                if (prevProc !== list[idx].id) {
                    if (prevProc !== null) gantt.push({ id: prevProc, start: startT, end: time });
                    prevProc = list[idx].id;
                    startT = time;
                }

                remainingBt[idx]--;
                time++;

                if (remainingBt[idx] === 0) {
                    completed++;
                    let completion = time;
                    let turnaround = completion - list[idx].arrivalTime;
                    let waiting = turnaround - list[idx].burstTime;
                    resultStats[list[idx].id] = { ...list[idx], completion, turnaround, waiting };
                }
            } else {
                if (prevProc !== null) {
                    gantt.push({ id: prevProc, start: startT, end: time });
                    prevProc = null;
                }
                time++;
            }
        }
        if (prevProc !== null) gantt.push({ id: prevProc, start: startT, end: time });

        return { gantt, result: Object.values(resultStats) };
    }

    function runPriority_P(procs) {
        let list = JSON.parse(JSON.stringify(procs));
        let n = list.length;
        let remainingBt = list.map(p => p.burstTime);
        let time = 0, completed = 0;
        let gantt = [], resultStats = {};
        let prevProc = null, startT = 0;

        while (completed < n) {
            let idx = -1, minPrio = Infinity;
            for (let i = 0; i < n; i++) {
                if (list[i].arrivalTime <= time && remainingBt[i] > 0) {
                    if (list[i].priority < minPrio) {
                        minPrio = list[i].priority;
                        idx = i;
                    }
                }
            }

            if (idx !== -1) {
                if (prevProc !== list[idx].id) {
                    if (prevProc !== null) gantt.push({ id: prevProc, start: startT, end: time });
                    prevProc = list[idx].id;
                    startT = time;
                }

                remainingBt[idx]--;
                time++;

                if (remainingBt[idx] === 0) {
                    completed++;
                    let completion = time;
                    let turnaround = completion - list[idx].arrivalTime;
                    let waiting = turnaround - list[idx].burstTime;
                    resultStats[list[idx].id] = { ...list[idx], completion, turnaround, waiting };
                }
            } else {
                if (prevProc !== null) {
                    gantt.push({ id: prevProc, start: startT, end: time });
                    prevProc = null;
                }
                time++;
            }
        }
        if (prevProc !== null) gantt.push({ id: prevProc, start: startT, end: time });

        return { gantt, result: Object.values(resultStats) };
    }

    function runRR(procs, quantum) {
        let list = JSON.parse(JSON.stringify(procs)).sort((a, b) => a.arrivalTime - b.arrivalTime);
        let n = list.length;
        let remainingBt = list.map(p => p.burstTime);
        let time = 0, completed = 0;
        let queue = [];
        let inQueue = new Array(n).fill(false);
        let gantt = [], resultStats = {};

        time = list[0].arrivalTime;
        queue.push(0);
        inQueue[0] = true;

        while (completed < n) {
            if (queue.length === 0) {
                for (let i = 0; i < n; i++) {
                    if (remainingBt[i] > 0) {
                        time = Math.max(time, list[i].arrivalTime);
                        queue.push(i);
                        inQueue[i] = true;
                        break;
                    }
                }
            }

            let idx = queue.shift();
            let execTime = Math.min(quantum, remainingBt[idx]);
            let startT = time;
            time += execTime;
            remainingBt[idx] -= execTime;

            gantt.push({ id: list[idx].id, start: startT, end: time });

            for (let i = 0; i < n; i++) {
                if (i !== idx && list[i].arrivalTime <= time && remainingBt[i] > 0 && !inQueue[i]) {
                    queue.push(i);
                    inQueue[i] = true;
                }
            }

            if (remainingBt[idx] > 0) {
                queue.push(idx);
            } else {
                completed++;
                let completion = time;
                let turnaround = completion - list[idx].arrivalTime;
                let waiting = turnaround - list[idx].burstTime;
                resultStats[list[idx].id] = { ...list[idx], completion, turnaround, waiting };
            }
        }

        return { gantt, result: Object.values(resultStats) };
    }

    const colors = ['#2563eb', '#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed'];

    function renderCpuResults(data) {
        const totalWT = data.result.reduce((sum, p) => sum + p.waiting, 0);
        const totalTAT = data.result.reduce((sum, p) => sum + p.turnaround, 0);
        const avgWT = (totalWT / data.result.length).toFixed(2);
        const avgTAT = (totalTAT / data.result.length).toFixed(2);

        document.getElementById('avgWT').textContent = `${avgWT} ms`;
        document.getElementById('avgTAT').textContent = `${avgTAT} ms`;

        const ganttChart = document.getElementById('ganttChart');
        ganttChart.innerHTML = '';

        const procColorMap = {};
        data.result.forEach((p, i) => {
            procColorMap[p.id] = colors[i % colors.length];
        });

        data.gantt.forEach(block => {
            const div = document.createElement('div');
            div.className = 'gantt-block';
            div.style.backgroundColor = procColorMap[block.id] || '#475569';
            div.style.flex = (block.end - block.start);

            div.innerHTML = `
                <span>${block.id}</span>
                <span class="gantt-time-start">${block.start}</span>
                <span class="gantt-time-end">${block.end}</span>
            `;
            ganttChart.appendChild(div);
        });

        const tbody = document.querySelector('#cpuResultTable tbody');
        tbody.innerHTML = '';

        data.result.sort((a, b) => a.id.localeCompare(b.id)).forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.id}</strong></td>
                <td>${p.arrivalTime}</td>
                <td>${p.burstTime}</td>
                <td>${p.completion}</td>
                <td><strong>${p.turnaround}</strong></td>
                <td><strong>${p.waiting}</strong></td>
            `;
            tbody.appendChild(tr);
        });
    }
});
