BEGIN;

DROP TABLE IF EXISTS "role", "user", "timer", "machine", "article", "production";

-- Création des tables de base
CREATE TABLE "role" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL
);

CREATE TABLE "user" (
  "id" SERIAL PRIMARY KEY,
  "firstname" VARCHAR(100) NOT NULL,
  "email" VARCHAR(180) NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "role_id" INTEGER NOT NULL REFERENCES "role"("id") ON DELETE CASCADE,
  "refresh_token" TEXT,
  "refresh_token_expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "timer"(
  "id" SERIAL PRIMARY KEY,
  "time_begin" TIMESTAMPTZ NOT NULL,
  "time_end" TIMESTAMPTZ,
  "date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "status" BOOLEAN DEFAULT FALSE,
  "user_id" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"time_elapsed" INTEGER,
	"duration" INTEGER DEFAULT 0
);

CREATE TABLE "machine" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE "article" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL UNIQUE,
  "initial_quantity" INTEGER DEFAULT 0 CHECK (initial_quantity >= 0),
  "objective" INTEGER DEFAULT 0 CHECK ((objective >= initial_quantity) OR (objective = 0))
);

CREATE TABLE "production"(
  "id" SERIAL PRIMARY KEY,
  "machine_id" INTEGER NOT NULL REFERENCES "machine"("id") ON DELETE CASCADE,
  "article_id" INTEGER NOT NULL REFERENCES "article"("id") ON DELETE CASCADE,
  "timer_id" INTEGER NOT NULL REFERENCES "timer"("id") ON DELETE CASCADE,
    "quantity_product_aff" INTEGER DEFAULT 0,
    "quantity_reject_aff" INTEGER DEFAULT 0,
	"created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
	"objective_historical" INTEGER DEFAULT 0
);


-- Fonction de validation pour limiter à 2 occurrences par date pour le Timer
CREATE OR REPLACE FUNCTION validate_date_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si la date a déjà deux occurrences
  IF (
    SELECT COUNT(*)
    FROM timer
    WHERE date = NEW.date
  ) >= 2 THEN
    RAISE EXCEPTION 'La date % ne peut pas avoir plus de deux occurrences.', NEW.date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour appeler la fonction de validation
DROP TRIGGER IF EXISTS check_date_limit ON timer;

CREATE TRIGGER check_date_limit
BEFORE INSERT ON timer
FOR EACH ROW
EXECUTE FUNCTION validate_date_limit();

COMMIT;
