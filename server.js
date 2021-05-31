//express and socket.io
const express = require('express')
const app  = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

//cors
app.use(require('cors')());

//mongoose for db and dotenv to hide the db credentials
require('dotenv').config()


// This allows me to view html and css files and render them 
const path = require('path');

app.set('views', path.join(__dirname, 'public/views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine' , 'html');
app.use(express.static(path.join(__dirname, 'public/css')));


//Importing routes from routes files

app.get('/', (req,res)=>{
    res.render('login.html');
})

app.listen(process.env.PORT || 3000);

console.log('server running');