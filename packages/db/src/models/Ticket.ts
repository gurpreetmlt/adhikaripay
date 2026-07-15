import mongoose, { Schema, model, type Model } from 'mongoose';
import { TicketStatus } from '@adhikaripay/config';
import type { ITicket } from '../types.js';

const ticketMessageSchema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const ticketSchema = new Schema<ITicket>(
  {
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.Open,
      index: true,
    },
    messages: { type: [ticketMessageSchema], default: [] },
  },
  { timestamps: true },
);

export const Ticket: Model<ITicket> =
  mongoose.models.Ticket ?? model<ITicket>('Ticket', ticketSchema);
