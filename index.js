const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const User = require('./models/user'); // Assuming you have the User model defined for Sequelize
const Task = require('./models/task'); // Sequelize model for Task
const { exec } = require('child_process');
const fs = require('fs').promises;
const app = express();
const path = require('path');
const Submission = require('./models/submission');
const multer = require('multer');
const StudyMaterial = require('./models/studymaterials');
const Exam = require("./models/Exam");
const temp = require('temp');
const { promisify } = require('util');
const execAsync = promisify(exec);
const ExamSubmission = require('./models/examsubmission');
const ExamCompleted = require('./models/examcompleted')

dotenv.config(); // Load environment variables

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// JWT Secret Key (moved to environment variable)
const JWT_SECRET = 'Nani@99128**';

// Test Sequelize Connection
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully');
        await sequelize.sync({ alter: true }); // Synchronize Sequelize models
        console.log('All models synchronized successfully');
    } catch (error) {
        console.error('Error syncing models:', error);
    }
})();

// Function to send OTP
const sendOTP = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'noreply.test2110@gmail.com',
                pass: "doeoerkmnxyrdrlq",
            },
        });

        const mailOptions = {
            from: 'noreply.test2110@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}`,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending OTP email to ${email}:`, error.message);
        throw error;
    }
};

// Generate random OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// User Authentication Routes
app.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!['student', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            email,
            password: hashedPassword,
            role,
        });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token, branch: user.branch, email: user.email, role: user.role, year: user.year });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/request-otp', async (req, res) => {
    const { username } = req.body;

    try {
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(404).json({ message: 'Email not found' });
        }

        const otp = generateOTP();
        user.resetToken = otp; // Assuming `resetToken` is a column in your `User` table
        await user.save();

        await sendOTP(user.email, otp);
        res.status(200).json({ message: 'OTP sent to email', email: user.email });
    } catch (error) {
        console.error('Error requesting OTP:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const user = await User.findOne({ where: { email } });

        if (!user || user.resetToken != otp) {
            return res.status(400).json({ message: 'Invalid OTP or email' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetToken = null; // Clear the reset token
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Protected Routes
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Failed to authenticate token' });
        }

        req.user = decoded;
        next();
    });
};

app.get('/dashboard', verifyToken, (req, res) => {
    if (req.user.role === 'admin') {
        return res.json({ message: 'Welcome Admin' });
    } else if (req.user.role === 'student') {
        return res.json({ message: 'Welcome Student' });
    } else {
        return res.status(403).json({ message: 'Access denied' });
    }
});

//app.get('/api/tasks', async (req, res) => {
//     try {
//         const tasks = await Task.findAll(); // Assuming you use Sequelize
//         res.status(200).json(tasks);
//     } catch (error) {
//         console.error('Error fetching tasks:', error);
//         res.status(500).json({ message: 'Error fetching tasks.' });
//     }
// });


// Task Management Routes using Sequelize ORM
app.post('/api/tasks', async (req, res) => {
    const { question, description, testcase1, testcase2, branch, subject,year } = req.body;

    try {
        // Create a new task using Sequelize
        const task = await Task.create({
            question,
            description,
            testcase1_input: testcase1.input,
            testcase1_output: testcase1.output,
            testcase2_input: testcase2.input,
            testcase2_output: testcase2.output,
            year,
            branch,
            subject,
        });

        res.status(200).json(task);
    } catch (error) {
        console.error('Error inserting task:', error);
        res.status(500).json({ message: 'Error inserting task.' });
    }
});

// status for studentlabtasks✅
app.post('/api/studentlabtasks', async (req, res) => {
    let status = "incomplete";
    const { taskId, Username} = req.body;
    try {
        const task = await Submission.findOne({ where: { taskId, Username } });
        if (task) {
        // if passed column  in Submission table is true then status is complete

        if (task.passed) {
                status = "complete";
            }

        }
        res.json({ status });
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ message: 'Error fetching submission' });
    }
});


