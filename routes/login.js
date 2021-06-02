const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto')
const REGEX_EMAIL = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const REGEX_SENHA = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,12}$/;
const cookieParser = require('cookie-parser')

//Pra poder ler json
router.use(express.json())
router.use(express.urlencoded({extended: true}))
router.use(cookieParser())

//sql
const mysql= require('mysql');

//Pra exibir o site quando entrar
router.get('/', (req, res)=>{
    res.render('login.html')
});

function generateRandomBytes(){
    //Exatemente oq o nome diz, uso para criar cookies
    return crypto.randomBytes(50).toString('hex');
}

function hashToSha256(param){
    /**
     * Essa aqui funciona para hashear as senhas
     */
    var toHash = crypto.createHmac('sha256', 'Salt');
    toHash.update(param);
    return toHash.digest().toString('hex');
    
}

function querysToDb(query, params){
    /*
     * Essa função serve pra poder fazer querrys, retorna uma promise
     */
    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : '',
        database : 'EVENTOS'
    });

    connection.connect();
    let resultado = new Promise(function(resolve, reject){
        connection.query(query, params, function (error, results, fields) {
            if (error){
               reject(error);
            }

            if(results){
                resolve(results);
            }  
        })
    });
    connection.end();
    return resultado;
}

router.post('/firstsession', (req,res)=>{

    /*
     * Primeiro é importante entender que quando um usuario loga na pagina, a pagina manda
     * automaticamente uma solicitação ao servidor pedindo um cookie que sera utilizado pra
     * validar a autenticação. Nessas solicitações é enviado um cookie (firstSession) usado na
     * validação dos requests tanto de login quanto os de senha, esse cookie dura 30 min. 
     * 
     * O pedido é enviado nesse endereço
     *
     */
    var { body } = req

    if("isFirstSession" in body){
        
        if(body.isFirstSession){ //Se for a primeira seção (usuario não tem o cookie)
            var cookie = generateRandomBytes();

            //Cria o cookie e envia
            res.cookie('firstSession',cookie,{maxAge:30*60*1000}).send()
            
            //Cria uma entrada no banco de dados com o cookie
            var query = "INSERT INTO LoginCookies(`session`, `date`) VALUES (?, now())"

            //Não há motivos para rejeitar ou mexer na promisse ja que não espero um resultado
            
            querysToDb(query, [cookie]);
            
        }else{ 
            //Como o cookie expira sozinho dps de 30 min não tem pq ver se ele é valido ou n
            res.status(200).send("Sucess");
        }
    }else{
        res.status(502).send("Bad Gateway");
    }
})

function validateRequest(req){

    /*
     * 
     * É importante saber que se caso a authenticação for ser feita pelo cookie
     * de autenticação (userSession), o firstSession não é necessario.
     * 
     * Outra coisa, esse cookie expira dps de 30 min.
     *
     * É disso que trata o primeiro iff
     * 
     *                          -------------------------------- 
     * Daqui pra frente tomaremos conta do login
     *  O json enviado tem os atributos corretos, email e senha e os cookies enviados
     *  Os mesmos atributos estão preenchidos (no caso de serem enviados
     *  mas não estarem preenchidos (email:""))
     *  Se o email e a senha passa pelo teste de validação do REGEX
     */

    var { body } = req
    var {cookies} = req

    //Se o usuario tiver o userSection significa que ja esta autenticado,
    //Nesse caso eu não ligo pro fistSection pois ele serve apenas pra logar
    if("userSession" in cookies){
        return{
            valid: true,
            hasUserCookie: true,
            userSection: cookies.userSession
        }
    }
  
    if('email' in body && 'password' in body && 'firstSession' in cookies){ //Ve se o json ta da forma que eu quero
        if(body.email && body.password && cookies.firstSession){ //Ve se os dados estão vazios
            if(REGEX_EMAIL.test(String(body.email).toLowerCase())){ //Ve se o email esta valido
                if(REGEX_SENHA.test(String(body.password).toLowerCase())){ //Ve se a senhaesta valida
                        return {
                            valid: true,
                            email: body.email,
                            password: hashToSha256(body.password),
                            firstSessionId: cookies.firstSession      
                        }     
                }else{
                    return {
                        valid: false, 
                        status: 502,
                        msg: "Invalid Password"
                    } 
                }
            }else{
                return {
                    valid: false, 
                    status: 502,
                    msg: "Invalid Email"
                } 
            }
        }else{
            return {
                valid: false, 
                status: 502,
                msg: "Bad Gateway"
            }
        }
    }else{
        return {
            valid: false, 
            status: 502,
            msg: "Bad Gateway"
        }
    }
}

