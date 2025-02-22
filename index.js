require("dotenv").config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 5000;

// Imports
const authRouter = require('./routes/auth.routes');
const alumiRouter = require('./routes/alumni.route');
const facultyRouter = require('./routes/faculty.route');
const eventRouter=require('./routes/event.route')
const certificateRouter=require('./routes/certificate.route')

app.use(express.static('public')); 
app.use(express.json());
app.use(cors({origin:"*"}));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/v1/api/auth', authRouter);
app.use('/v1/api/alumni',alumiRouter);
app.use('/v1/api/faculty',facultyRouter);
app.use('/v1/api/event',eventRouter);
app.use('/v1/api/certificate',certificateRouter)

app.get('/', async (req, res) => {
  res.send('Welcome to the Express Server!');
});

app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});