# QueueLess Lite — Campus Service Queue Tracker

Students waste time at campus offices because they can't tell how long the queue is.
QueueLess Lite hands out **digital tokens** for campus counters (fee payment, exam cell, library and so on) and shows a
**live dashboard** with each student's position and **estimated waiting time**.

**Stack:** MongoDB · Express (Node.js) · React (Vite)

---

## Differentiating feature: wait-time estimation

The estimate comes from the **number of people ahead** and the **average service duration**:

```
estimated wait = (people ahead ÷ open counters) × average minutes per person
                 + remaining time of the person currently at the counter   (only when every counter is busy)
```

- **The average corrects itself.** Each service starts with a configured average (for example 6 min at the Exam Cell).
  Once **3 or more people have been served today**, the system switches to the real average of the last 20
  services, which it measures from the time each token was called to the time it was finished.
- **It handles several counters.** A queue served by 2 counters moves twice as fast.
- **It is shown to the student.** The UI says whether the estimate uses the default or today's real data, shows the
  expected call time, and updates every 5 seconds.

The logic lives in [server/src/utils/estimate.js](server/src/utils/estimate.js) and has unit tests.

---

## Features

**Students**
- A dashboard of all services with queue length, who is being served, and a colour-coded wait estimate
- Join a queue (name, student ID, purpose) with client- and server-side validation
- A live token page showing position, people ahead, estimated wait, expected call time and a progress bar
- "It's your turn" alert with counter number, tab-title change and vibration on phones
- Leave the queue, which requires your student ID
- "Find my token" by student ID. Tokens are also remembered on the device.

**Staff** (`/staff`, protected by a PIN)
- Counter cards with **Call next**, **Done** and **No-show** buttons
- The waiting list with names and IDs, and a button to remove someone
- Open or close a queue, or reset it
- Create, edit and delete services (name, token code, location, average minutes, number of counters)

**Engineering**
- REST API with consistent JSON errors: `{ error, details: [{ field, message }] }`
- Validation for bodies, ObjectIds, duplicates (409), closed services (409) and unknown routes (404)
- Atomic token numbering that restarts each day (`FEE-001`, `FEE-002` and so on)
- Atomic "call next", so two staff clicks never call the same student
- One active token per student per service
- Responsive layout for phones and desktops, with light and dark mode

---

## Running it

Requirements: **Node.js 18+**, and **MongoDB** (local or Atlas). MongoDB is optional; see the in-memory option below.

```bash
npm run install:all
```

```bash
cp server/.env.example server/.env
```

Edit `server/.env` to set `MONGO_URI` (and change `STAFF_PIN`), then:

```bash
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000/api

On first start the database is seeded with 4 sample campus services. Default staff PIN: `1234`.

**No MongoDB installed?** Run with a throwaway in-memory database. The first run downloads a MongoDB binary of about 600 MB.

```bash
npm run dev:memory
```

**Production build** (Express serves the built React app on one port):

```bash
npm run build
```

```bash
npm start
```

**Tests** (API and estimation logic, using an in-memory MongoDB):

```bash
npm test
```

**Reset the database to the sample data:**

```bash
npm run seed --prefix server
```

---

## REST API

| Method | Endpoint | Who | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | public | API and database status |
| GET | `/api/services` | public | All services with live stats (`waitingCount`, `nowServing`, `estimatedWaitMinutes`, `avgServiceMinutes`, `avgSource`) |
| GET | `/api/services/:id` | public | One service with stats |
| POST | `/api/services/:id/tokens` | public | Join the queue. Body: `{ studentName, studentId, purpose? }` |
| GET | `/api/tokens/:id` | public | Token status, `position`, `peopleAhead`, `estimatedWaitMinutes`, `estimatedCallAt` |
| GET | `/api/tokens/lookup?studentId=` | public | A student's active tokens |
| PATCH | `/api/tokens/:id/cancel` | public | Leave the queue. Body: `{ studentId }` |
| POST | `/api/services` | staff | Create a service |
| PUT | `/api/services/:id` | staff | Update a service (partial) |
| DELETE | `/api/services/:id` | staff | Delete a service (blocked while people are queued) |
| GET | `/api/services/:id/queue` | staff | Full waiting and serving lists |
| POST | `/api/services/:id/call-next` | staff | Finish the current person and call the next. Body: `{ counter? }` |
| POST | `/api/services/:id/reset` | staff | Cancel all active tokens |
| PATCH | `/api/tokens/:id/complete` | staff | Mark a serving token as completed |
| PATCH | `/api/tokens/:id/skip` | staff | Mark a token as a no-show or remove it |

Staff endpoints need the header `x-staff-pin: <STAFF_PIN>`.

Status codes: `200/201/204` success · `400` validation · `401` bad PIN · `403` student ID mismatch · `404` not found · `409` conflict (duplicate, closed, already finished) · `500` server error.

---

## Project structure

```
├── package.json              # root scripts (runs both apps together)
├── server/                   # Node.js + Express + Mongoose
│   ├── src/
│   │   ├── index.js          # startup: env, DB connection, seed, listen
│   │   ├── app.js            # express app, routes, static client in production
│   │   ├── config/db.js      # MongoDB connection (or in-memory)
│   │   ├── models/           # Service, Token
│   │   ├── routes/           # services.js, tokens.js
│   │   ├── services/queueService.js   # stats, positions, token numbering
│   │   ├── utils/estimate.js # ⭐ wait-time estimation
│   │   ├── utils/validate.js # request validation
│   │   ├── middleware/       # error handler, staff PIN guard
│   │   └── seed.js
│   └── test/api.test.js
└── client/                   # React + Vite
    └── src/
        ├── pages/            # Dashboard, JoinQueue, TrackToken, FindToken, StaffConsole
        ├── components.jsx, hooks.js (polling, saved tokens), api.js, format.js
        └── styles.css        # responsive styles, light and dark
```
