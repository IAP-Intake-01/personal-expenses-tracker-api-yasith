const express = require('express')
const mysql=require('mysql2')
const cors=require('cors')
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
const cookieParser=require('cookie-parser')
const {response} = require("express");
const salt=10

const app = express()
app.use(express.json());
app.use(cors({
    origin:["http://localhost:3000"],
    methods:["POST","GET"],
    credentials:true
}));
app.use(cookieParser());
const port = 3000

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'apwd',
    database: 'expense_tracker'
})

app.post('/register',(req,res)=>{
    bcrypt.hash(req.body.password.toString(),salt,(err,hash)=>{
        if (err) return res.json({Error:"Error for hashing password"})
        connection.query('INSERT INTO login(name,email,password) VALUES ( ?, ?,?) ', [req.body.name,req.body.email,hash], (err, rows) => {
            if (err) return res.json({Error:"Invalid input provided"})
            res.json({Status:"Success"})
        })
    })
})

app.post('/login',(req,res)=>{
    connection.query('SELECT * FROM LOGIN WHERE EMAIL = ?',[req.body.email],(err,data)=>{
        if (err) return res.json({Error:"Login error in server"})
        if(data.length>0){
            bcrypt.compare(req.body.password.toString(),data[0].password,(err,response)=>{
                if(err) return res.json({Error:"Password compare error"})
                if(response){
                    const name=data[0].name;
                    const token=jwt.sign({name},"jwt-secret-key",{expiresIn: '1d'})
                    return res.json({Status:"Success"});
                }else{
                    return  res.json({Status:"Password not matched"})
                }
            })
        }else{
            return res.json({Error:"No email existed"})
        }
    })
})
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})