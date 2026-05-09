jest.mock(
  "@faker-js/faker",
  () => ({
    faker: {},
  }),
  { virtual: true },
);

const request = require("supertest");
const app = require("../src/server");

describe("TiGET Complete Backend Test Suite", () => {
  let testEventId;

  describe("REST Endpoints", () => {
    it("should return 200 for the /api/ping health check", async () => {
      const response = await request(app).get("/api/ping");
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe("TiGET is alive");
    });

    it("should successfully start the Faker Bot", async () => {
      const response = await request(app).post("/api/faker/start");
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe("Faker bot started!");
    });

    it("should reject starting the bot if it is already running", async () => {
      const response = await request(app).post("/api/faker/start");
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Bot is already running!");
    });

    it("should successfully stop the Faker Bot", async () => {
      const response = await request(app).post("/api/faker/stop");
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe("Faker bot stopped.");
    });
  });

  describe("GraphQL Endpoints", () => {
    it("1. [CREATE] should create a new event via Mutation", async () => {
      const response = await request(app)
        .post("/graphql")
        .send({
          query: `
                mutation CreateEvent($input: EventInput!) {
                    createEvent(input: $input) {
                        id
                        name
                        price
                    }
                }
            `,
          variables: {
            input: {
              name: "Jest Festival 2026",
              category: "Festival",
              price: 150,
              capacity: 10000,
              sold: 0,
            },
          },
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.createEvent.name).toBe("Jest Festival 2026");

      testEventId = response.body.data.createEvent.id;
    });

    it("2. [READ] should fetch paginated events via Query", async () => {
      const response = await request(app)
        .post("/graphql")
        .send({
          query: `
                query {
                    getEvents(page: 1, limit: 5) {
                        data { id name }
                        totalPages
                        currentPage
                    }
                }
            `,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.getEvents.data.length).toBeGreaterThan(0);
      expect(response.body.data.getEvents.currentPage).toBe(1);
    });

    it("3. [UPDATE] should modify an existing event via Mutation", async () => {
      const response = await request(app)
        .post("/graphql")
        .send({
          query: `
                mutation UpdateEvent($id: ID!, $input: EventInput!) {
                    updateEvent(id: $id, input: $input) {
                        id
                        name
                        price
                    }
                }
            `,
          variables: {
            id: testEventId,
            input: { name: "Jest Festival VIP Edition", price: 300 },
          },
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.updateEvent.name).toBe(
        "Jest Festival VIP Edition",
      );
      expect(response.body.data.updateEvent.price).toBe(300); 
    });

    it("4. [1-TO-MANY] should add a review to the event via Mutation", async () => {
      const response = await request(app)
        .post("/graphql")
        .send({
          query: `
                mutation AddReview($eventId: ID!, $author: String!, $rating: Int!, $text: String!) {
                    addReview(eventId: $eventId, author: $author, rating: $rating, text: $text) {
                        id
                        author
                        rating
                    }
                }
            `,
          variables: {
            eventId: testEventId,
            author: "Test Engineer",
            rating: 5,
            text: "Flawless API design.",
          },
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.addReview.author).toBe("Test Engineer");
      expect(response.body.data.addReview.rating).toBe(5);
    });

    it("5. [GRAPH RESOLUTION] should fetch a single event AND its nested reviews", async () => {
      const response = await request(app)
        .post("/graphql")
        .send({
          query: `
                 query GetEvent($id: ID!) {
                    getEvent(id: $id) {
                        id
                        name
                        reviews {
                        author
                        rating
                        }
                    }
                }
            `,
          variables: { id: testEventId },
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.getEvent.name).toBe(
        "Jest Festival VIP Edition",
      );

      expect(response.body.data.getEvent.reviews[0].author).toBe(
        "Test Engineer",
      );
    });

    it("6. [DELETE] should delete the event via Mutation", async () => {
      const response = await request(app)
        .post("/graphql")
        .send({
          query: `
                        mutation DeleteEvent($id: ID!) {
                            deleteEvent(id: $id)
                        }
                    `,
          variables: { id: testEventId },
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.deleteEvent).toBe(true);
    });
  });
});
