# AutoFix Garage API — Beginner Version

This version keeps the assignment requirements and uses the course topics from Node.js and Express, SQLite, REST APIs, and validation. The code uses plain JavaScript, CommonJS require, straightforward if checks, small route files, and readable SQL.

## Start the API

Install Node.js 20 or later. In a terminal opened in this folder, run:

```powershell
npm install
npm start
```

The server listens at http://localhost:3000. It creates data/autofix.sqlite and inserts three sample mechanics, bays, and assignments the first time it runs. Stop it with Ctrl+C.

Run the automated API checks with:

```powershell
npm test
```

## Syllabus fit

| Course topic                                     | Where it appears                                           |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Node.js, NPM, and HTTP server                    | server.js, package.json                                    |
| Express, JSON requests, routes, and status codes | src/app.js and src/routes/                                 |
| SQLite tables, keys, and constraints             | src/database.js                                            |
| Parameterized SQL and CRUD                       | all three files in src/routes/                             |
| Query parameter and request validation           | src/routes/bays.js, src/helpers.js                         |
| SQL JOIN                                         | GET /assignments/with-details in src/routes/assignments.js |
| API testing                                      | test/api.test.js and the Postman collection                |

The assignment brief does not request user accounts or protected routes. This version therefore does not add registration, passwords, JWTs, or authentication middleware from Module 4; adding those would introduce requirements that are not in the brief.

## Folder map

```text
server.js                  Starts the API and opens SQLite
src/app.js                 Express setup and route mounting
src/database.js            Creates the three tables and sample data
src/helpers.js             Small, reusable validation functions
src/routes/bays.js          Bay CRUD and vehicle search
src/routes/mechanics.js     Mechanic CRUD
src/routes/assignments.js   Assignment CRUD and SQL JOIN
test/api.test.js            Automated API checks
postman/                    Importable Postman collection
```

## Database tables

- mechanics: mechanic name and specialty.
- bays: bay name and vehicle type. Vehicle must be exactly Car, Bike, or Truck.
- assignments: a mechanic ID, bay ID, job description, and status. The two foreign keys connect it to the other tables.

SQL question mark placeholders (?) are used in commands, and their values are passed separately in an array. This keeps submitted text as data rather than SQL code.

## API routes

| Method                 | Path                              | What it does                               |
| ---------------------- | --------------------------------- | ------------------------------------------ |
| GET                    | /                                 | Welcome message and route summary          |
| GET                    | /health                           | Simple health check                        |
| GET                    | /bays                             | List all bays                              |
| GET                    | /bays?vehicle=Car                 | Search bays by vehicle                     |
| GET                    | /bays/:id                         | Read one bay                               |
| POST                   | /bays                             | Add a bay                                  |
| PUT                    | /bays/:id                         | Update a bay                               |
| DELETE                 | /bays/:id                         | Delete an unused bay                       |
| GET, POST, PUT, DELETE | /mechanics and /mechanics/:id     | Mechanic CRUD                              |
| GET, POST, PUT, DELETE | /assignments and /assignments/:id | Assignment CRUD                            |
| GET                    | /assignments/with-details         | Join assignments to mechanic and bay names |

Bay JSON example for POST and PUT:

```json
{
  "name": "North Service Bay",
  "vehicle": "Car"
}
```

Assignment JSON example:

```json
{
  "mechanicId": 1,
  "bayId": 1,
  "jobDescription": "Inspect the brakes",
  "status": "Pending"
}
```

The API returns 201 when it creates a record, 200 when a request succeeds, 400 for invalid input, 404 when a record is missing, 409 when a mechanic or bay is still assigned to a job, and 500 for an unexpected server error.

## Required vehicle checks

The supplied Postman collection starts with these three cases:

1. POST /bays with { "name": "Twist Test Bay", "vehicle": "Car" } returns 201.
2. POST /bays with { "name": "Invalid Test Bay", "vehicle": "Other" } returns 400 and lists Car, Bike, and Truck.
3. PUT /bays/{{carBayId}} with { "name": "Twist Test Bay", "vehicle": "Bike" } returns 200.

To run them manually, select Body → raw → JSON in Postman and use Content-Type: application/json. The collection automatically saves the ID from the first request for the update request.

## Understanding one route

For example, POST /bays in src/routes/bays.js follows this sequence:

1. Read name and vehicle from the JSON request body.
2. Check the name and allowed vehicle list.
3. Insert the bay using SQL with ? placeholders.
4. Read back the row SQLite created.
5. Return JSON with HTTP status 201.

The other create and update routes use this same pattern. The joined assignment route uses SQL JOIN to read the mechanic name and bay name together with the assignment.

## Five-member presentation split

1. Server and Express routes: explain server.js and src/app.js.
2. Database: explain the three tables, IDs, foreign keys, and sample rows.
3. Bays: explain bay create/read/update/delete and vehicle search.
4. Mechanics and assignments: explain CRUD, validation, and the SQL join.
5. Postman and documentation: run the three required tests and explain the responses.

Every group member should run the project and be able to explain the request flow before the demo.
