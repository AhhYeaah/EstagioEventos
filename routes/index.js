const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto')

const cookieParser = require('cookie-parser')

//Pra poder ler json
router.use(express.json())
router.use(express.urlencoded({extended: true}))
router.use(cookieParser())

//sql
const mysql= require('mysql');

router.get('/', (req,res)=>{
    res.render('calendarPage.html')

})
module.exports = router