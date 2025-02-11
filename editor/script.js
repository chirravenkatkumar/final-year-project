
let editor;
let currentTask = null;
let compilerStatus = {};
let twotestcases = false;

// Initialize CodeMirror editor
document.addEventListener('DOMContentLoaded', async () => {
    editor = CodeMirror(document.getElementById('editor-container'), {
        mode: 'text/x-c++src',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: true,
        lineWrapping: true
    });

    // Set initial size
    editor.setSize('100%', '100%');

    // Check compiler status
    try {
        const response = await fetch('http://localhost:3000/api/compiler-status');
        compilerStatus = await response.json();
        updateCompilerStatus();
    } catch (error) {
        console.error('Error checking compiler status:', error);
    }

    // Setup event listeners
    document.getElementById('language-select').addEventListener('change', handleLanguageChange);
    document.getElementById('run-btn').addEventListener('click', runCode);
    document.getElementById('submit-btn').addEventListener('click', submitSolution);
    document.getElementById('reset-btn').addEventListener('click', resetEditor);
    document.getElementById('next-btn').addEventListener('click', fetchTask);

    // Setup tab switching
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Load initial task
    fetchTask();
});

function updateCompilerStatus() {
    const select = document.getElementById('language-select');
    const options = select.options;
    for (let i = 0; i < options.length; i++) {
        const language = options[i].value;
        const isAvailable = (language === 'python' && compilerStatus.python) ||
            ((language === 'c' || language === 'cpp') && compilerStatus.gcc) ||
            (language === 'java' && compilerStatus.java);
        if (!isAvailable) {
            options[i].disabled = true;
            options[i].text += ' (not available)';
        }
    }
}

function handleLanguageChange(event) {
    const language = event.target.value;
    const modeMap = {
        'cpp': 'text/x-c++src',
        'c': 'text/x-csrc',
        'java': 'text/x-java',
        'python': 'python'
    };
    editor.setOption('mode', modeMap[language]);
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

async function fetchTask() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const taskId = urlParams.get('taskId');

        console.log("Task ID:", taskId); // Use this taskId to fetch or display the relevant task data
        const response = await fetch(`http://localhost:3000/api/task?id=${taskId}`);
        currentTask = await response.json();
        console.log(currentTask);
        document.getElementById('question-title').textContent = currentTask.question;
        document.getElementById('question-description').innerHTML = currentTask.description;
        const testCasesHtml = `
    <div class="test-case-display">
        <strong>Test Case 1:</strong>
        <pre>Input: ${currentTask.testcase1_input}</pre>
        <pre>Expected Output: ${currentTask.testcase1_output}</pre>
    </div>
    <div class="test-case-display">
        <strong>Test Case 2:</strong>
        <pre>Input: ${currentTask.testcase2_input}</pre>
        <pre>Expected Output: ${currentTask.testcase2_output}</pre>
    </div>
`;
        document.getElementById('test-cases-container').innerHTML = testCasesHtml;
    } catch (error) {
        console.error('Error fetching task:', error);
    }
}

async function runCode() {
    const code = editor.getValue();
    const language = document.getElementById('language-select').value;

    // Show loading state
    document.getElementById('output').textContent = 'Running code...';
    document.getElementById('test-results').textContent = 'Running tests...';

    try {
        // Run with first test case
        const response1 = await fetch('http://localhost:3000/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, input: currentTask.testcase1_input })
        });
        const result1 = await response1.json();

        // Run with second test case
        const response2 = await fetch('http://localhost:3000/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, input: currentTask.testcase2_input })
        });
        const result2 = await response2.json();

        // Display results
        const testResults = [
            {
                testNumber: 1,
                passed: result1.output == currentTask.testcase1_output.trim(),
                input: currentTask.testcase1_input,
                expectedOutput: currentTask.testcase1_output,
                actualOutput: result1.output,
                error: result1.error,
                comparison: compareOutputs(currentTask.testcase1_output, result1.output)
            },
            {
                testNumber: 2,
                passed: result2.output.trim() == currentTask.testcase2_output.trim(),
                input: currentTask.testcase2_input,
                expectedOutput: currentTask.testcase2_output,
                actualOutput: result2.output,
                error: result2.error,
                comparison: compareOutputs(currentTask.testcase2_output, result2.output)
            }
        ];

        console.log(testResults);
        if (testResults[0].passed && testResults[1].passed) {
            twotestcases = true;
        } else {
            twotestcases = false;
        }
        console.log(testResults[0].passed);
        displayTestResults(testResults);

        // Show first test case output in output tab
        const outputDiv = document.getElementById('output');
        if (result1.error) {
            outputDiv.innerHTML = `<pre class="error">${result1.error}</pre>`;
        } else {
            outputDiv.innerHTML = `<pre>${result1.output}</pre>`;
        }
    } catch (error) {
        console.log('Error running code:', error);
        document.getElementById('output').innerHTML = `<pre class="error">Error running code: ${error.message}</pre>`;
        document.getElementById('test-results').innerHTML = `<pre class="error">Error running tests: ${error.message}</pre>`;
    }
}

function compareOutputs(expected, actual) {
    const expectedLines = expected.trim().split('\n');
    const actualLines = actual.trim().split('\n');
    return expectedLines.map((expected, i) => {
        const actual = actualLines[i] || '';
        return { expected, actual, matches: expected === actual };
    });
}

function displayTestResults(results) {
    const resultsHtml = results.map(result => `
<div class="test-case ${result.passed ? 'passed' : 'failed'}">
    <h4>Test Case ${result.testNumber}: ${result.passed ? 'Passed ✓' : 'Failed ✗'}</h4>
    <pre>Input: ${result.input}</pre>
    <pre>Expected Output: ${result.expectedOutput}</pre>
    <pre>Actual Output: ${result.actualOutput}</pre>
    ${result.error ? `<pre class="error">Error: ${result.error}</pre>` : ''}
    ${!result.passed && result.comparison ? `
        <div class="comparison">
            <h5>Detailed Comparison:</h5>
            ${result.comparison.map((line, i) => `
                <div class="line-comparison ${line.matches ? 'match' : 'mismatch'}">
                    <span>Line ${i + 1}:</span>
                    <pre class="expected">Expected: "${line.expected}"</pre>
                    <pre class="actual">Actual: "${line.actual}"</pre>
                </div>
            `).join('')}
        </div>
    ` : ''}
</div>
`).join('');
    document.getElementById('test-results').innerHTML = resultsHtml;
}

async function submitSolution() {
    const code = editor.getValue();
    const language = document.getElementById('language-select').value;

    // Run code first to check if all tests pass
    await runCode();

    // // Only submit if both test cases pass
    // if (!twotestcases) {
    //     alert('Please make sure all test cases pass before submitting.');
    //     return;
    // }

    try {
        const response = await fetch('http://localhost:3000/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: currentTask.id, code, language, passed: twotestcases })
        });
        const result = await response.json();
        if (result.success) {
            alert('Solution submitted successfully!');
        } else {
            alert('Failed to submit solution: ' + result.error);
        }
    } catch (error) {
        alert('Error submitting solution: ' + error.message);
    }
}

function resetEditor() {
    editor.setValue('');
    document.getElementById('output').innerHTML = '';
    document.getElementById('test-results').innerHTML = '';
    switchTab('output');
    twotestcases = false; // Reset the test cases flag
}

async function resetDatabase() {
    try {
        const response = await fetch('http://localhost:3000/api/reset', { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            alert('Database reset successfully!');
        } else {
            alert('Failed to reset database: ' + result.error);
        }
    } catch (error) {
        alert('Error resetting database: ' + error.message);
    }
}