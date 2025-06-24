const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://marathon-management-syst-9bb4a.web.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.MMS_DB_USER}:${process.env.MMS_DB_PASS}@cluster0.actwx8z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//jwt middlewares
const verifyFireBaseToken = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).send({ message: "Unauthorized Access!" })
  }; 

  const token = authHeader.split(' ')[1];

  try{
    const decoded = await admin.auth().verifyIdToken(token)
    // console.log("decoded token", decoded)
    req.decoded = decoded;
    next();
  }catch(err){
    return res.status(401).send({ message: "Unauthorized Access!" })
  }
};

const verifyTokenEmail = (req, res, next) => {
  if(req.query.email !== req.decoded.email){
        return res.status(403).message({message: "forbidden access"})
      }
      next();
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const marathonCollection = client
      .db("Marathon-Management-System")
      .collection("Marathon");
    const marathonApplications = client
      .db("Marathon-Management-System")
      .collection("MarathonApply");

    //marathon api

    // show marathon on home
    app.get("/homeMarathons", async (req, res) => {
      const result = await marathonCollection.find().limit(6).toArray();
      res.send(result);
    });

    // get single marathon on marathon details page
    app.get("/allMarathon/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonCollection.findOne(query);
      res.send(result);
    });

    // add marathon
    app.post("/marathonAdd", async (req, res) => {
      const marathon = req.body;
      const result = await marathonCollection.insertOne(marathon);
      res.send(result);
    });

    // marathon application
    app.post("/marathonApplication", async (req, res) => {
      const appliedMarathon = req.body;
      const result = await marathonApplications.insertOne(appliedMarathon);
      res.send(result);
    });

    // get my marathon apply lists
    app.get("/marathonApplication/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonApplications.findOne(query);
      res.send(result);
    });

    // get apply marathon lists
    app.get("/marathonApplication", verifyFireBaseToken, verifyTokenEmail, async (req, res) => {
      const query = req.query.email ? { email: req.query.email } : {};

      const email = req.query.email; 
      if(email !== req.decoded.email){
        return res.status(403).message({message: "forbidden access"})
      }
      
      const result = await marathonApplications.find(query).toArray();
      res.send(result);
    });

    // update item on my apply list
    app.put("/marathonApplication/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedRegInfo = req.body;
      const updatedReg = {
        $set: {
          firstName: updatedRegInfo.firstName,
          lastName: updatedRegInfo.lastName,
          title: updatedRegInfo.title,
          startDate: updatedRegInfo.firstName.startDate,
          phoneNumber: updatedRegInfo.phoneNumber,
          location: updatedRegInfo.location,
          description: updatedRegInfo.description,
          additionalInfo: updatedRegInfo.additionalInfo,
          image: updatedRegInfo.image,
        },
      };
      const result = marathonApplications.updateOne(filter, updatedReg, option);
      res.send(result);
    });

    // delete item from my apply list
    app.delete("/marathonApplication/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonApplications.deleteOne(query);
      res.send(result);
    });

    // show all marathon on marathon page
    app.get("/getMarathon", async(req, res) => {
      const query = req.query.email ? { email: req.query.email } : {};

      const sortOrder = req.query.sort === "desc" ? 1 : -1;
      const result = await marathonCollection
        .find(query)
        .sort({ createdAt: sortOrder })
        .toArray();
      res.send(result);
    });

    // get add marathon lists
    app.get("/marathons", verifyFireBaseToken, verifyTokenEmail, async (req, res) => {
      const query = req.query.email ? { email: req.query.email } : {};

      const sortOrder = req.query.sort === "desc" ? 1 : -1;
      const result = await marathonCollection
        .find(query)
        .sort({ createdAt: sortOrder })
        .toArray();
      res.send(result);
    });

    // update add marathon
    app.put("/marathons/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedReg = req.body;
      const updatedMarathon = {
        $set: {
          registrationCount: updatedReg?.registrationCount + 1,
          title: updatedReg.title,
          location: updatedReg.location,
          startDate: updatedReg.startDate,
          distance: updatedReg.distance,
          description: updatedReg.description,
          registrationStart: updatedReg.registrationStart,
          registrationEnd: updatedReg.registrationEnd,
          image: updatedReg.image,
        },
      };
      const result = await marathonCollection.updateOne(
        filter,
        updatedMarathon,
        option
      );
      res.send(result);
    });

    // delete marathon item from marathon lists
    app.delete("/marathons/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonCollection.deleteOne(query);
      res.send(result);
    });

    // get item by search
    app.get("/allMarathon", async (req, res) => {
      try {
        const { title } = req.query;

        let query = {};

        if (title) {
          query.title = { $regex: new RegExp(title, "i") };
        }

        const marathons = await Marathon.find(query);
        res.json(marathons);
      } catch (error) {
        console.error("Error fetching marathons:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Marathon-Management-System-server-running");
});

app.listen(port, () => {
  // console.log(`Marathon-Management-System-server is running on port ${port}`);
});
