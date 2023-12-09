const express = require('express')
require('dotenv').config()
const cookieParser = require('cookie-parser')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleWare
app.use(cors({
  origin: [
    // 'http://localhost:5173',
    'https://hotel-management-ad623.web.app',
    'https://hotel-management-ad623.firebaseapp.com/'
  ],
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())

const logger = (req, res, next) => {
  console.log(req.method, req.url);
  next();
}

const verifyToken = ( req, res, next) => {
  const token = req?.cookies?.token;
  console.log('token in the middleware:', token);
  if(!token){
    return res.status(401).send({message: 'unautorized access'})
  }
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded
    next();
  })
  // next();
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cbqlcas.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    // create database
    const featuredRoom = client.db("hotelManagement").collection("roomCategory")
    const roomCollection = client.db("hotelManagement").collection("room")
    const bookingCollection = client.db("hotelManagement").collection("booking")
    const reviewCollection = client.db("hotelManagement").collection("reviews")

    // jwt
    app.post('/jwt', async(req, res) => {
      const user =req.body

      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {expiresIn: '1h'})
      res.cookie('token', token,{
        httpOnly: true,
        secure: true,
        sameSite: 'none'

      }).
      send({success: true});

    })
    app.post('/logout', async(req,res) => {
      const user = req.body;
      console.log('logout : ', user)
      res.clearCookie('token', {maxAge: 0}).send({success: true})
    })

    // get data from roomCategory
    app.get('/roomcategory', async(req, res) => {
      const cursor = featuredRoom.find()
      const result = await cursor.toArray()
      res.send(result)

    })

    // get room details data
    app.get('/room',logger, async(req, res) => {
      const cursor = roomCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    // find single room by id
    app.get('/room/:id',logger, async(req, res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await roomCollection.findOne(query)
      res.send(result)
    })
    // find booking data
    app.get("/booking",logger, async(req, res) => {
      // console.log(req.cookies)
      let query = {}
      // console.log('token owner info:', req.user)
      // if(req.user.email !== req.query?.email){
      //   return res.status(403).send({message: 'forbidden access'})
      // }
      
      if (req.query?.email ) {
        query = { email: req.query.email }
    }
      const cursor = bookingCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    // get booking data by id
    app.get('/booking/:id', async(req, res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.findOne(query)
      res.send(result)
    })

    // app.get('/booking', async(req, res) => {
    //   // const room = req.query
    //   const query = {room_no: req.query.room_no}
    //   const result = await bookingCollection.findOne(query)
    //   res.send(result)
    // })
    // get data by room no from booking collection
    // app.get("/booking", async(req, res) => {
    //   let query = {}
    //   if (req.query?.room_no) {
    //     query = { room_no: req.query.room_no }
    // }
    //   const cursor = bookingCollection.find(query)
    //   const result = await cursor.toArray()
    //   res.send(result)
    // })

    // get reviews
    app.get('/reviews', async(req, res) => {
      let query = {}
      if (req.query?.room_no) {
        query = { room_no: req.query.room_no }
    }
      const cursor = reviewCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    // post booking data into database
    app.post('/booking', async(req, res) => {
      const bookingRoom = req.body
      const result = await bookingCollection.insertOne(bookingRoom)
      res.send(result)
    })
    // post booking data into database
    app.post('/reviews', async(req, res) => {
      const userReview = req.body
      const result = await reviewCollection.insertOne(userReview)
      res.send(result)
    })

    // update booking data
    app.patch('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      // console.log(updatedBooking);
      const updateDoc = {
          $set: {
              checkin: updatedBooking.checkin,
              checkout: updatedBooking.checkout
          },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
  })

    // Delete one
    app.delete('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
  })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})