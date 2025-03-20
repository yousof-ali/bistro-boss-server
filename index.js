const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.send('bistroboss server is running!!')
})




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lewcb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const menuCollections = client.db('bostrobossDB').collection('menu');
        const cartCollections = client.db('bostrobossDB').collection('cart');
        const userCollections = client.db('bostrobossDB').collection('users');
        
        app.get('/users',async(req,res) => {
            const result = await userCollections.find().toArray();
            res.send(result);
        });

        app.patch('/user/admin/:id',async(req,res) => {
            const id = req.params.id;
            const query = {_id:new ObjectId(id)}
            const updateDoc = {
                $set:{
                    role:'Admin'
                }
            }
            const result = await userCollections.updateOne(query,updateDoc);
            res.send(result);
        })

        app.delete('/user/:id',async(req,res) => {
            const id = req.params.id
            const query = {_id:new ObjectId(id)}
            const result = await userCollections.deleteOne(query);
            res.send(result);
        })

        app.post('/user',async(req,res) => {
            const data = req.body;
            const query = {email : data.email};
            const isExist = await userCollections.findOne(query);
            if(isExist){
                return res.send({message:'user already exists',insertedId:null})
            }
            const result = await userCollections.insertOne(data);
            res.send(result);
        })

        app.get('/menu',async(req,res) => {
            const result = await menuCollections.find().toArray();
            res.send(result);
        });
        app.post('/cart',async(req,res) => {
            const item = req.body;
            const result = await cartCollections.insertOne(item);
            res.send(result);
        })
        app.get('/cart',async(req,res) => {
            const email = req.query.email
            const query = {userEmail:email}
            const result = await cartCollections.find(query).toArray();
            res.send(result)
        });
        app.delete('/cart/:id',async(req,res) => {
            const id = req.params.id
            const query = {_id: new ObjectId(id)}
            const result = await cartCollections.deleteOne(query);
            res.send(result);
        })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`bistroboss is running on port ${port}`)
})
