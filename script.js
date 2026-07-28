document.addEventListener('DOMContentLoaded', () => {
    // 탭 전환 로직
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

    // ====================================================
    // CPU 스케줄링 관리 로직
    // ====================================================
    const cpuAlgorithmSelect = document.getElementById('cpuAlgorithm');
    const quantumGroup = document.getElementById('quantumGroup');
    const processTableBody = document.getElementById('processTableBody');
    const addProcessBtn = document.getElementById('addProcessBtn');
    const runCpuBtn = document.getElementById('runCpuBtn');

    // 알고리즘 선택에 따라 Quantum 입력 필드 토글
    cpuAlgorithmSelect.addEventListener('change', (e) => {
        quantumGroup.style.display = e.target.value === 'RR' ? 'block' : 'none';
    });

    // 기본 프로세스 데이터 세팅
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

    // 프로세스 데이터 파싱
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

    // ----------------------------------------------------
    // CPU 스케줄링 알고리즘 시뮬레이션 엔진
    // ----------------------------------------------------

    // 1. FCFS (비선점)
    function runFCFS(procs) {
        let list = JSON.parse(JSON.stringify(procs)).sort((a, b) => a.arrivalTime - b.arrivalTime);
        let time = 0;
        let gantt = [];
        let result = [];

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

    // 2. SJF (비선점)
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

    // 3. Priority (비선점)
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

    // 4. SRTF (선점형 SJF)
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

    // 5. Priority (선점형)
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

    // 6. Round Robin (선점형)
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

    // ----------------------------------------------------
    // CPU 결과 렌더링
    // ----------------------------------------------------
    const colors = ['#2563eb', '#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed'];

    function renderCpuResults(data) {
        // 평균 대기시간 / 평균 반환시간 계산
        const totalWT = data.result.reduce((sum, p) => sum + p.waiting, 0);
        const totalTAT = data.result.reduce((sum, p) => sum + p.turnaround, 0);
        const avgWT = (totalWT / data.result.length).toFixed(2);
        const avgTAT = (totalTAT / data.result.length).toFixed(2);

        document.getElementById('avgWT').textContent = `${avgWT} ms`;
        document.getElementById('avgTAT').textContent = `${avgTAT} ms`;

        // 간트 차트 렌더링
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

        // 상세 결과 테이블 렌더링
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
