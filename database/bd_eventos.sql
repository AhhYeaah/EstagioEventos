DROP DATABASE eventos;
CREATE DATABASE eventos;

USE eventos ;

SET SQL_SAFE_UPDATES = 0;

CREATE TABLE IF NOT EXISTS Users (
  `User_ID` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `User_Email` VARCHAR(100) NOT NULL UNIQUE,
  `User_Senha` VARCHAR(64) NOT NULL
);


CREATE TABLE Eventos (
  `idEventos` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `Usuarios_User_ID` INT NOT NULL,
  `Date_Start` DATETIME NOT NULL,
  `Date_End` DATETIME NOT NULL,
  `Event_Name` VARCHAR(100) NOT NULL,
  `Event_Description` VARCHAR(500),

  CONSTRAINT `fk_Eventos_Usuarios` FOREIGN KEY Eventos(`Usuarios_User_ID`) REFERENCES Users(`User_ID`)
);

CREATE TABLE UsersCookies(
`idCookie` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
`Cookie` VARCHAR(100),
`Usuarios_User_ID` INT NOT NULL UNIQUE,

CONSTRAINT `fk_Session_Usuarios` FOREIGN KEY SESSION(`Usuarios_User_ID`) REFERENCES USERS(`User_ID`)
);

CREATE TABLE LoginCookies(
`idSession` INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
`session` VARCHAR(100) NOT NULL,
`date` DATETIME NOT NULL
);

DELIMITER $$
CREATE PROCEDURE LoginSession(loginsess varchar(100))
BEGIN
      DELETE FROM LoginCookies WHERE 30 < TIMESTAMPDIFF(MINUTE, `date`, now());
      SELECT IF(EXISTS (SELECT * FROM LoginCookies WHERE `session` = loginsess), 'True', 'False');
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE CADASTRO_CONTA(email varchar(100), pass varchar(64))
BEGIN
	INSERT INTO USERS(User_Email, User_Senha) VALUES(email , pass);
    #ID para fazer o cookie
	SELECT User_ID FROM USERS WHERE User_Email = email AND User_Senha = pass;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE LOGIN_CONTA(email varchar(100), pass varchar(64))
BEGIN
	SELECT IF(EXISTS (SELECT * FROM USERS WHERE User_Email = email AND User_Senha = pass), 'True', 'False');
    #Esse users id sera utilizado para criar um cookie de authenticação
    SELECT User_ID FROM USERS WHERE User_Email = email AND User_Senha = pass;
	SELECT idEventos, Date_Start, Date_End, Event_Name FROM EVENTOS
	INNER JOIN USERS
    ON Usuarios_User_ID = User_ID
    WHERE User_Email = email and User_Senha = pass;
END$$
DELIMITER ;
select * from eventos
DELIMITER $$
CREATE PROCEDURE LOGIN_COOKIE(cookiew varchar(100))
BEGIN
	SELECT IF(EXISTS (SELECT * FROM UsersCookies WHERE Cookie = cookiew), 'True', 'False');
	SELECT Date_Start, Date_End, Event_Name, Event_Description FROM EVENTOS E
	INNER JOIN USERS U
    ON E.Usuarios_User_ID = U.User_ID
    INNER JOIN UsersCookies C
    ON C.Usuarios_User_ID = U.User_ID
    WHERE C.Cookie = cookiew;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE CREATE_COOKIE(id int, cookiew varchar(100))
BEGIN
	DELETE FROM UsersCookies WHERE Usuarios_User_ID = id;
	INSERT INTO UsersCookies(Cookie, Usuarios_User_ID) VALUES(cookiew , id);
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE ADD_EVENTO(cookiew varchar(100), title varchar(100), datainicio datetime, datafim datetime, descricao varchar(500))
BEGIN
	IF (NOT EXISTS (
    SELECT * FROM EVENTOS WHERE
    Usuarios_User_ID = (SELECT Usuarios_User_ID FROM UsersCookies WHERE UsersCookies.Cookie = cookiew) AND EVENT_NAME = title
    )) THEN
    INSERT INTO EVENTOS (USUARIOS_USER_ID ,EVENT_NAME, DATE_START, DATE_END, EVENT_DESCRIPTION) VALUES ((SELECT Usuarios_User_ID FROM UsersCookies WHERE UsersCookies.Cookie = cookiew), title , datainicio , datafim , descricao);
    ELSE SELECT 0;
    END IF;
END$$
DELIMITER ;
SELECT * FROM users
DELIMITER $$
CREATE PROCEDURE DELETE_EVENTO(cookiew varchar(100), title varchar(100))
BEGIN
    DELETE FROM EVENTOS WHERE USUARIOS_USER_ID = (SELECT Usuarios_User_ID FROM UsersCookies WHERE UsersCookies.Cookie = cookiew) AND EVENT_NAME = title;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE UPDATE_EVENTO(cookiew varchar(100), title varchar(100), datainicio date, datafim date, descricao varchar(500))
BEGIN
	DECLARE userid INT;
    
    UPDATE EVENTOS SET DATE_START = datainicio, DATE_END = datafim, EVENT_DESCRIPTION = descricao WHERE USUARIOS_USER_ID = (SELECT Usuarios_User_ID FROM UsersCookies WHERE UsersCookies.Cookie = cookiew) and EVENT_NAME = title;
END$$
DELIMITER ;

