const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data file path
const dataFilePath = path.join(__dirname, 'data.json');

// Read issues data
async function readData() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { issues: [] };
  }
}

// Write issues data
async function writeData(data) {
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing data file:', error);
    throw new Error('Failed to save data');
  }
}

// GET all issues
app.get('/api/issues', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.issues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve issues' });
  }
});

// POST new issue
app.post('/api/issues', async (req, res) => {
  try {
    const data = await readData();
    const newIssue = {
      id: data.issues.length > 0 ? Math.max(...data.issues.map(issue => issue.id)) + 1 : 1,
      title: req.body.title,
      description: req.body.description,
      datePromised: req.body.datePromised,
      status: 'pending'
    };
    
    data.issues.push(newIssue);
    await writeData(data);
    
    res.status(201).json(newIssue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// PUT (update) issue
app.put('/api/issues/:id', async (req, res) => {
  try {
    const data = await readData();
    const id = parseInt(req.params.id);
    const issueIndex = data.issues.findIndex(issue => issue.id === id);
    
    if (issueIndex === -1) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    data.issues[issueIndex] = { 
      ...data.issues[issueIndex], 
      ...req.body,
      id // Ensure ID doesn't change
    };
    
    await writeData(data);
    res.json(data.issues[issueIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// DELETE issue
app.delete('/api/issues/:id', async (req, res) => {
  try {
    const data = await readData();
    const id = parseInt(req.params.id);
    const initialLength = data.issues.length;
    
    data.issues = data.issues.filter(issue => issue.id !== id);
    
    if (data.issues.length === initialLength) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    await writeData(data);
    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

// Serve the main HTML page for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});