// API Endpoints

// 1. Get branch based on user credentials (Mock authentication for now)
app.get('/api/get-branch', (req, res) => {
    // Example of getting branch info from a logged-in user's session or database
    // Replace this with real authentication logic
    const userBranch = "CSE"; // Mock branch for demonstration
    res.json({ branch: userBranch });
});

// 2. Get subjects by branch (from tasks table)
app.get('/api/subjects', async (req, res) => {
    const branch = req.query.branch;

    if (!branch) {
        return res.status(400).json({ error: 'Branch is required' });
    }

    try {
        // Query the Task table to get distinct subjects for the given branch
        const tasks = await Task.findAll({
            attributes: ['subject'], // Select only the 'subject' column
            where: { branch: branch }, // Filter by branch
            group: ['subject'], // Ensure we get distinct subjects
        });

        // Extract subject names from the tasks
        const subjects = tasks.map(task => task.subject);

        if (subjects.length === 0) {
            return res.status(404).json({ error: 'No subjects found for this branch' });
        }

        // Send the list of subjects as a response
        res.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: 'Error fetching subjects' });
    }
});


// 3.Get tasks by subject
app.get('/api/tasks', async (req, res) => {
    const subject = req.query.subject;

    try {
        if (!subject) {
            // Fetch all distinct subjects
            const subjects = await Task.findAll();

            //console.log("All subjects:", subjects); // Debug log
            return res.json(subjects);
        }

        // Fetch tasks for the specific subject
        const tasks = await Task.findAll({
            where: { subject },
            attributes: ['id', 'question'],
        });

        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Error fetching tasks' });
    }
});



