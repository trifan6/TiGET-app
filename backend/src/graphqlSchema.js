const { getEventById } = require("./controllers/eventController");
const { events } = require("./data/store");
const { logUserAction } = require("./utils/logger");
const { prisma } = require("./utils/db");

const reviewsData = [];

const typeDefs = `#graphql
  type Review {
    id: ID!
    eventId: ID!
    author: String!
    rating: Int!
    text: String!
  }

  type Event {
    id: ID!
    name: String!
    description: String
    category: String
    lineup: [String]
    thumbnail: String
    gallery: [String]
    date: String
    startTime: String
    duration: String
    location: String
    ageRestriction: String
    price: Int
    capacity: Int
    sold: Int
    reviews: [Review] 
  }

  type PaginatedEvents {
    data: [Event]
    totalPages: Int
    currentPage: Int
  }

  input EventInput {
    name: String!
    description: String
    category: String
    lineup: [String]
    thumbnail: String
    gallery: [String]
    date: String
    startTime: String
    duration: String
    location: String
    ageRestriction: String
    price: Int
    capacity: Int
    sold: Int
    organiserId: Int
    reviews: [String]
  }

  type EventList {
    data: [Event!]!
    total: Int!
    totalPages: Int
  }

  type Query {
    getEvents(page: Int, limit: Int, sortBy: String, category: String, organiserId: ID): EventList!
    getEventById(id: ID!): Event
    getObservations: [Observation]
  }

  type Permission {
    id: ID!
    name: String!
  }

  type Role {
    id: ID!
    name: String!
    permissions: [Permission]
  }

  type User {
    id: ID!
    email: String!
    name: String!
    role: Role
  }

  type Mutation {
    createEvent(input: EventInput!): Event
    updateEvent(id: ID!, input: EventInput!): Event
    deleteEvent(id: ID!): Boolean
    addReview(eventId: ID!, author: String!, rating: Int!, text: String!): Review
    login(email: String!, password: String!): User
  }

  type Observation {
  id: ID!
  userId: ID!
  reason: String!
  detectedAt: String!
  user: User
  }
`;

const resolvers = {
  Event: {
    reviews: async (parentEvent) => {
      return await prisma.review.findMany({
        where: { eventId: Number(parentEvent.id) },
      });
    },
  },

  Query: {
    getEvents: async (_, args) => {
      const { page = 1, limit = 10, sortBy, category, organiserId } = args;

      const where = {};
      if (category && category !== "All") {
        where.category = category;
      }

      if (organiserId) {
        where.organiserId = parseInt(organiserId);
      }

      const skip = (page - 1) * limit;

      const orderBy = {};
      if (sortBy === "price-asc") orderBy.price = "asc";
      else if (sortBy === "price-desc") orderBy.price = "desc";
      else if (sortBy === "date-asc") orderBy.date = "asc";
      else if (sortBy === "date-desc") orderBy.date = "desc";
      else orderBy.createdAt = "desc";

      const totalCount = await prisma.event.count({ where });
      const events = await prisma.event.findMany({
        where,
        take: limit,
        skip: skip,
        orderBy,
      });

      return {
        data: events,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      };
    },

    getEventById: async (_, { id }) => {
      return await prisma.event.findUnique({
        where: { id: Number(id) },
      });
    },

    getObservations: async () => {
      return await prisma.observation.findMany({
        include: { user: true },
        orderBy: { detectedAt: "desc" },
      });
    },
  },

  Mutation: {
    createEvent: async (_, { input }, context) => {
      const userId = context.req?.cookies?.user_id;
      const newEvent = await prisma.event.create({
        data: {
          ...input,
          sold: input.sold || 0,
        },
      });

      if (userId) await logUserAction(userId, `CREATED_EVENT_${newEvent.id}`);
      return newEvent;
    },

    updateEvent: async (_, { id, input }, context) => {
      try {
        const userId = context.req?.cookies?.user_id;
        const { reviews, ...prismaSafeData } = input;

        const updatedEvent = await prisma.event.update({
          where: { id: parseInt(id) },
          data: prismaSafeData,
        });

        if (userId) await logUserAction(userId, `UPDATED_EVENT_${id}`);
        return updatedEvent;
      } catch (error) {
        console.error("PRISMA CRASHED:", error);
        throw new Error("Event not found or failed to update");
      }
    },

    deleteEvent: async (_, { id }, context) => {
      try {
        const userId = context.req?.cookies?.user_id;
        await prisma.event.delete({
          where: { id: Number(id) },
        });

        if (userId) await logUserAction(userId, `DELETED_EVENT_${id}`);
        return true;
      } catch (error) {
        return false;
      }
    },

    addReview: async (_, { eventId, author, rating, text }, context) => {
      const userId = context.req?.cookies?.user_id;
      const newReview = await prisma.review.create({
        data: {
          eventId: Number(eventId),
          author,
          rating,
          text,
        },
      });

      if (userId)
        await logUserAction(userId, `ADDED_REVIEW_FOR_EVENT_${eventId}`);
      return newReview;
    },

    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("Invalid email or user does not exist.");
      }
      if (user.password !== password) {
        throw new Error("Invalid password.");
      }

      // We know exactly who logged in here, so we don't need cookies for this one!
      await logUserAction(user.id, "USER_LOGIN");
      return user;
    },
  },
};

module.exports = { typeDefs, resolvers };
