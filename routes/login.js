const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto')
const RE = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
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
    //Exatemente oq o nome diz
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
            if (error)reject(new Error(error));
            if(results){
                resolve(results)
            }  
        })
    });
    connection.end();
    return resultado;
}

function validateRequest(req){

    /*
     * Primeiro é importante entender que quando um usuario loga na pagina, ela manda
     * uma solicitação ao servidor pedindo um cookie que sera utilizado pra validar a
     * autenticação. Nessas solicitações é enviado um cookie (firstSession)
     * 
     * Sendo assim, no tratamento das solicitações enviadas automaticamente pela pagina
     * não sera levado em consideração nenhuma tentativa de login do usuario, ou seja
     * O server vai somente olhar se o cookie existe e se não existir vai enviar um.
     * 
     * Tambem é importante saber que se caso a authenticação for ser feita pelo cookie
     * de autenticação (userSession), o firstSession não é necessario.
     * 
     * Outra coisa, esse cookie expira dps de 30 min.
     *
     * É disso que trata o primeiro e o segundo if.
     * 
     *                          -------------------------------- 
     * Daqui pra frente tomaremos conta do login
     * 2. O json enviado tem os atributos corretos, email e senha e os cookies enviados
     * 3. Os mesmos atributos estão preenchidos (no caso de serem enviados
     * mas não estarem preenchidos (email:""))
     * 4. Se o email passa pelo teste de validação do REGEX
     */

    var { body } = req
    var {cookies} = req

    //Caso o body tenha firstSession significa que ele foi enviado
    //Automaticamente pelo axios ao carregar a pagina
    if("isFirstSession" in body){
        if(body.isFirstSession === true){
            return{
                valid: true,
                status: 200,
                isfirstSession: true,
                firstSessionId: generateRandomBytes()
            }
        }
    }
    //Se o usuario tiver o userSection significa que ja esta autenticado,
    //Nesse caso eu não ligo pro fistSection pois ele serve apenas pra logar
    if("userSection" in cookies){
        return{
            valid: true,
            hasUserCookie: true,
            userSection: userSection
        }
    }

    if('email' in body && 'password' in body && 'firstSession' in cookies){
        if(body.email && body.password && cookies.firstSession){
            if(RE.test(String(body.email).toLowerCase())){
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

router.post('/login', (req, res)=>{
    var data = validateRequest(req)
    //Se a data for valida
    if(data.valid){
        //Se o usuario tiver cookies, como eu disse anteriormente, o firstsection n importa
        //Nesse contexto, então para representar isso progrmaticamente esse if vem primeiro
        //e o resto só acontece se esse for falso
        if(data.hasUserCookie){
            //TODO: Caso cookie exista, trazer eventos relacionados ao usuario com o innerjoin
            var query = "SELECT `User_Email`, `User_Senha` FROM UsersCookies INNER JOIN Users ON UsersCookies.`Usuarios_User_ID` = Users.`User_ID` WHERE UsersCookies.`Usuarios_User_ID` = ?"
            console.log(querysToDb(query, data.userSection));
        }else{
            //Se for a primeira vez acessando a pagina (Usuario não possui firstSession)
            if(data.isfirstSession){
                //Cria o cookie e envia
                var expiryDate = new Date(Number(new Date()) + 30*60*1000); 
                res.cookie('firstSession',data.firstSessionId,{maxAge:expiryDate}).send()
                //Cria uma entrada no banco de dados com o cookie
                var query = "INSERT INTO LoginCookies(`session`, `date`) VALUES (?, now())"
                //Não há motivos para rejeitar ou mexer na promisse ja que não espero um resultado
                querysToDb(query, [data.firstSessionId])
            }else {
                //Caso o usuario ja tenha o firstSession, valida ele com a entrada do bd
                var query = "Call loginSession(?);"
                //Pegando a promisse
                var result = querysToDb(query, [data.firstSessionId])
                //Perdão por essa parte, embora pareça um inferno eu explico, vamos la
                //result é a promisse que o querysToDb retorna, então vamos resolve-la
                result.then(function(result_param){
                    //Nesse caso em especifico, essa querry traz um valor de verdadeiro ou falso
                    // verdadeiro = firstSession existe no banco e, do contrario, falso
                    if(Object.values(result_param[0][0]) == 'True'){
                        //Caso o cookie exista podemos prosseguir com o login, query é sobrescrita
                        query = "call LOGIN_CONTA( ?,? );"
                        //E enviada pro banco, retornado uma promise, vamos resolve-la
                        let result_query = querysToDb(query, [data.email, data.password])
                        result_query.then(function(result_param2){
                            //TODO: Trazer eventos caso parametro seja verdadeiro
                            if(Object.values(result_param2[0][0]) == 'True'){
                                res.status(200).send("Sucess")
                            }else{
                                res.status(401).send("Unauthorized")
                            }
                        })
                    }else{
                        //Caso o firstSession não seja encontrado no banco vou só deduzir que
                        //o tempo maximo de 30 minutos foi atingido e o cookie foi deletado
                        res.status(401).send("Login Expired")
                    }
                })
            }
        }
    }else{
        //Caso não seja valido, mande o porquê
        res.status(data.status).send(data.msg)
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