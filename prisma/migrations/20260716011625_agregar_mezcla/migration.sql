-- CreateTable
CREATE TABLE "mezcla_records" (
    "id" SERIAL NOT NULL,
    "semana" TEXT NOT NULL,
    "tienda" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "surtido" INTEGER NOT NULL,
    "entrega" INTEGER NOT NULL,
    "fill_rate" DOUBLE PRECISION NOT NULL,
    "clasificacion" TEXT NOT NULL,
    "loadId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mezcla_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mezcla_records_semana_idx" ON "mezcla_records"("semana");

-- CreateIndex
CREATE INDEX "mezcla_records_tienda_idx" ON "mezcla_records"("tienda");

-- CreateIndex
CREATE INDEX "mezcla_records_categoria_idx" ON "mezcla_records"("categoria");

-- AddForeignKey
ALTER TABLE "mezcla_records" ADD CONSTRAINT "mezcla_records_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "data_loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
