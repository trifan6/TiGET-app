const { events } = require("../data/store");
const { z } = require("zod");
const { prisma } = require("../utils/db");

const eventSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().default(""),
  category: z.string().min(1, "Category is required"),
  lineup: z.array(z.string()).default([]),
  thumbnail: z.string().default(""),
  gallery: z.array(z.string()).default([]),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().default(""),
  duration: z.string().default(""),
  location: z.string().min(1, "Location is required"),
  ageRestriction: z.string().default("All Ages"),
  price: z.number().nonnegative("Price cannot be negative"),
  capacity: z.number().int().positive("Capacity must be greater than 0"),
  sold: z.number().int().nonnegative().default(0),
});

const getAllEvents = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginatedEvents = events.slice(startIndex, endIndex);

  res.status(200).json({
    totalEvents: events.length,
    page: page,
    totalPages: Math.ceil(events.length / limit),
    data: paginatedEvents,
  });
};

const createEvent = (req, res) => {
  try {
    const validatedData = eventSchema.parse(req.body);

    const newEvent = {
      id: Math.random().toString(36).substr(2, 9),
      ...validatedData,
    };
    events.push(newEvent);

    res
      .status(201)
      .json({ message: "Event created successfully!", data: newEvent });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Validation Failed",
        errors: error.issues,
      });
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getEventById = (req, res) => {
  const event = events.find((e) => e.id === req.params.id);

  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  res.status(200).json(event);
};

const updateEvent = (req, res) => {
  try {
    const index = events.findIndex((e) => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: "Event not found" });
    }

    const validatedData = eventSchema.parse(req.body);

    events[index] = { id: events[index].id, ...validatedData };

    res
      .status(200)
      .json({ message: "Event updated successfully", data: events[index] });
  } catch (error) {
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ message: "Validation Failed", errors: error.issues });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteEvent = (req, res) => {
  const index = events.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "Event not found" });
  }

  events.splice(index, 1);
  res.status(200).json({ message: "Event deleted successfully" });
};

const getStats = (req, res) => {
  const totalEvents = events.length;
  const totalRevenue = events.reduce((sum, e) => sum + e.price * e.sold, 0);
  const totalTicketsSold = events.reduce((sum, e) => sum + e.sold, 0);

  res.status(200).json({
    totalEvents,
    totalRevenue,
    totalTicketsSold,
  });
};

module.exports = {
  getAllEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  getStats,
};
