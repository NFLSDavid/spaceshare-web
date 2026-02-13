import { vi } from "vitest";

function modelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  };
}

export const prismaMock = {
  user: modelMock(),
  listing: modelMock(),
  booking: modelMock(),
  reservation: modelMock(),
  shortlist: modelMock(),
  preferences: modelMock(),
  verificationToken: modelMock(),
  chat: modelMock(),
  chatMember: modelMock(),
  message: modelMock(),
};