router.post('/login', (req, res) => {
    var data = validateRequest(req)

    //Se as informaçoes forem validas

    if (data.valid) {

        //Se o usuario tiver cookies, como eu disse anteriormente, o firstsection n importa
        //Nesse contexto, então para representar isso progrmaticamente esse if vem primeiro
        //e o resto só acontece se esse for falso

        if (data.hasUserCookie) {
            //TODO: Caso cookie exista

            var query = "Call LOGIN_COOKIE(?)"
            var cookie = data.userSection

            querysToDb(query, cookie).then(function (result){
                if(Object.values(result[0][0]) == 'True'){
                    res.status(200).send("Sucess")
                }else{
                    res.status(401).cookie('userSession', 'expire',{maxAge: 1}).send("Unauthorized")
                }
            }).catch(function(error){
                res.send(error)
            });

        } else {

            //valida firstSession com a entrada do bd

            var query = "Call loginSession(?);"

            //Pegando a promisse 
          
            querysToDb(query, [data.firstSessionId]).then(function(result_param) {
                //Perdão por essa parte, embora pareça um inferno eu explico, vamos la
                //result é a promisse que o querysToDb retorna, então vamos resolve-la
                //Nesse caso em especifico, essa querry traz um valor de verdadeiro ou falso
                // verdadeiro = firstSession existe no banco e, do contrario, falso

                if (Object.values(result_param[0][0]) == 'True') {
                    

                    //Caso o cookie exista podemos prosseguir com o login, query é sobrescrita

                    query = "call LOGIN_CONTA( ?,? );"

                    //E enviada pro banco, retornado uma promise, vamos resolve-la
                    
                    querysToDb(query, [data.email, data.password]).then(function(result_param2) {
                        //TODO: Trazer eventos caso parametro seja verdadeiro
                        if (Object.values(result_param2[0][0]) == 'True') {

                            var cookie = generateRandomBytes();
                            var userIde = Object.values(result_param2[1][0])

                            query = "call CREATE_COOKIE(?, ?);"
                            querysToDb(query, [userIde, cookie]).then(function(results){
                                res.cookie('userSession', cookie ,{maxAge:(12*60*60*1000)}).status(200).send("Sucess")
                            }).catch(function(error) {
                                res.status(503).send({
                                    msg: error.code
                                });
                            })
                        } else {
                            res.status(401).send("Unauthorized")
                        }
                        //Caso a promisse retorne um erro
                    }).catch(function(error) {
                        res.status(503).send({
                            msg: error.code
                        });
                    });
                } else {
                    //Caso o firstSession não seja encontrado no banco vou só deduzir que
                    //o tempo maximo de 30 minutos foi atingido e o cookie foi deletado
                    res.status(401).send("Session Expired")
                }
                //Caso a promisse retorne o codigo do erro com o status 503
            }).catch(function(error) {
                res.status(503).send({
                    msg: error.code
                })
            });
        }
    } else {
        //Caso não seja valido, mande o porquê
        res.status(data.status).send(data.msg)
    }
});

router.post('/cadastro', (req, res)=>{
    var data = validateRequest(req)

    //Se as informaçoes forem validas

    if(data.valid){
        //O mesmo processo do login de validar o firstSession, porem eu não quero
        //Receber nada com cookies de authenticação aqui
        if (data.hasUserCookie) {
            res.status(502).send("Bad Gateway")
        } else {
            var query = "Call loginSession(?);"

            querysToDb(query, [data.firstSessionId]).then(function(result_param) {

                if (Object.values(result_param[0][0]) == 'True') {

                    //Agora iremos para o cadastro, sobrescreveremos a query

                    query = "CALL CADASTRO_CONTA(?, ?)"

                    //E enviada pro banco, retornado uma promise, vamos resolve-la
                    querysToDb(query, [data.email, data.password]).then(function(result_param2) {

                        var cookie = generateRandomBytes();
                        var userIde = Object.values(result_param2[0][0])

                        query = "call CREATE_COOKIE(?, ?);"

                        querysToDb(query, [userIde, cookie]).then(function(results){
                            res.cookie('userSession', cookie ,{maxAge:(12*60*60*1000)}).status(200).send("Sucess")
                        }).catch(function(error) {
                            res.status(503).send({
                                msg: error.code
                            });
                        });
                        
                    }).catch(function(error) {
                        res.status(503).send(error.code);
                    });
                } else {
                    //Caso o firstSession não seja encontrado no banco vou só deduzir que
                    //o tempo maximo de 30 minutos foi atingido e o cookie foi deletado
                    res.status(401).send("Session Expired")
                }
                //Caso a promisse retorne o codigo do erro com o status 503
            }).catch(function(error) {
                res.status(503).send({
                    msg: error.code
                })
            });
        }
    }else{
        //Caso não seja valido, mande o porquê
        res.status(data.status).send(data.msg)
    }
});

module.exports = router;