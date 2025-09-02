import Dexie, { Table } from "dexie";

export interface TimestampEntry {
  id: string; // hashed key
  timestamp: number;
}

export interface DynamicEntry {
  id: string;
  data: any;
}

class AppDatabase extends Dexie {
  timestamps!: Table<TimestampEntry>;
  dynamicData!: Table<DynamicEntry>;

  constructor() {
    super("MyAppDB");
    this.version(1).stores({
      timestamps: "id",
      dynamicData: "id",
    });
  }
}

export const db = new AppDatabase();
