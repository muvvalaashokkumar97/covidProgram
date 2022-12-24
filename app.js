const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(8080, () => {
      console.log(dbPath);
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbObjectToResponseObject = (dbObject, key) => {
  if (key == "state") {
    return {
      stateId: dbObject.state_id,
      stateName: dbObject.state_name,
      population: dbObject.population,
    };
  } else if (key == "district") {
    return {
      districtId: dbObject.district_id,
      districtName: dbObject.district_name,
      stateId: dbObject.state_id,
      cases: dbObject.cases,
      cured: dbObject.cured,
      active: dbObject.active,
      deaths: dbObject.deaths,
    };
  } else if (key == "stats") {
    return {
      totalCases: dbObject["total_cases"],
      totalCured: dbObject["total_cured"],
      totalActive: dbObject["total_active"],
      totalDeaths: dbObject["total_deaths"],
    };
  }
};

app.get("/states/", async (request, response) => {
  const getAllStates = `select * from state;`;
  const result = await db.all(getAllStates);
  const states = result.map((state) => {
    return {
      stateId: state.state_id,
      stateName: state.state_name,
      population: state.population,
    };
  });
  response.send(states);
});

app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getState = `select * from state where state_id = ${stateId};`;
  const result = await db.get(getState);
  response.send(convertDbObjectToResponseObject(result, "state"));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addState = `insert into 
  district (district_name,state_id,cases,cured,active,deaths)
  values ('${districtName}',
  ${stateId},
  ${cases},
  ${cured},
  ${active},
  ${deaths});`;
  await db.run(addState);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = `
  select * from district where district_id = ${districtId}`;
  const districtResult = await db.get(districtDetails);
  response.send(convertDbObjectToResponseObject(districtResult, "district"));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDeleted = `
  delete from district where district_id = ${districtId}`;
  await db.run(districtDeleted);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictDetails = `
  UPDATE district
  set
  district_name = '${districtName}',
  state_id =${stateId},
  cases =${cases},
  cured =${cured},
  active = ${active},
  deaths = ${deaths}
  where district_id = ${districtId}`;
  await db.run(updateDistrictDetails);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStats = `select sum(cases) as total_cases,sum(cured) as total_cured, sum(active) as total_active, sum(deaths) as total_deaths from district where state_id = ${stateId}`;
  const result = await db.get(getStats);
  //   response.send(result[0]);
  response.send(convertDbObjectToResponseObject(result, "stats"));
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictList = `select state_name from district inner join state on district.state_id = state.state_id where district_id = ${districtId}`;
  const result = await db.get(getDistrictList);
  //   response.send(result);
  //   console.log(result);
  response.send({
    stateName: result.state_name,
  });
});

module.exports = app;
