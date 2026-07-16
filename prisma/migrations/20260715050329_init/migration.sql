-- CreateTable
CREATE TABLE "fillrate_records" (
    "id" SERIAL NOT NULL,
    "semana" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "tienda" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT NOT NULL,
    "surtido" INTEGER NOT NULL,
    "entrega" INTEGER NOT NULL,
    "fill_rate" DOUBLE PRECISION NOT NULL,
    "clasificacion" TEXT NOT NULL,
    "loadId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fillrate_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_loads" (
    "id" SERIAL NOT NULL,
    "file_name" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'procesando',
    "error_log" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_loads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fillrate_records_semana_idx" ON "fillrate_records"("semana");

-- CreateIndex
CREATE INDEX "fillrate_records_pais_idx" ON "fillrate_records"("pais");

-- CreateIndex
CREATE INDEX "fillrate_records_tienda_idx" ON "fillrate_records"("tienda");

-- CreateIndex
CREATE INDEX "fillrate_records_departamento_idx" ON "fillrate_records"("departamento");

-- AddForeignKey
ALTER TABLE "fillrate_records" ADD CONSTRAINT "fillrate_records_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "data_loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
