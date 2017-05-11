-- Initial structures pour les donées robots

CREATE SCHEMA robots;

CREATE TABLE robots.robots (
  id serial NOT NULL PRIMARY KEY,
  name character varying(100) NOT NULL,
  host character varying(100),
  dir text NOT NULL
) WITH (
  OIDS=FALSE
);

CREATE TABLE robots.execs (
  id bigint NOT NULL PRIMARY KEY,
  idrobot int NOT NULL REFERENCES robots.robots,
  datestart timestamp without time zone NOT NULL,
  dateend timestamp without time zone NOT NULL
) WITH (
  OIDS=FALSE
);

CREATE TABLE robots.logs (
  id serial NOT NULL PRIMARY KEY,
  idexec bigint NOT NULL REFERENCES robots.execs,
  "date" timestamp without time zone NOT NULL,
  level character varying(10) NOT NULL,
  thread text,
  class text,
  message text
) WITH (
  OIDS=FALSE
);
