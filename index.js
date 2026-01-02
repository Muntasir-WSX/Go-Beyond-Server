const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware  ---
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'https://gobeyond-2f44a.web.app',
        'https://gobeyond-2f44a.firebaseapp.com'
    ],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@simple-crud-server.a0arf8b.mongodb.net/?appName=simple-crud-server`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const tourCollection = client.db('GoBeyond').collection('tourpackages');
        const bookingCollection = client.db('GoBeyond').collection('bookings');

        // --- Auth Related API (JWT) ---
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: true, 
                sameSite: 'none',
            }).send({ success: true });
        });

        app.post('/logout', async (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 0
            }).send({ success: true });
        });

        // --- Tour Package APIs ---
  
        app.get('/tourpackages', async (req, res) => {
            const result = await tourCollection.find().toArray();
            res.send(result);
        });

        app.get('/tourpackages/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await tourCollection.findOne(query);
            res.send(result);
        });

        app.post('/tourpackages', async (req, res) => {
            const packageData = req.body;
            const newPackage = {
                ...packageData,
                bookingCount: 0,
                created_at: new Date()
            };
            const result = await tourCollection.insertOne(newPackage);
            res.send(result);
        });

        app.get('/myPackages', async (req, res) => {
            const email = req.query.email;
            if (!email) return res.status(400).send({ message: "Email is required" });
            const query = { guide_email: email };
            const result = await tourCollection.find(query).toArray();
            res.send(result);
        });

        app.patch('/updateTourPackage/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedData = req.body;
            const updateDoc = { $set: { ...updatedData } };
            const result = await tourCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.delete('/tourpackages/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await tourCollection.deleteOne(query);
            res.send(result);
        });

        // --- Booking APIs ---
        app.post('/bookings', async (req, res) => {
            const bookingData = req.body;
            const newBooking = {
                ...bookingData,
                status: 'pending',
                booking_date: new Date()
            };
            
          
            const bookingResult = await bookingCollection.insertOne(newBooking);
            const filter = { _id: new ObjectId(bookingData.tour_id) };
            const updateDoc = { $inc: { bookingCount: 1 } };
            await tourCollection.updateOne(filter, updateDoc);
            
            res.send(bookingResult);
        });

        app.get('/myBookings', async (req, res) => {
            const email = req.query.email;
            if (!email) return res.status(400).send({ message: "Email is required" });
            
            const result = await bookingCollection.aggregate([
                { $match: { buyer_email: email } },
                { $addFields: { tourObjectId: { $toObjectId: "$tour_id" } } },
                {
                    $lookup: {
                        from: "tourpackages",
                        localField: "tourObjectId",
                        foreignField: "_id",
                        as: "packageInfo"
                    }
                },
                { $unwind: "$packageInfo" },
                {
                    $project: {
                        _id: 1, status: 1, booking_date: 1, buyer_contact: 1, notes: 1,
                        tour_name: "$packageInfo.tour_name",
                        destination: "$packageInfo.destination",
                        departure_location: "$packageInfo.departure_location",
                        departure_date: "$packageInfo.departure_date",
                        guide_name: "$packageInfo.guide_name"
                    }
                }
            ]).toArray();
            res.send(result);
        });

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: 'completed' } };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        console.log("Connected to MongoDB!");
    } finally { }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Go Beyond Server is Running');
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});