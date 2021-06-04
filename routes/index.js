const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto')

const cookieParser = require('cookie-parser')

//Pra poder ler json
router.use(express.json())
router.use(express.urlencoded({ extended: true }))
router.use(cookieParser())

//sql
const mysql = require('mysql');

function querysToDb(query, params) {
    /*
     * Essa função serve pra poder fazer querrys, retorna uma promise
     */
    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'EVENTOS'
    });

    connection.connect();
    let resultado = new Promise(function (resolve, reject) {
        connection.query(query, params, function (error, results, fields) {
            if (error) {
                reject(error);
            }

            if (results) {
                resolve(results);
            }
        })
    });
    connection.end();
    return resultado;
}

//Ja que eu ia usar isso pra quase todas, fiz virar uma função
function checkCookie(req, res) {

    let resultado = new Promise(function (resolve, reject) {
        var { cookies } = req

        if ('userSession' in cookies) {
            if (cookies.userSession) {
                var query = "Call LOGIN_COOKIE(?)"

                querysToDb(query, [cookies.userSession]).then(function (result) {
                    if (Object.values(result[0][0]) == 'True') {
                        resolve({ valid: true, eventList: result[1] })
                    } else {
                        resolve({ valid: false, action: res.status(401).cookie('userSession', 'expire', { maxAge: 1 }).send("Unauthorized") })
                    }
                }).catch(function (error) {
                    resolve({ valid: false, action: res.status(502).send(error) })
                });
            } else {
                resolve({ valid: false, action: res.status(502).send() })
            }
        } else {
            resolve({ valid: false, action: res.status(502).send(error) })
        }
    });
    return resultado
}

//Rota padrão pra pegar a pagina
router.get('/', (req, res) => {
    checkCookie(req, res).then((result) => {
        if (result.valid) {
            res.render('calendarPage.html');
        } else {
            result.action
        }
    })
});

//Aqui a rota que vai acessar pra pegar os eventos do banco
router.get('/getEvents', (req, res) => {
    checkCookie(req, res).then((result) => {
        if (result.valid) {
            res.send(result.eventList);
        } else {
            result.action
        }
    })
})

router.post('/addEvento', (req, res) => {
    //Checando cookie
    checkCookie(req, res).then((result) => {

        var { body } = req;

        if (result.valid) {
            //objeto do evento, pra facilitar
            var evento = {
                cookie: req.cookies.userSession,
                titulo: body.titulo,
                dataInicio: body.inicio,
                dataFim: body.fim,
                descricao: body.descricao
            }
            //Testando datas
            var inicioData = new Date(evento.dataInicio);
            var fimData = new Date(evento.dataFim);

            if ((Date.parse(inicioData) - Date.now()) > 0 && (fimData - inicioData) > 0) {
                //Chamando banco pra adicionar evento
                var query = 'CALL ADD_EVENTO(?,?,?,?,?)';

                querysToDb(query, [evento.cookie, evento.titulo, evento.dataInicio, evento.dataFim, evento.descricao]).then(function (result) {
                    //Se os titulos forem invalidos o banco vai retornar 0, to testando isso aq
                    if ('RowDataPacket' in result) {
                        res.status(403).send("No duplicated titles")
                    } else {
                        res.status(200).send("OK")
                    }
                }).catch((error) => {
                    res.status(503).send(error)
                })
            } else {
                res.status(403).send("No invalid dates");
            }
        } else {
            result.action
        }
    })
})

router.post('/deleteEvento', (req, res) => {
    //Checando cookie
    checkCookie(req, res).then((result) => {

        var { body } = req;

        if (result.valid) {
            //Chamando banco pra adicionar evento
            var query = 'CALL DELETE_EVENTO(?,?)';
            if ("titulo" in body) {
                querysToDb(query, [req.cookies.userSession, body.titulo]).then(function (result) {
                    res.status(200).send("OK")
                }).catch((error) => {
                    res.status(503).send(error)
                })
            }
        } else {
            result.action
        }
    })
})

router.post('/updateEvento', (req, res) => {
    //Checando cookie
    checkCookie(req, res).then((result) => {

        var { body } = req;

        if (result.valid) {
            //objeto do evento, pra facilitar
            var evento = {
                cookie: req.cookies.userSession,
                titulo: body.titulo,
                dataInicio: body.inicio,
                dataFim: body.fim,
                descricao: body.descricao
            }
            //Testando datas
            var inicioData = new Date(evento.dataInicio);
            var fimData = new Date(evento.dataFim);

            if ((Date.parse(inicioData) - Date.now()) > 0 && (fimData - inicioData) > 0) {
                //Chamando banco pra adicionar evento
                var query = 'CALL UPDATE_EVENTO(?,?,?,?,?)';

                querysToDb(query, [evento.cookie, evento.titulo, evento.dataInicio, evento.dataFim, evento.descricao]).then(function (result) {
                    //Se os titulos forem invalidos o banco vai retornar 0, to testando isso aq
                    res.status(200).send("OK")
                }).catch((error) => {
                    res.status(503).send(error)
                })
            } else {
                res.status(403).send("No invalid dates");
            }
        } else {
            result.action
        }
    })
})

module.exports = router;