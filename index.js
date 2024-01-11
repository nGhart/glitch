const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { createLog } = require("./controller/logController");
const { PORT, MONGO_URI } = process.env;

const app = express();
app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.send("Hello");
});

app.get("*", function (req, res) {
  res.status(404).json("Page not found");
});

//webhooks
const token = process.env.WHATSAPP_TOKEN;

const subscribe = (data) => {
  console.log("subscribe ", data.from);
};
const unsubscribe = (data) => {
  console.log("unsubscribe ", data.from);
};

app.get("/webhook", (req, res) => {
  const verify_token = process.env.VERIFY_TOKEN;

  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// async function handleDeliveryStatus(entry) {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       const {
//         id,
//         changes: [{ value: { metadata = {}, statuses = [{}] } = {} } = {}] = [],
//       } = entry;

//       if (!id || !metadata.phone_number_id || !statuses[0]) {
//         console.error("Invalid delivery status data");
//         reject(new Error("Invalid delivery status data"));
//       }

//       const { phone_number_id } = metadata;
//       const { id: status_id, status, timestamp, recipient_id } = statuses[0];

//       const logData = {
//         phoneId: phone_number_id,
//         msisdn: recipient_id,
//         status_id,
//         status,
//         datesent: timestamp,
//       };
//       createLog(logData)
//         .then(() => {
//           console.log("added");
//         })
//         .catch((error) => {
//           console.log("error");
//         });
//       // console.log(
//       //   "del",
//       //   // "entry id:",
//       //   // id,
//       //   "phone_number_id:",
//       //   phone_number_id,
//       //   "recipient_id:",
//       //   recipient_id,
//       //   "status_id:",
//       //   status_id,
//       //   "status:",
//       //   status,
//       //   "timestamp:",
//       //   timestamp
//       // );
//       resolve();
//     }, 1000);
//   });
// }

async function handleDeliveryStatus(entry) {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const {
          id,
          changes: [
            { value: { metadata = {}, statuses = [{}] } = {} } = [],
          ] = [],
        } = entry;

        if (!id || !metadata.phone_number_id || !statuses[0]) {
          console.error("Invalid delivery status data");
          reject(new Error("Invalid delivery status data"));
        }

        const { phone_number_id } = metadata;
        const { id: status_id, status, timestamp, recipient_id } = statuses[0];

        const logData = {
          msisdn: recipient_id,
          status_id,
          datesent: timestamp,
          status,
          phoneId: phone_number_id,
        };

        await createLog(logData);
        resolve();
      } catch (error) {
        console.error("Error adding to the database:", error);
        reject(error);
      }
    }, 1000);
  });
}

function handleReceivedMessage(entry) {
  const {
    changes: y[{ value: { metadata = {}, messages = [{}] } = {} } = {}],
  } = entry;

  if (!metadata.phone_number_id || !messages[0]) {
    console.error("Invalid received message data");
    return;
  }

  const { phone_number_id } = metadata;
  const {
    from,
    text: { body: msg_body },
  } = messages[0];

  function formatText(text) {
    const formattedText = text.trim().toUpperCase();
    return formattedText;
  }
  //const subscribeData = from;

  const textMessage = formatText(msg_body);

  if (textMessage === "START WSH") {
    // console.log("From:", from, "Message Body:", msg_body, " subscribe user");
    subscribe({ from });
  } else if (textMessage === "STOP WSH") {
    unsubscribe({ from });
    // console.log("From:", from, "Message Body:", msg_body, " remove user user");
  } else {
    console.log("Take no subscription action");
  }
}
app.post("/webhook", async (req, res) => {
  //req.body.onject
  console.log(JSON.stringify(req.body, null, 2));
  try {
    const body = req.body;

    if (
      !body.object ||
      !body.entry ||
      !body.entry[0].changes ||
      !body.entry[0].changes[0].value
    ) {
      return res.sendStatus(404);
    }

    const entry = body.entry[0];
    const change = entry.changes[0].value;

    if (change.statuses) {
      await handleDeliveryStatus(entry);
    }

    if (change.messages) {
      await handleReceivedMessage(entry);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error("Error:", error.message);
    res.sendStatus(500);
  }
});

mongoose
  .connect(
    "mongodb+srv://naaghart:naaghart@textmessages.mhqosfq.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => {
    const PORT = 5000;
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
    console.log("Connected to DB");
  })
  .catch((error) => {
    console.log("Connection failed" + error);
  });
