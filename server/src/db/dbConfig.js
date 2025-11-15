import mongoose from "mongoose" 

async function configDB() 
{ 
    try 
    { 
        await mongoose.connect("mongodb+srv://aryan24bcs10283:gFvaluXfAKaIBGCT@cluster0.hudjuh5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" ) 
        console.log("MongoDB Connected" ) 
    } catch (error ) 
    { 
        console.log("Internal Server Error "+ error ) 
    } 
} 

export default configDB ; 