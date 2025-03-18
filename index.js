const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

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
            const result = await cartCollections.find().toArray();
            res.send(result)
        });
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
