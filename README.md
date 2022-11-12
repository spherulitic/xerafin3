Xerafin Word Study System v3.0

ABOUT XERAFIN

Xerafin is an application to assist word gamers in studying word lists an anagramming skills. 

It began as an attempt to extend the feature set of the popular Zyzzyva word study tool. V2.0 saw Xerafin made web-bassed. Xerafin still stores user data in a format compatible with the Zyzzyva sqlite .db format.

Like Zyzzyva, Xerafin implements a Leitner spaced-repetition cardbox method to assist users in memorization. Additional features include:

* Automatic adding of new words to the system based on progress or user preferences
* Additional social aspect with leaderboards, awards, and chat
* Various quiz interfaces to gamify the study experience
* User statistics and metrics to track progress
* Interface that is optimized for both laptop and mobile using Bootstrap

XERAFIN 3.0

Xerafin 3.0 is a major rewrite of the Xerafin back end. The goal is to upgrade from Python 2 to Python 3, rearchitect the back end into several containerized microservices, and upgrade the database to MySQL 8.0. It will also integrate Keycloak for user authentication, allowing user self-signup etc.

Future feature improvements planned including optimizing the process for adding new words to a user's cardbox, and the addition of a realtime multiplayer anagramming feature via a websocket microservice.
