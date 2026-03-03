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

Xerafin 3.0 is a major rewrite of the Xerafin back end. The architecture consists of:
 * A single-page application front end served by nginx. It is written in vanilla HTML and Javascript, with a bit of jQuery
 * The nginx also serves as reverse proxy
 * a Keycloak instance for IdP
 * A MongoDB instance to hold the lexicon. This is populated at startup by a containerized lexicon-loader script
 * A python container holding the daily cron scripts.
 * Seven Flask-based microservices (chat, cardbox, lexicon, login, quiz, sloth, stats)

The containers are run as systemd services using Podman quadlets. This Github repo contains CI/CD actions to automatically rebuild and deploy updated containers to prod on each merge to main.

Future feature improvements planned including optimizing the process for adding new words to a user's cardbox, and the addition of a realtime multiplayer anagramming feature via a websocket microservice.
