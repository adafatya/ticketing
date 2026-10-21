import { describe, it, expect } from "vitest";
import {
  users,
  userRoleEvents,
  projects,
  tickets,
  ticketComments,
  ticketEvents,
  appSettings,
  discordInteractionLog,
  userRoleEnum,
  ticketTypeEnum,
  ticketPriorityEnum,
  ticketStatusEnum,
  targetRoleEnum,
  ticketSourceEnum,
  ticketEventTypeEnum,
} from "@/db/schema";

describe("Database Schema Definitions", () => {
  it("exports all required enums with correct values", () => {
    expect(userRoleEnum.enumValues).toEqual([
      "admin",
      "pm",
      "qa",
      "be",
      "fe",
      "ai",
      "devops",
      "inactive",
    ]);

    expect(ticketTypeEnum.enumValues).toEqual(["bug", "request", "task", "question"]);

    expect(ticketPriorityEnum.enumValues).toEqual(["low", "medium", "high", "critical"]);

    expect(ticketStatusEnum.enumValues).toEqual([
      "open",
      "in_progress",
      "resolved",
      "closed",
      "cancelled",
    ]);

    expect(targetRoleEnum.enumValues).toEqual([
      "pm",
      "qa",
      "be",
      "fe",
      "ai",
      "devops",
      "all",
    ]);

    expect(ticketSourceEnum.enumValues).toEqual(["web", "discord"]);

    expect(ticketEventTypeEnum.enumValues).toEqual([
      "created",
      "taken",
      "assigned",
      "resolved",
      "validated",
      "reopened",
      "cancelled",
      "released",
    ]);
  });

  it("exports all required tables", () => {
    expect(users).toBeDefined();
    expect(userRoleEvents).toBeDefined();
    expect(projects).toBeDefined();
    expect(tickets).toBeDefined();
    expect(ticketComments).toBeDefined();
    expect(ticketEvents).toBeDefined();
    expect(appSettings).toBeDefined();
    expect(discordInteractionLog).toBeDefined();
  });
});
