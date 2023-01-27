FROM python:3.11.1-slim-bullseye

WORKDIR /cron
RUN apt-get update && apt-get -y install cron
COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY crontab /etc/cron.d/crontab
COPY script .
COPY entrypoint.sh .
RUN chmod 0775 *.py
RUN chmod 0755 entrypoint.sh

RUN chmod 0644 /etc/cron.d/crontab
RUN crontab /etc/cron.d/crontab

CMD ["/cron/entrypoint.sh"]
