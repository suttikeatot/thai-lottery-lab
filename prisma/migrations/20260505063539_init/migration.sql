-- CreateTable
CREATE TABLE "draw" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "draw_date" DATETIME NOT NULL,
    "first_prize" TEXT NOT NULL,
    "two_upper" TEXT NOT NULL,
    "two_lower" TEXT NOT NULL,
    "three_front" TEXT,
    "three_back" TEXT,
    "source" TEXT NOT NULL,
    "imported_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "import_batch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "ok_count" INTEGER NOT NULL,
    "error_count" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "backtest_run" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "strategy_key" TEXT NOT NULL,
    "params_json" TEXT NOT NULL,
    "window_spec_json" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "n_targets" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metrics_json" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "backtest_prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "run_id" INTEGER NOT NULL,
    "target_draw_date" DATETIME NOT NULL,
    "predicted_numbers_json" TEXT NOT NULL,
    "actual_two_upper" TEXT NOT NULL,
    "actual_two_lower" TEXT NOT NULL,
    "hit_upper" BOOLEAN NOT NULL,
    "hit_lower" BOOLEAN NOT NULL,
    CONSTRAINT "backtest_prediction_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "backtest_run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "draw_draw_date_key" ON "draw"("draw_date");

-- CreateIndex
CREATE INDEX "draw_draw_date_idx" ON "draw"("draw_date");

-- CreateIndex
CREATE INDEX "backtest_prediction_run_id_target_draw_date_idx" ON "backtest_prediction"("run_id", "target_draw_date");
