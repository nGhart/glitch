const Log = require("../models/log");

const createLog = async (data) => {
  try {
    const { msisdn, phoneId, status_id, status, datesent } = data;
    const log = await Log.create({
      msisdn,
      phoneId,
      status_id,
      status,
      datesent,
    });
    console.log("created");
  } catch (error) {
    throw error;
  }
};

module.exports = { createLog };