// 4. Get task details by ID
app.get('/api/task', async (req, res) => {
    const taskId = req.query.id;

    if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
    }

    try {
        const task = await Task.findOne({
            where: { id: taskId },
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        console.error('Error fetching task details:', error);
        res.status(500).json({ error: 'Error fetching task details' });
    }
});

app.post('/api/get-latest-code', async (req, res) => {
    const { Username, taskId } = req.body; // Get Username and taskId from request body

    if (!Username || !taskId) {
        return res.status(400).json({ success: false, message: "Username and taskId are required" });
    }

    try {
        // Find the latest submission for the given Username and taskId
        const latestSubmission = await Submission.findOne({
            where: { Username, taskId },
            order: [['submittedAt', 'DESC']] // Get the latest record
        });

        if (!latestSubmission) {
            return res.json({ success: false, message: "No code found for this task and user" });
        }

        res.json({
            success: true,
            code: latestSubmission.code,
            language: latestSubmission.language
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check compiler/interpreter availability
async function checkCompilers() {
    const compilers = {
        python: 'python --version',
        gcc: 'gcc --version',
        'g++': 'g++ --version',
        java: 'java -version'
    };

    const available = {};

    for (const [compiler, command] of Object.entries(compilers)) {
        try {
            await new Promise((resolve, reject) => {
                exec(command, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            available[compiler] = true;
        } catch (error) {
            available[compiler] = false;
            console.warn(`Warning: ${compiler} is not available`);
        }
    }

    return available;
}

let availableCompilers = {};
checkCompilers().then(result => {
    availableCompilers = result;
    console.log('Available compilers:', availableCompilers);
});

// API endpoints
app.get('/api/compiler-status', (req, res) => {
    res.json(availableCompilers);
});

app.post('/api/run', async (req, res) => {
    const { code, language, input } = req.body;
    const filename = `temp_${Date.now()}`;

    try {
        const result = await runCode(filename, code, language, input);
        res.json({ output: result });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    } finally {
        cleanup(filename, language);
    }
});

app.post('/api/test', async (req, res) => {
    const { code, language, testCases } = req.body;
    const filename = `temp_${Date.now()}`;

    try {
        const results = await Promise.all(testCases.map(async (testCase, index) => {
            try {
                const output = await runCode(filename, code, language, testCase.input);
                const expectedLines = testCase.expectedOutput.trim().split('\n');
                const actualLines = output.trim().split('\n');
                const passed = output.trim() === testCase.expectedOutput.trim();

                const comparison = expectedLines.map((expected, i) => {
                    const actual = actualLines[i] || '';
                    return {
                        expected,
                        actual,
                        matches: expected === actual
                    };
                });

                return {
                    testNumber: index + 1,
                    passed,
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: output,
                    comparison
                };
            } catch (error) {
                return {
                    testNumber: index + 1,
                    passed: false,
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: '',
                    error: error.message
                };
            }
        }));

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        cleanup(filename, language);
    }
});

app.post('/api/submit', async (req, res) => {
    const { taskId, code, language, passed, Username } = req.body;

    try {
        // Check if a submission already exists for the given Username and taskId
        let submission = await Submission.findOne({ where: {taskId, Username} });

        if (submission) {
            // Update the existing submission
            submission.code = code;
            submission.language = language;
            submission.passed = passed;
            submission.submittedAt = new Date();
            await submission.save();
        } else {
            // Create a new submission if not found
            submission = await Submission.create({
                taskId,
                code,
                language,
                passed,
                Username,
                submittedAt: new Date()
            });
        }

        res.json({ success: true, submission });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// Helper functions
async function runCode(filename, code, language, input) {
    const fileMap = {
        'cpp': { ext: '.cpp', compile: 'g++ {file} -o {exe}', run: './{exe}' },
        'c': { ext: '.c', compile: 'gcc {file} -o {exe}', run: './{exe}' },
        'python': { ext: '.py', compile: null, run: 'python {file}' },
        'java': { ext: '.java', compile: 'javac {file}', run: 'java {className}' }
    };

    const config = fileMap[language];
    const sourceFile = filename + config.ext;
    const exeFile = filename + (language === 'java' ? '' : '.exe');

    let modifiedCode = code;
    if (language === 'python' && input) {
        modifiedCode = `import sys
import io

# Redirect stdin to use our input
input_data = """${input.replace(/"/g, '\\"')}"""
sys.stdin = io.StringIO(input_data)

# Original code starts here
${code}`;
    }

    await fs.writeFile(sourceFile, modifiedCode);

    if (config.compile) {
        const compileCmd = config.compile
            .replace('{file}', sourceFile)
            .replace('{exe}', exeFile);

        await new Promise((resolve, reject) => {
            exec(compileCmd, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Compilation error: ${stderr || error.message}`));
                } else {
                    resolve();
                }
            });
        });
    }

    const runCmd = config.run
        .replace('{file}', sourceFile)
        .replace('{exe}', exeFile)
        .replace('{className}', filename);

    return new Promise((resolve, reject) => {
        exec(runCmd, {
            timeout: 10000,
            maxBuffer: 1024 * 1024
        }, (error, stdout, stderr) => {
            if (error && error.killed) {
                reject(new Error('Execution timed out'));
            } else if (error) {
                reject(new Error(`Runtime error: ${stderr || error.message}`));
            } else {
                resolve(stdout || '');
            }
        });
    });
}

async function cleanup(filename, language) {
    const extensions = ['.cpp', '.c', '.py', '.java', '.class', '.exe', '.input'];
    for (const ext of extensions) {
        try {
            await fs.unlink(filename + ext);
        } catch (error) {
            // Ignore errors if file doesn't exist
        }
    }
}



// Materials Source 

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// API Route to Upload File
app.post('/api/upload', upload.single('fileUpload'), async (req, res) => {
    try {
        const { branch, year, subject, fileName } = req.body;
        const filePath = req.file ? req.file.path : '';

        if (!filePath) {
            return res.status(400).json({ message: "File upload failed!" });
        }

        const newMaterial = await StudyMaterial.create({
            branch,
            year,
            subject,
            fileName,
            filePath
        });

        res.status(201).json({
            message: "File uploaded successfully!",
            studyMaterial: newMaterial
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
    }
});


// Route: Fetch Study Materials Based on Branch, Year, Subject
app.get('/api/materials', async (req, res) => {
    const { branch, year } = req.query;
    if (!branch || !year) {
        return res.status(400).json({ error: 'Branch and year are required.' });
    }

    try {
        const materials = await StudyMaterial.findAll({ where: { branch, year } });
        res.json(materials);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching materials.' });
    }
});

// Route: View File in Browser
app.get('/api/materials/view/:id', async (req, res) => {
    try {
        const material = await StudyMaterial.findByPk(req.params.id);
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }

        const filePath = material.filePath;
        const fileExt = path.extname(filePath).toLowerCase();

        // Set Content-Type based on file extension
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.txt': 'text/plain',
            '.html': 'text/html'
        };

        const contentType = mimeTypes[fileExt] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        // Send the file to be viewed in the browser
        res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error viewing file.' });
    }
});

// Route: Download File
app.get('/api/materials/download/:id', async (req, res) => {
    try {
        const material = await StudyMaterial.findByPk(req.params.id);
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }

        const filePath = material.filePath; // Full path of the file
        const fileExt = path.extname(filePath); // Extract file extension
        const fileName = `${material.fileName}${fileExt}`; // Ensure filename has an extension

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.download(filePath, fileName);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error downloading file.' });
    }
});

//Exam Editor Page

// 📌 Add Exam Data
app.post("/api/exams", async (req, res) => {
    try {
        const { branch, year, scheduleDateTime, examName, examTime, questions } = req.body;

        if (!branch || !year || !scheduleDateTime || !examName || !examTime || !questions.length) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const newExam = await Exam.create({
            branch,
            year,
            scheduleDateTime,
            examName,
            examTime,
            questions
        });

        res.status(201).json({ message: "Exam added successfully", data: newExam });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// 📌 Get All Exams
app.get("/api/exams", async (req, res) => {
    try {
        const exams = await Exam.findAll();
        res.json(exams);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});


//student Mock Tets

// Get Active or Completed Exams
app.get("/api/exams/:type", async (req, res) => {
    try {
        const { type } = req.params;

        // Fetch all exams
        const exams = await Exam.findAll();

        // Get the current time
        const now = new Date();

        // Update exam statuses if their scheduled time has passed
        for (let exam of exams) {
            if (new Date(exam.scheduleDateTime) < now && exam.status !== "completed") {
                await Exam.update({ status: "completed" }, { where: { id: exam.id } });
            }
        }

        // Fetch exams based on the updated status
        const filteredExams = await Exam.findAll({ where: { status: type } });

        res.json(filteredExams);
    } catch (error) {
        res.status(500).json({ message: "Error fetching exams", error });
    }
});


// ✅ Check if an exam is completed
app.post("/Exam_Completed_Check", async (req, res) => {
    try {
        const { examId, Username } = req.body;

        // Check if the exam exists in the completed table
        const completedExam = await ExamCompleted.findOne({
            where: { examId, Username }
        });

        res.json(!!completedExam); // Returns true if found, false otherwise
    } catch (error) {
        console.error("Error checking exam completion:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});




// Get Exam by ID
app.get("/api/exams/exam/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await Exam.findByPk(id);
        if (!exam) return res.status(404).json({ message: "Exam not found" });
        res.json(exam);
    } catch (error) {
        res.status(500).json({ message: "Error fetching exam details", error });
    }
});

// // Add New Exam
// app.post("/api/exams/add", async (req, res) => {
//     try {
//         const { branch, year, scheduleDateTime, examName, examTime, questions } = req.body;
//         const newExam = await Exam.create({ branch, year, scheduleDateTime, examName, examTime, questions });
//         res.status(201).json(newExam);
//     } catch (error) {
//         res.status(500).json({ message: "Error adding exam", error });
//     }
// });

// // Mark Exam as Completed
// app.put("/api/exams/complete/:id", async (req, res) => {
//     try {
//         const { id } = req.params;
//         await Exam.update({ status: "completed" }, { where: { id } });
//         res.json({ message: "Exam marked as completed" });
//     } catch (error) {
//         res.status(500).json({ message: "Error updating exam status", error });
//     }
// });


// Exam_page Backend
// Automatically track and cleanup temp files
temp.track();


// Get exam details
app.get('/api/exam/:id', async (req, res) => {
    try {
        const examId = req.params.id;

        // Validate exam ID
        if (!examId || isNaN(examId)) {
            return res.status(400).json({ error: 'Invalid exam ID' });
        }

        // Fetch the exam
        const exam = await Exam.findOne({ where: { id: examId } });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        //
        res.json(exam);
    } catch (error) {
        console.error('Error fetching exam:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Run code
app.post('/api/runexam', async (req, res) => {
    const { code, language, input } = req.body;

    try {
        const result = await runCodeExam(code, language, input);
        res.json(result);
    } catch (error) {
        console.error('Error running code:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit solution
app.post('/api/submitexam', async (req, res) => {
    const { examId, questionId, code, language, passed, Username } = req.body;

    try {

        // Check if a submission already exists for the given Username and taskId
        let submission = await ExamSubmission.findOne({ where: { examId, questionId, Username } });

        if (submission) {
            // Update the existing submission
            submission.code = code;
            submission.language = language;
            submission.passed = passed;
            submission.submittedAt = new Date();
            await submission.save();
        } else {
            // Create a new submission for that specific question
            submission = await ExamSubmission.create({
                examId,
                questionId,
                Username,
                code,
                language,
                passed
            });
        }
        res.json({ success: true, submission });
    } catch (error) {
        console.error('Error submitting solution:', error);
        res.status(500).json({ error: 'Failed to submit solution' });
    }
});

// Get latest code
app.post('/api/get-exam-latest-code', async (req, res) => {

    const { examId, questionId, Username } = req.body;

    try {
        // Find submission specific to exam, question, and user
        const submission = await ExamSubmission.findOne({where : { examId, questionId, Username }});

        if (!submission) {
            return res.json({ success: false, message: "No submission found for this question" });
        }

        res.json({ success: true, submission });
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
});

// Submit entire exam
app.post('/api/submit-full-exam', async (req, res) => {
    const { examId, examName, Username } = req.body;

    try {

            const FullExam = await ExamCompleted.create({
                examId,
                examName,
                Username,
            });
        
        // Update exam status to completed for this user
        // You might want to create a separate ExamSubmission model for this
        res.json({ success: true });
    } catch (error) {
        console.error('Error submitting exam:', error);
        res.status(500).json({ error: 'Failed to submit exam' });
    }
});

// Code execution helper function
async function runCodeExam(code, language, input) {
    const tempDir = await temp.mkdir('code-execution');
    let sourceFile, executable, command;

    try {
        switch (language) {
            case 'python':
                sourceFile = path.join(tempDir, 'solution.py');
                await fs.writeFile(sourceFile, code);
                command = `python ${sourceFile}`;
                break;

            case 'cpp':
                sourceFile = path.join(tempDir, 'solution.cpp');
                executable = path.join(tempDir, 'solution');
                await fs.writeFile(sourceFile, code);
                await execAsync(`g++ ${sourceFile} -o ${executable}`);
                command = executable;
                break;

            case 'java':
                sourceFile = path.join(tempDir, 'Solution.java');
                await fs.writeFile(sourceFile, code);
                await execAsync(`javac ${sourceFile}`);
                command = `java -cp ${tempDir} Solution`;
                break;

            default:
                throw new Error('Unsupported language');
        }

        const { stdout, stderr } = await execAsync(command, {
            input: input,
            timeout: 5000 // 5 second timeout
        });

        return {
            output: stdout,
            error: stderr
        };
    } catch (error) {
        return {
            output: '',
            error: error.message
        };
    }
}


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
