//express and socket.io
const express = require('express');
const app  = express();
const server = require('http').createServer(app);

//cors
app.use(require('cors')());

//dotenv to hide the db credentials
require('dotenv').config()

// This allows me to view html and css files and render them 
const path = require('path');

app.set('views', path.join(__dirname, 'public/views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine' , 'html');
app.use(express.static(path.join(__dirname, 'public/css')));


//Importing routes from routes files
const loginRoute = require('./routes/login.js');
app.use('/', loginRoute)
const indexRoute = require('./routes/index.js');
app.use('/index', indexRoute)



app.listen(process.env.PORT || 3000);

console.log('server running');