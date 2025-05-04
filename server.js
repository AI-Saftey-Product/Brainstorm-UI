import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 8080;

// Required to get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join('dist')));

// Handle SPA routing
// app.get('*', (req, res) => {
//   path = (path.join('dist', 'index.html'));
//   console.log(path);
//   res.sendFile(path);
// });

app.get('/', (req, res) => {
  res.send('Hello from App Engine!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
