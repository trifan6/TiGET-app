const { getEventById } = require("./controllers/eventController");
const { events } = require("./data/store");
const { logUserAction } = require("./utils/logger");
const { prisma } = require("./utils/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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

  type AuthPayload {
    token: String!
    user: User!
  }

  type Mutation {
    createEvent(input: EventInput!): Event
    updateEvent(id: ID!, input: EventInput!): Event
    deleteEvent(id: ID!): Boolean
    addReview(eventId: ID!, author: String!, rating: Int!, text: String!): Review
    login(email: String!, password: String!, pin: String!): AuthPayload
    register(email: String!, password: String!, name: String!, roleName: String!): AuthPayload
    changePassword(id: ID!, oldPassword: String!, newPassword: String!): Boolean
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

    register: async (_, { email, password, name, roleName }) => {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error("Email is already registered.");
      }

      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        throw new Error("Invalid role specified.");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const uniquePin = Math.floor(100000 + Math.random() * 900000).toString();

      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          roleId: role.id,
          securityPin: uniquePin, // 🚀 2. Save it to DB
        },
        include: { role: true }
      });

      console.log(`\n=========================================`);
      console.log(`🚨 3FA SECURITY PIN GENERATED FOR [${email}]`);
      console.log(`👉 PIN CODE: ${uniquePin}`);
      console.log(`=========================================\n`);

      const token = jwt.sign(
        { userId: newUser.id, role: newUser.role.name },
        process.env.JWT_SECRET || "super-secret-key-for-tiget",
        { expiresIn: "2h" }
      );

      await logUserAction(newUser.id, `USER_REGISTERED_AS_${roleName}`);
      
      return { token, user: newUser };
    },

    login: async (_, { email, password, pin }) => {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { role: true },
      });

      if (!user) {
        throw new Error("Invalid email or user does not exist.");
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        if (password !== user.password) {
          throw new Error("Invalid password.");
        }
      }

      if (user.securityPin && user.securityPin !== pin) {
        throw new Error("Invalid 3FA Security PIN.");
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role.name },
        process.env.JWT_SECRET || "super-secret-key-for-tiget",
        { expiresIn: "2h" }
      );

      await logUserAction(user.id, "USER_LOGIN");
      return { token, user };
    },

    changePassword: async (_, { id, oldPassword, newPassword }) => {
      // 1. Find the user
      const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
      if (!user) {
        throw new Error("User not found.");
      }

      // 2. Verify the old password (Factor 1 of 3-Way Auth)
      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        // Fallback for your seeded users who still have plain-text passwords
        if (oldPassword !== user.password) {
          throw new Error("Incorrect current password.");
        }
      }

      // 3. Hash the new password securely
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // 4. Save to database
      await prisma.user.update({
        where: { id: parseInt(id) },
        data: { password: hashedNewPassword }
      });

      // 5. Log the security event
      await logUserAction(id, "PASSWORD_CHANGED_SECURELY");
      
      return true;
    },
  },
};

module.exports = { typeDefs, resolvers };
