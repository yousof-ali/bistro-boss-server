const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
        const paymentCollections = client.db('bostrobossDB').collection('payments');

       
       const verifyToken = (req,res,next) => {
        //    console.log('inside of verify',req.headers.authorization)
        if(!req.headers.authorization){
            return res.status(401).send({message:'unauthorize access'})
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) => {
            if(err){
                return res.status(401).send({message:'unauthorize access'})
            }
            req.decoded = decoded
            next()
        });
            
       }


       const verifyAdmin = async(req,res,next) => {
        const email = req.decoded.email
        const query = {email:email};
        const user = await userCollections.findOne(query);
        const isAdmin = user?.role==="Admin";
        if(!isAdmin){
            return res.status(403).send({message:'forbidden access'})
        }
        next();
       }


    //    payment method 
    app.post('/create-payment-intent',async(req,res) => {
        const{price} = req.body;
        const amount = parseInt(price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
            amount:amount,
            currency:'usd',
            payment_method_types:['card']
        });
        console.log(amount)
        res.send({
            clientSecret:paymentIntent.client_secret
        })
    })


    app.post('/payments',async(req,res) => {
        
        const paymentData = req.body;
        const paymentResult = await paymentCollections.insertOne(paymentData);

        // dlelete cart data 
        const query = {_id:{
            $in: paymentData.cartIds.map(id => new ObjectId(id))
        }}
        const deleteResult = await cartCollections.deleteMany(query);
        res.send({deleteResult,paymentResult})
    })

    app.get('/payments/:email',verifyToken,async(req,res) => {
        const email = req.params.email
        const query = {email : email}
        console.log(email);
        console.log(req.decoded)
        if(email !== req.decoded.email){
            
            return res.status(403).send({message:'forbidden access'})
        }
        const result = await paymentCollections.find(query).toArray();
        console.log(result)
        res.send(result);
    })
        app.post('/jwt',async(req,res) => {
            const user = req.body;
            const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
            res.send({token})
        })
        
        app.get('/users',verifyToken,verifyAdmin,async(req,res) => {
            const result = await userCollections.find().toArray();
            res.send(result);
        });

        app.patch('/user/admin/:id',verifyToken,verifyAdmin,async(req,res) => {
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

        app.get('/user/admin/:email',verifyToken,async(req,res) => {
          const email = req.params.email;
          if(email !== req.decoded.email){
            return res.status(403).send({message:'forbidden access'})
          }
          const query = {email:email};
          const user = await userCollections.findOne(query);
          let admin = false;
          if(user){
            admin = user?.role==="Admin"
          }
          res.send({admin})
        })

        app.delete('/user/:id',verifyToken,verifyAdmin,async(req,res) => {
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
        
        app.post('/menu',verifyToken,verifyAdmin,async(req,res) => {
            const data = req.body;
            const result = await menuCollections.insertOne(data);
            res.send(result);
        })

        app.delete('/menu-delete/:id',verifyToken,verifyAdmin,async(req,res) => {
            const id = req.params.id;
            console.log(id);
            const query = {_id : new ObjectId(id)};
            const result = await menuCollections.deleteOne(query);
            res.send(result);
        })

        app.get('/single-menu/:id',async(req,res) => {
            const id = req.params.id 
            console.log(id)
            const   query = {_id : new ObjectId(id)}
            const result = await menuCollections.findOne(query);
            console.log(result)
            res.send(result);
        })

        app.patch('/menu-update/:id',async(req,res) => {
            const newData = req.body;
            const id = req.params.id
            const query = {_id:new ObjectId(id)}
            const updateDoc = {
                $set:{
                    name:newData.name,
                    category:newData.category,
                    price:newData.price,
                    recipe:newData.recipe

                }
            }
            const result = await menuCollections.updateOne(query,updateDoc)
            res.send(result);
        })

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
