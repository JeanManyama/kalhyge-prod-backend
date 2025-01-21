BEGIN;

DROP TABLE IF EXISTS "role", "user", "timer", "machine", "article", "production";

-- Création des tables de base
CREATE TABLE "role"(
	"id" int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"name" text NOT NULL
);

CREATE TABLE "user"(
	"id" int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"firstname" text NOT NULL,
	"email" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "role_id" int NOT NULL REFERENCES "role"("id") ON DELETE CASCADE,
	"refresh_token" text,
	"refresh_token_expires_at" TIMESTAMPTZ,
	"created_at" TIMESTAMPTZ
);

CREATE TABLE "timer"(
	"id" int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"time_begin" TIMESTAMPTZ NOT NULL,
	"time_end" TIMESTAMPTZ,
	"date" date NOT NULL DEFAULT CURRENT_DATE,
	"status" BOOLEAN DEFAULT FALSE,
	"user_id" int NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"time_elapsed" int,
	"duration" int DEFAULT 0
);

CREATE TABLE "machine"(
	"id" int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);

CREATE TABLE "article"(
	"id" int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"initial_quantity" int DEFAULT 0,
	"objective" int DEFAULT 0 CHECK((objective > initial_quantity) OR (objective = 0))
);

CREATE TABLE "production"(
	"id" int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"machine_id" int NOT NULL REFERENCES "machine"("id") ON DELETE CASCADE,
	"article_id" int NOT NULL REFERENCES "article"("id") ON DELETE CASCADE,
    "quantity_product_aff" int DEFAULT 0,
    "quantity_reject_aff" int DEFAULT 0,
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW()),
    "updated_at" TIMESTAMPTZ,
	"timer_id" int NOT NULL REFERENCES "timer"("id") ON DELETE CASCADE,
	"objective_historical" int DEFAULT 0
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
