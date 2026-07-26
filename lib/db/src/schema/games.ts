import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gamesTable = pgTable("games", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("waiting"),
  fen: text("fen").notNull().default("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
  turn: text("turn").notNull().default("white"),
  whitePlayerId: text("white_player_id").notNull(),
  whitePlayerName: text("white_player_name").notNull(),
  blackPlayerId: text("black_player_id"),
  blackPlayerName: text("black_player_name"),
  whiteImpostorSquare: text("white_impostor_square"),
  blackImpostorSquare: text("black_impostor_square"),
  whiteImpostorUsed: boolean("white_impostor_used").notNull().default(false),
  blackImpostorUsed: boolean("black_impostor_used").notNull().default(false),
  whiteImpostorRevealed: text("white_impostor_revealed"),
  blackImpostorRevealed: text("black_impostor_revealed"),
  whiteInvestigationUsed: boolean("white_investigation_used").notNull().default(false),
  blackInvestigationUsed: boolean("black_investigation_used").notNull().default(false),
  securedSquares: text("secured_squares").array().notNull().default([]),
  lastEvent: text("last_event"),
  winner: text("winner"),
  penaltyTargetColor: text("penalty_target_color"),
  moveCount: integer("move_count").notNull().default(0),
  moveHistory: jsonb("move_history").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGameSchema = createInsertSchema(gamesTable).omit({ createdAt: true, updatedAt: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof gamesTable.$inferSelect;
