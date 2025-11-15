import express from "express" 
import configDB from "./src/db/dbConfig.js" 

const app= express() 

app.use(express.json() ) 

configDB() 



app.listen(8080, ()=> 
{ 
    console.log("Server Is Listening On PORT 8080 " ) 
} ) 