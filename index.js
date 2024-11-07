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
    origin:["http://localhost:5173"],
    methods:["POST","GET","DELETE","PUT"],
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
            res.json({status:"Success",
            user:{
                name: req.body.name,     
                email: req.body.email,  
            }})
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
                    res.cookie('token',token);
                    return res.json({status:"Success",token,
                        user:{
                            email: req.body.email
                        }
                    });
                }else{
                    return  res.json({status:"Password not matched"})
                }
            })
        }else{
            return res.json({Error:"No email existed"})
        }
    })
})

app.post('/create-budget',(req,res)=>{
    connection.query('INSERT INTO budget(name,amount,createdBy) VALUES ( ?, ?,?) ', [req.body.name,req.body.amount,req.body.createdBy], (err, rows) => {
        if(err) return res.json({Error:'Error'})
        res.json({status:"Success",
            budget:{
                name: req.body.name,     
                amount: req.body.amount,  
                createdBy:req.body.createdBy
            }
        })
    })
})

app.get('/get-all-expense-list',(req,res)=>{
    const query = `
        SELECT
            Expenses.id AS id,
            Expenses.name AS name,
            Expenses.amount AS amount,
            Expenses.createdAt AS createdAt
        FROM
            budget
                RIGHT JOIN
            expenses ON budget.id = expenses.budget_id
        WHERE
            budget.createdBy = ?
        ORDER BY
            Expenses.id DESC;
    `;
    connection.query(query,[req.query.email],(err,rows)=>{
        if (err) return res.json({Error:'Error'})
        const allExpenseList = rows.map(row => ({
            id: row.id,
            name: row.name,
            amount: row.amount,
            createdAt: row.createdAt
        }));

        res.json({
            status: "Success",
            allExpenseList: allExpenseList
        });
    })

})
app.get('/get-budget-list',(req,res)=>{
    const query = `
        SELECT 
            budget.id,
            budget.name,
            budget.amount,
            budget.createdBy,
            SUM(expenses.amount) AS totalSpend,
            COUNT(expenses.id) AS totalItem
        FROM 
            budget
        LEFT JOIN 
            expenses ON budget.id = expenses.budget_id
        WHERE 
            budget.createdBy = ?
        GROUP BY 
            budget.id;
    `;
    connection.query(query,[req.query.email],(err,rows)=>{
        if (err) return res.json({Error:'Error'})
        const budgetList = rows.map(row => ({
            id: row.id,
            createdBy:row.createdBy,
            name: row.name,
            amount: row.amount,
            totalSpend: row.totalSpend || 0, // Handle case where no expenses exist
            totalItem: row.totalItem || 0      // Handle case where no expenses exist
        }));

        res.json({
            status: "Success",
            budget_list: budgetList
        });
    })
})

app.post('/create-expense',(req,res)=>{
    connection.query('INSERT INTO EXPENSES(name,amount,budget_id,createdAt) VALUES ( ?, ?,?,?) ', [req.body.name,req.body.amount,req.body.budget_id,req.body.createdAt],(err,rows)=>{
        if (err) return res.json({Error:'Error'})
        res.json({status:"Success",
            expense:{
                // id:rows.id,
                name: req.body.name,
                amount: req.body.amount,
                createdAt:req.body.createdAt
            }
        })
    })
})


app.get('/get-expense/:budget_id',(req,res)=>{
    connection.query('SELECT * FROM EXPENSES WHERE budget_id=?',[req.params.budget_id],(err,rows)=>{
        if (err) return res.json({Error:'Error'})
        const expenseList = rows.map(row => ({
            id: row.id,
            name: row.name,
            amount: row.amount,
            budget_id: row.budget_id,
            createdAt: row.createdAt
        }));
        res.json({
            status: "Success",
            expense_List:expenseList
        });
    })
})

app.delete('/delete-expense/:id',(req,res)=>{
    connection.query('DELETE FROM expenses WHERE id = ?',[req.params.id],(err,rows)=>{
        if (err) return res.json({Error:'Error'})
        res.json({status:'Success'})
    })
})

app.delete('/delete-budget/:id',(req,res)=>{
    connection.query('DELETE FROM budget WHERE id = ?',[req.params.id],(err,rows)=>{
        if (err) return res.json({Error:'Error'})
        res.json({status:'Success'})
    })
})

app.put('/edit-budget/:id',(req,res)=>{
    connection.query('UPDATE budget SET name = ?, amount = ? WHERE id = ?',[req.body.name,req.body.amount,req.params.id],(err,rows)=>{
        if (err) return res.json({Error:'Error'})
        res.json({status:"Success",
            newBudget:{
                id:req.params.id,
                name: req.body.name,
                amount: req.body.amount,
            }
        })
    })
})
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})