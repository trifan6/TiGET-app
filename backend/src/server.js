require('dotenv').config(); 
const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws"); 
const { faker } = require("@faker-js/faker");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express4"); 
const { typeDefs, resolvers } = require("./graphqlSchema");
const { events } = require("./data/store");
const eventRoutes = require("./routes/eventRoutes");
const chatRoutes = require('./routes/chatRoutes');
const Message = require('./models/message');
const mongoose = require('mongoose');
const { logUserAction } = require('./utils/logger');
const cookieParser = require("cookie-parser");
const https = require("https");
const fs = require("fs");

mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log('🟢 Connected to MongoDB (Chat Database)'))
  .catch((err) => console.error('🔴 MongoDB Connection Error:', err));

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser()); 

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/tiget-ws" });

const activeUsers = new Map();

wss.on('connection', (ws) => {
  console.log('🟢 New WebSocket connection established');
  let currentUserId = null;

  ws.on('message', async (messageData) => {
    try {
      const parsedMessage = JSON.parse(messageData);

      if (parsedMessage.type === 'register') {
        currentUserId = String(parsedMessage.userId);
        activeUsers.set(currentUserId, ws);
        console.log(`📞 User ${currentUserId} is online and listening.`);
      }

      if (parsedMessage.type === 'private_message') {
        const { senderId, receiverId, text } = parsedMessage.payload;

        const newMsg = await Message.create({
          senderId: String(senderId),
          receiverId: String(receiverId),
          text: text
        });

        await logUserAction(senderId, `SENT_MESSAGE_TO_${receiverId}`);


        const receiverSocket = activeUsers.get(String(receiverId));
        
        if (receiverSocket && receiverSocket.readyState === 1) { 
          receiverSocket.send(JSON.stringify({
            type: 'new_message',
            payload: newMsg
          }));
        }

        ws.send(JSON.stringify({
          type: 'message_sent',
          payload: newMsg
        }));
      }

    } catch (error) {
      console.error('WebSocket Message Error:', error);
    }
  });

  ws.on('close', () => {
    if (currentUserId) {
      activeUsers.delete(currentUserId);
      console.log(`🔌 User ${currentUserId} disconnected.`);
    }
  });
});

let fakerInterval = null;

app.post("/api/faker/start", (req, res) => {
  if (fakerInterval) {
    return res.status(400).json({ message: "Bot is already running!" });
  }

  console.log("🤖 Faker Bot Started...");

  fakerInterval = setInterval(() => {
    const newFakeEvent = {
      id: `bot-${faker.string.uuid().slice(0, 5)}`,
      name: `${faker.music.genre()} Explosion ${faker.location.city()}`,
      description: faker.lorem.sentence(),
      category: faker.helpers.arrayElement([
        "Festival",
        "Concert",
        "Theater",
        "Sports",
      ]),
      lineup: [faker.person.fullName(), faker.person.fullName()],
      thumbnail: faker.image.url(),
      gallery: [],
      date: faker.date.future().toISOString().split("T")[0],
      startTime: "20:00",
      duration: "1 Night",
      location: faker.location.streetAddress(),
      ageRestriction: "18+",
      price: faker.number.int({ min: 50, max: 400 }),
      capacity: faker.number.int({ min: 500, max: 10000 }),
      sold: faker.number.int({ min: 0, max: 500 }),
    };

    events.push(newFakeEvent);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(
          JSON.stringify({ type: "new_fake_event", payload: newFakeEvent }),
        );
      }
    });
    console.log(`📻 Broadcasted: ${newFakeEvent.name}`);
  }, 3000);

  res.status(200).json({ message: "Faker bot started!" });
});

app.post("/api/faker/stop", (req, res) => {
  clearInterval(fakerInterval);
  fakerInterval = null;
  console.log("🛑 Faker Bot Stopped.");
  res.status(200).json({ message: "Faker bot stopped." });
});

app.get("/api/ping", (req, res) =>
  res.status(200).json({ message: "TiGET is alive" }),
);

app.use("/api/events", eventRoutes);
app.use('/api/chat', chatRoutes);

async function startServer() {
  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();

  app.use(
    "/graphql",
    cors(),
    express.json(),
    (req, res, next) => {
      if (!req.body) req.body = {}; 
      next();
    },
    expressMiddleware(apolloServer, {
       context: async ({ req, res }) => ({ req, res }), 
    }),
  );

  if (process.env.NODE_ENV !== "test") {
    // We create a fake "dummy" certificate on the fly for the university lab
    const crypto = require('crypto');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    
    // Fallback to standard HTTP if you ever remove the HTTPS requirement
    try {
       // Note: In a real production app, you'd load real keys like fs.readFileSync('key.pem')
       // For a local university demo, we will bypass strict certs by letting Express run standard HTTP 
       // AND WE WILL RELY ON A CHROME SETTING FOR THE DEMO (See explanation below!)
       const server = http.createServer(app);
       server.listen(PORT, "0.0.0.0", () => {
         console.log(`🚀 REST & WebSockets running on Port ${PORT}`);
         console.log(`🌌 GraphQL API running on Port ${PORT}/graphql`);
         console.log(`🔒 MAKE SURE TO ALLOW INSECURE LOCALHOST IN CHROME!`);
       });
    } catch(e) {
       console.log("Server failed to start:", e);
    }
  }
}

startServer();

module.exports = app;
