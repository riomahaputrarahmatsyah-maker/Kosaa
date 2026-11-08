import type { Schedule } from "@/types/models";
import { getDatabase } from "./sqlite";

interface ScheduleRow {
  id: string;
  title: string;
  date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_completed: number;
  created_at: number;
}

function mapSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    end_date: row.end_date ?? "",
    start_time: row.start_time,
    end_time: row.end_time,
    is_completed: row.is_completed,
    createdAt: row.created_at,
  };
}

export async function fetchSchedules(): Promise<Schedule[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ScheduleRow>(
    "SELECT * FROM schedules ORDER BY date ASC, start_time ASC, created_at ASC",
  );
  return rows.map(mapSchedule);
}

export async function insertSchedule(schedule: Schedule): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO schedules (id, title, date, end_date, start_time, end_time, is_completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schedule.id,
      schedule.title,
      schedule.date,
      schedule.end_date,
      schedule.start_time,
      schedule.end_time,
      schedule.is_completed,
      schedule.createdAt,
    ],
  );
}

export async function updateScheduleRow(schedule: Schedule): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE schedules SET title = ?, date = ?, end_date = ?, start_time = ?, end_time = ?, is_completed = ? WHERE id = ?",
    [
      schedule.title,
      schedule.date,
      schedule.end_date,
      schedule.start_time,
      schedule.end_time,
      schedule.is_completed,
      schedule.id,
    ],
  );
}

export async function deleteScheduleRow(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM schedules WHERE id = ?", [id]);
}

export async function replaceSchedules(schedules: Schedule[]): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync("DELETE FROM schedules;");
    for (const schedule of schedules) {
      await txn.runAsync(
        `INSERT INTO schedules (id, title, date, end_date, start_time, end_time, is_completed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schedule.id,
          schedule.title,
          schedule.date,
          schedule.end_date,
          schedule.start_time,
          schedule.end_time,
          schedule.is_completed,
          schedule.createdAt,
        ],
      );
    }
  });
}
