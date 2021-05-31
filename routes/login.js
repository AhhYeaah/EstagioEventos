const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto')

//Pra poder ler json
router.use(express.json())
router.use(express.urlencoded({extended: true}))

//sql
const mysql= require('mysql');

//Pra exibir o site quando entrar
router.get('/', (req, res)=>{
    res.render('login.html')
});

router.post('/login', (req, res)=>{
    

    let body = Object.keys(req.body);

    if(body.includes("email") && body.includes("password")){
        
        let email = req.body.email

        var toHash = crypto.createHmac('sha256', 'Salt');
        toHash.update(req.body.password)
        let password = toHash.digest().toString('hex')

        var connection = mysql.createConnection({
            host     : 'localhost',
            user     : 'root',
            password : '',
            database : 'EVENTOS'
        });

        connection.connect();

        connection.query("call LOGIN_CONTA( ?,? );", [email , password], function (error, results, fields) {
            if (error) throw error;
            if(Object.values(results[0][0]) == 'True'){
                res.status(200).send("Usuario encontrado") 
            }else{
                console.log('uhuul')
                console.log(results)
                res.status(401).send({error: "Login ou senha incorretos"})
            }

        });
        connection.end();
        
    }else{
        res.status(502).send("Bad Gateway")
    }
});

router.post('/cadastro', (req, res)=>{
    var toHash = crypto.createHmac('sha256', 'Salt');

    let body = Object.keys(req.body);

    if(body.includes("email") && body.includes("password")){
        let email = req.body.email
        toHash.update(req.body.password)
        let password = toHash.digest()
        
    }else{
        res.status('502').send("Bad Gateway")
    }
});

module.exports = router;